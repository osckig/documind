"""
Document upload routes
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import os
import shutil
from datetime import datetime
import uuid

from database.connection import get_db
from models.user import User
from models.document import Document, DocumentChunk
from api.routes.auth import get_current_user
from services.document_processor import DocumentProcessor
from services.embedding_service_local import LocalEmbeddingService
from config.settings import settings
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/", status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload and process a document"""
    try:
        # Validate file type
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext.replace(".", "") not in settings.allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type {file_ext} not allowed"
            )

        # Check file size (read first chunk to estimate)
        content = await file.read()
        if len(content) > settings.max_upload_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size exceeds maximum of {settings.max_upload_size} bytes"
            )

        # Generate unique filename
        unique_filename = f"{uuid.uuid4()}_{file.filename}"
        file_path = os.path.join(settings.upload_dir, unique_filename)

        # Save file
        with open(file_path, "wb") as f:
            f.write(content)

        # Create document record
        document = Document(
            user_id=current_user.id,
            filename=unique_filename,
            original_filename=file.filename,
            file_type=file_ext.replace(".", ""),
            file_size=len(content),
            file_path=file_path,
            status="processing"
        )

        db.add(document)
        await db.commit()
        await db.refresh(document)

        # Process document in background (for production, use Celery or similar)
        try:
            # Extract text
            processor = DocumentProcessor()
            full_text, metadata = await processor.process_document(file_path, file.filename)

            # Update document metadata
            document.content_preview = processor.get_preview(full_text)
            document.word_count = metadata.get("word_count")
            document.page_count = metadata.get("page_count")

            # Chunk text
            chunks_data = await processor.chunk_text(full_text, metadata)

            # Generate embeddings and store
            embedding_service = LocalEmbeddingService()
            chunk_objects = []

            for chunk_data in chunks_data:
                # Store in FAISS
                faiss_id = await embedding_service.store_document_chunk(
                    content=chunk_data["content"],
                    document_id=document.id,
                    chunk_index=chunk_data["chunk_index"],
                    filename=file.filename,
                    file_type=document.file_type,
                    metadata=chunk_data.get("metadata")
                )

                # Create chunk record
                chunk = DocumentChunk(
                    document_id=document.id,
                    chunk_index=chunk_data["chunk_index"],
                    content=chunk_data["content"],
                    weaviate_id=faiss_id  # renamed field but stores FAISS ID now
                )
                chunk_objects.append(chunk)

            # Save chunks
            db.add_all(chunk_objects)

            # Update document status
            document.status = "completed"
            document.processed_at = datetime.utcnow()

            await db.commit()
            await db.refresh(document)

            logger.info(f"Successfully processed document {document.id}")

        except Exception as e:
            logger.error(f"Error processing document {document.id}: {e}")
            document.status = "failed"
            document.error_message = str(e)
            await db.commit()
            raise

        return {
            "id": document.id,
            "filename": document.original_filename,
            "status": document.status,
            "file_type": document.file_type,
            "file_size": document.file_size,
            "word_count": document.word_count,
            "page_count": document.page_count,
            "chunks_count": len(chunk_objects)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading document: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading document: {str(e)}"
        )


@router.get("/documents")
async def list_documents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 50
):
    """List user's documents"""
    result = await db.execute(
        select(Document)
        .where(Document.user_id == current_user.id)
        .offset(skip)
        .limit(limit)
        .order_by(Document.created_at.desc())
    )
    documents = result.scalars().all()

    return {
        "documents": [
            {
                "id": doc.id,
                "filename": doc.original_filename,
                "file_type": doc.file_type,
                "file_size": doc.file_size,
                "status": doc.status,
                "word_count": doc.word_count,
                "page_count": doc.page_count,
                "created_at": doc.created_at,
                "processed_at": doc.processed_at
            }
            for doc in documents
        ],
        "total": len(documents)
    }


@router.get("/documents/{document_id}")
async def get_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get document details"""
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id
        )
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    return {
        "id": document.id,
        "filename": document.original_filename,
        "file_type": document.file_type,
        "file_size": document.file_size,
        "status": document.status,
        "word_count": document.word_count,
        "page_count": document.page_count,
        "content_preview": document.content_preview,
        "created_at": document.created_at,
        "processed_at": document.processed_at,
        "error_message": document.error_message
    }


@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete document"""
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id
        )
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    # Delete from FAISS
    embedding_service = LocalEmbeddingService()
    await embedding_service.delete_document_chunks(document_id)

    # Delete file
    if os.path.exists(document.file_path):
        os.remove(document.file_path)

    # Delete from database
    await db.delete(document)
    await db.commit()

    return {"message": "Document deleted successfully"}
