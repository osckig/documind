"""
Application settings and configuration
"""
from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    """Application settings"""

    # Application
    app_name: str = "AI Document Search"
    debug: bool = True
    environment: str = "development"

    # Security
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Database (SQLite - local file)
    database_url: str = "sqlite+aiosqlite:///./data/sme_docs.db"

    # Ollama (Local LLM)
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "mistral"  # or "llama2", "codellama", etc.

    # File Upload
    max_upload_size: int = 10485760  # 10MB
    allowed_extensions: List[str] = ["pdf", "docx", "txt", "png", "jpg", "jpeg"]
    upload_dir: str = "data/uploads"

    # OCR
    tesseract_path: str = "/usr/bin/tesseract"
    ocr_language: str = "eng+swa"  # English and Swahili

    # Embeddings
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_dimension: int = 384

    # LLM (Ollama)
    llm_model: str = "mistral"
    llm_temperature: float = 0.7
    llm_max_tokens: int = 500

    # Document Processing
    chunk_size: int = 500
    chunk_overlap: int = 50

    # Search
    search_limit: int = 10
    similarity_threshold: float = 0.7

    # CORS
    cors_origins: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]

    class Config:
        env_file = ".env"
        case_sensitive = False


# Create settings instance
settings = Settings()

# Create necessary directories
os.makedirs(settings.upload_dir, exist_ok=True)
os.makedirs("data/processed", exist_ok=True)
os.makedirs("data/embeddings", exist_ok=True)
