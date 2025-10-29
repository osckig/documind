"""
Document model
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey, JSON
from sqlalchemy.sql import func
from database.connection import Base


class Document(Base):
    """Document model for storing metadata"""
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    file_path = Column(String, nullable=False)

    # Document metadata
    title = Column(String)
    content_preview = Column(Text)
    page_count = Column(Integer)
    word_count = Column(Integer)

    # Processing status
    status = Column(String, default="pending")  # pending, processing, completed, failed
    error_message = Column(Text)

    # Vector database reference
    weaviate_id = Column(String, unique=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<Document {self.filename}>"


class DocumentChunk(Base):
    """Document chunk model for storing individual chunks"""
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)

    # Metadata
    page_number = Column(Integer)
    start_char = Column(Integer)
    end_char = Column(Integer)

    # Vector database reference
    weaviate_id = Column(String, unique=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<DocumentChunk {self.document_id}:{self.chunk_index}>"
