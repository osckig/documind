"""
Search query model
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey, JSON
from sqlalchemy.sql import func
from database.connection import Base


class SearchQuery(Base):
    """Search query model for analytics"""
    __tablename__ = "search_queries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    query_text = Column(Text, nullable=False)
    query_type = Column(String, default="semantic")  # semantic, keyword, hybrid

    # Search parameters
    filters = Column(JSON)
    limit = Column(Integer, default=10)

    # Results
    results_count = Column(Integer)
    results_ids = Column(JSON)  # List of document IDs returned

    # Performance metrics
    search_time_ms = Column(Float)
    embedding_time_ms = Column(Float)

    # User feedback
    feedback_rating = Column(Integer)  # 1-5 stars
    feedback_comment = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<SearchQuery {self.query_text[:50]}>"


class ChatHistory(Base):
    """Chat history model for RAG conversations"""
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_id = Column(String, nullable=False, index=True)

    # Message
    role = Column(String, nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)

    # Context
    document_ids = Column(JSON)  # Documents used for context
    sources = Column(JSON)  # Source chunks used

    # Metadata
    model = Column(String)
    tokens_used = Column(Integer)
    response_time_ms = Column(Float)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<ChatHistory {self.session_id}>"
