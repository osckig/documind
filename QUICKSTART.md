# Quick Start Guide

## Prerequisites

Before running the system, ensure you have:

1. **Docker and Docker Compose** installed
2. **OpenAI API Key** (for RAG functionality) or Hugging Face API key
3. At least **4GB of RAM** available
4. **10GB of disk space** for models and data

## Setup Instructions

### 1. Clone and Navigate

```bash
cd AI-Document-Search-SME-Kenya
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```bash
# Required for RAG
OPENAI_API_KEY=your_openai_api_key_here

# Or use Hugging Face (alternative)
HUGGINGFACE_API_KEY=your_huggingface_key_here

# Change the secret key for production
SECRET_KEY=your_random_secret_key_here
```

### 3. Start with Docker Compose

```bash
docker-compose up -d
```

This will start:
- **Weaviate** (Vector Database) on port 8080
- **PostgreSQL** (Metadata Database) on port 5432
- **Redis** (Cache) on port 6379
- **Backend API** on port 8000
- **Frontend** on port 5173

### 4. Wait for Services

Wait 1-2 minutes for all services to be ready. Check status:

```bash
docker-compose ps
```

### 5. Access the Application

Open your browser and go to:

```
http://localhost:5173
```

### 6. Create an Account

1. Click "Register" on the login page
2. Enter your details
3. Login with your credentials

### 7. Upload Your First Document

1. Navigate to the "Upload" page
2. Drag and drop or select a document (PDF, DOCX, TXT, or images)
3. Wait for processing to complete

### 8. Search and Chat

1. Go to "Search & Chat"
2. Try searching for keywords or asking questions about your documents

## Manual Setup (Without Docker)

### Backend Setup

```bash
cd src/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations (ensure PostgreSQL is running)
alembic upgrade head

# Start backend
uvicorn main:app --reload
```

### Frontend Setup

```bash
cd src/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Start Required Services

You'll need to manually start:
- Weaviate (Docker: `docker run -d -p 8080:8080 semitechnologies/weaviate:1.23.0`)
- PostgreSQL
- Redis

## Common Issues

### Port Already in Use

If ports are already in use, stop conflicting services or change ports in `docker-compose.yml`

### OpenAI API Rate Limits

If you hit rate limits:
1. Use a different model (edit `LLM_MODEL` in `.env`)
2. Add delays between requests
3. Consider using local models with Ollama

### Out of Memory

If you encounter memory issues:
1. Reduce `chunk_size` in settings
2. Limit concurrent uploads
3. Increase Docker memory allocation

### Slow Performance

For better performance:
1. Use GPU if available (configure in docker-compose.yml)
2. Reduce embedding model size
3. Enable caching

## Next Steps

- Upload more documents to build your knowledge base
- Explore analytics to understand usage patterns
- Customize the system for your specific needs
- Check the full documentation in `/documentation`

## Support

For issues and questions:
- Check the logs: `docker-compose logs`
- Review documentation in `/documentation`
- Open an issue on GitHub

## Development Mode

To run in development mode with hot reload:

```bash
# Backend
cd src/backend
uvicorn main:app --reload

# Frontend
cd src/frontend
npm run dev
```

## Production Deployment

See `/documentation/deployment.md` for production deployment guidelines.
