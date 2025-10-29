"""
Analytics routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from datetime import datetime, timedelta
from typing import List, Dict, Any

from database.connection import get_db
from models.user import User
from models.document import Document
from models.search_query import SearchQuery, ChatHistory
from api.routes.auth import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/overview")
async def get_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get analytics overview"""
    try:
        # Document stats
        doc_result = await db.execute(
            select(
                func.count(Document.id).label("total_documents"),
                func.sum(Document.file_size).label("total_size"),
                func.sum(Document.word_count).label("total_words")
            ).where(Document.user_id == current_user.id)
        )
        doc_stats = doc_result.first()

        # Search stats
        search_result = await db.execute(
            select(
                func.count(SearchQuery.id).label("total_searches"),
                func.avg(SearchQuery.search_time_ms).label("avg_search_time")
            ).where(SearchQuery.user_id == current_user.id)
        )
        search_stats = search_result.first()

        # Chat stats
        chat_result = await db.execute(
            select(
                func.count(ChatHistory.id).label("total_messages")
            ).where(
                ChatHistory.user_id == current_user.id,
                ChatHistory.role == "user"
            )
        )
        chat_stats = chat_result.first()

        # Recent activity (last 7 days)
        seven_days_ago = datetime.utcnow() - timedelta(days=7)

        recent_docs = await db.execute(
            select(func.count(Document.id)).where(
                Document.user_id == current_user.id,
                Document.created_at >= seven_days_ago
            )
        )

        recent_searches = await db.execute(
            select(func.count(SearchQuery.id)).where(
                SearchQuery.user_id == current_user.id,
                SearchQuery.created_at >= seven_days_ago
            )
        )

        return {
            "documents": {
                "total": doc_stats.total_documents or 0,
                "total_size": doc_stats.total_size or 0,
                "total_words": doc_stats.total_words or 0,
                "recent": recent_docs.scalar() or 0
            },
            "searches": {
                "total": search_stats.total_searches or 0,
                "avg_time_ms": float(search_stats.avg_search_time or 0),
                "recent": recent_searches.scalar() or 0
            },
            "chat": {
                "total_messages": chat_stats.total_messages or 0
            }
        }

    except Exception as e:
        logger.error(f"Error getting analytics overview: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analytics error: {str(e)}"
        )


@router.get("/search-trends")
async def get_search_trends(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get search trends over time"""
    try:
        start_date = datetime.utcnow() - timedelta(days=days)

        # Daily search counts
        result = await db.execute(
            select(
                func.date(SearchQuery.created_at).label("date"),
                func.count(SearchQuery.id).label("count")
            )
            .where(
                SearchQuery.user_id == current_user.id,
                SearchQuery.created_at >= start_date
            )
            .group_by(func.date(SearchQuery.created_at))
            .order_by(func.date(SearchQuery.created_at))
        )

        trends = result.all()

        return {
            "period_days": days,
            "data": [
                {
                    "date": str(trend.date),
                    "count": trend.count
                }
                for trend in trends
            ]
        }

    except Exception as e:
        logger.error(f"Error getting search trends: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analytics error: {str(e)}"
        )


@router.get("/popular-queries")
async def get_popular_queries(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get most popular search queries"""
    try:
        result = await db.execute(
            select(
                SearchQuery.query_text,
                func.count(SearchQuery.id).label("count"),
                func.avg(SearchQuery.search_time_ms).label("avg_time")
            )
            .where(SearchQuery.user_id == current_user.id)
            .group_by(SearchQuery.query_text)
            .order_by(desc("count"))
            .limit(limit)
        )

        queries = result.all()

        return {
            "queries": [
                {
                    "query": query.query_text,
                    "count": query.count,
                    "avg_time_ms": float(query.avg_time)
                }
                for query in queries
            ]
        }

    except Exception as e:
        logger.error(f"Error getting popular queries: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analytics error: {str(e)}"
        )


@router.get("/document-types")
async def get_document_types(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get document type distribution"""
    try:
        result = await db.execute(
            select(
                Document.file_type,
                func.count(Document.id).label("count"),
                func.sum(Document.file_size).label("total_size")
            )
            .where(Document.user_id == current_user.id)
            .group_by(Document.file_type)
        )

        types = result.all()

        return {
            "types": [
                {
                    "file_type": t.file_type,
                    "count": t.count,
                    "total_size": t.total_size or 0
                }
                for t in types
            ]
        }

    except Exception as e:
        logger.error(f"Error getting document types: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analytics error: {str(e)}"
        )


@router.get("/performance")
async def get_performance_metrics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get performance metrics"""
    try:
        # Search performance
        search_result = await db.execute(
            select(
                func.avg(SearchQuery.search_time_ms).label("avg_search_time"),
                func.min(SearchQuery.search_time_ms).label("min_search_time"),
                func.max(SearchQuery.search_time_ms).label("max_search_time")
            ).where(SearchQuery.user_id == current_user.id)
        )
        search_perf = search_result.first()

        # Chat performance
        chat_result = await db.execute(
            select(
                func.avg(ChatHistory.response_time_ms).label("avg_response_time"),
                func.min(ChatHistory.response_time_ms).label("min_response_time"),
                func.max(ChatHistory.response_time_ms).label("max_response_time")
            ).where(
                ChatHistory.user_id == current_user.id,
                ChatHistory.role == "assistant"
            )
        )
        chat_perf = chat_result.first()

        return {
            "search": {
                "avg_time_ms": float(search_perf.avg_search_time or 0),
                "min_time_ms": float(search_perf.min_search_time or 0),
                "max_time_ms": float(search_perf.max_search_time or 0)
            },
            "chat": {
                "avg_time_ms": float(chat_perf.avg_response_time or 0),
                "min_time_ms": float(chat_perf.min_response_time or 0),
                "max_time_ms": float(chat_perf.max_response_time or 0)
            }
        }

    except Exception as e:
        logger.error(f"Error getting performance metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analytics error: {str(e)}"
        )
