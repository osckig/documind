"""
Search and RAG routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import time

from database.connection import get_db
from models.user import User
from models.search_query import SearchQuery, ChatHistory
from api.routes.auth import get_current_user
from services.search_service_local import LocalSearchService
import logging
import uuid

logger = logging.getLogger(__name__)
router = APIRouter()

# Pydantic models
class SearchRequest(BaseModel):
    query: str
    limit: int = 10
    search_type: str = "semantic"  # semantic, keyword, hybrid
    filters: Optional[Dict[str, Any]] = None
    threshold: Optional[float] = None


class RAGRequest(BaseModel):
    question: str
    limit: int = 5
    filters: Optional[Dict[str, Any]] = None


class ChatMessage(BaseModel):
    role: str  # user, assistant
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    session_id: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None


@router.post("/search")
async def search(
    request: SearchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Perform document search"""
    try:
        start_time = time.time()

        # Initialize search service
        search_service = LocalSearchService()

        # Perform search based on type
        if request.search_type == "semantic":
            results = await search_service.semantic_search(
                query=request.query,
                limit=request.limit,
                filters=request.filters,
                threshold=request.threshold
            )
        elif request.search_type == "keyword":
            results = await search_service.keyword_search(
                query=request.query,
                limit=request.limit
            )
        elif request.search_type == "hybrid":
            results = await search_service.hybrid_search(
                query=request.query,
                limit=request.limit
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid search type"
            )

        search_time = (time.time() - start_time) * 1000

        # Save search query for analytics
        search_query = SearchQuery(
            user_id=current_user.id,
            query_text=request.query,
            query_type=request.search_type,
            filters=request.filters,
            limit=request.limit,
            results_count=len(results),
            results_ids=[r["id"] for r in results],
            search_time_ms=search_time
        )
        db.add(search_query)
        await db.commit()

        return {
            "query": request.query,
            "results": results,
            "count": len(results),
            "search_time_ms": search_time,
            "search_type": request.search_type
        }

    except Exception as e:
        logger.error(f"Error in search: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search error: {str(e)}"
        )


@router.post("/ask")
async def ask_question(
    request: RAGRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ask a question using RAG"""
    try:
        start_time = time.time()

        # Initialize search service
        search_service = LocalSearchService()

        # Get answer using RAG
        response = await search_service.rag_query(
            question=request.question,
            limit=request.limit,
            filters=request.filters
        )

        response_time = (time.time() - start_time) * 1000

        # Create session ID for chat history
        session_id = str(uuid.uuid4())

        # Save user question to chat history
        user_message = ChatHistory(
            user_id=current_user.id,
            session_id=session_id,
            role="user",
            content=request.question,
            document_ids=[s["document_id"] for s in response.get("sources", [])],
            response_time_ms=response_time
        )
        db.add(user_message)

        # Save assistant response to chat history
        assistant_message = ChatHistory(
            user_id=current_user.id,
            session_id=session_id,
            role="assistant",
            content=response["answer"],
            document_ids=[s["document_id"] for s in response.get("sources", [])],
            sources=response.get("sources"),
            model=response.get("model"),
            response_time_ms=response_time
        )
        db.add(assistant_message)

        await db.commit()

        return {
            "question": request.question,
            "answer": response["answer"],
            "sources": response.get("sources", []),
            "session_id": session_id,
            "response_time_ms": response_time,
            "context_used": response.get("context_used", False)
        }

    except Exception as e:
        logger.error(f"Error in RAG query: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"RAG error: {str(e)}"
        )


@router.post("/chat")
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Multi-turn chat with RAG"""
    try:
        start_time = time.time()

        # Get or create session ID
        session_id = request.session_id or str(uuid.uuid4())

        # Convert messages to dict format
        messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]

        # Initialize search service
        search_service = LocalSearchService()

        # Get response
        response = await search_service.chat(
            messages=messages,
            filters=request.filters
        )

        response_time = (time.time() - start_time) * 1000

        # Save the last user message and assistant response to chat history
        if messages and messages[-1]["role"] == "user":
            user_message = ChatHistory(
                user_id=current_user.id,
                session_id=session_id,
                role="user",
                content=messages[-1]["content"],
                response_time_ms=response_time
            )
            db.add(user_message)

        assistant_message = ChatHistory(
            user_id=current_user.id,
            session_id=session_id,
            role="assistant",
            content=response["answer"],
            document_ids=[s["document_id"] for s in response.get("sources", [])],
            sources=response.get("sources"),
            model=response.get("model"),
            response_time_ms=response_time
        )
        db.add(assistant_message)

        await db.commit()

        return {
            "session_id": session_id,
            "answer": response["answer"],
            "sources": response.get("sources", []),
            "response_time_ms": response_time
        }

    except Exception as e:
        logger.error(f"Error in chat: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat error: {str(e)}"
        )


@router.get("/history/{session_id}")
async def get_chat_history(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get chat history for a session"""
    from sqlalchemy import select

    result = await db.execute(
        select(ChatHistory)
        .where(
            ChatHistory.session_id == session_id,
            ChatHistory.user_id == current_user.id
        )
        .order_by(ChatHistory.created_at)
    )
    history = result.scalars().all()

    return {
        "session_id": session_id,
        "messages": [
            {
                "role": msg.role,
                "content": msg.content,
                "sources": msg.sources if msg.role == "assistant" else None,
                "created_at": msg.created_at
            }
            for msg in history
        ]
    }
