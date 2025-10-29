"""
Main FastAPI application for AI Document Search System
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging

from api.routes import upload, search, analytics, auth
from api.middleware.error_handler import handle_error
from database.connection import init_db, close_db
from config.settings import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO if settings.debug else logging.WARNING,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    logger.info("Starting AI Document Search System...")

    # Initialize database
    await init_db()
    logger.info("Database initialized")

    # Initialize local embedding service
    from services.embedding_service_local import LocalEmbeddingService
    embedding_service = LocalEmbeddingService()
    await embedding_service.initialize_schema()
    logger.info("Local embedding service initialized")

    yield

    # Cleanup
    logger.info("Shutting down...")
    await close_db()


# Create FastAPI app
app = FastAPI(
    title="AI Document Search for SMEs",
    description="RAG-powered document search system for Kenyan SMEs",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(upload.router, prefix="/api/upload", tags=["Upload"])
app.include_router(search.router, prefix="/api/search", tags=["Search"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return await handle_error(request, exc)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "AI Document Search System for Kenyan SMEs",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "database": "connected (SQLite)",
        "vector_store": "FAISS (local)",
        "llm": f"Ollama ({settings.ollama_model})"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug
    )
