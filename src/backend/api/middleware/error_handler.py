"""
Global error handler middleware
"""
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger(__name__)


async def handle_error(request: Request, exc: Exception):
    """Global exception handler"""

    # HTTP exceptions
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": exc.detail,
                "status_code": exc.status_code
            }
        )

    # Log unexpected errors
    logger.error(f"Unexpected error: {exc}", exc_info=True)

    # Return generic error response
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error",
            "message": str(exc) if logger.level == logging.DEBUG else "An unexpected error occurred"
        }
    )
