# System Architecture

## Overview

The AI Document Search system is a RAG (Retrieval-Augmented Generation) application that enables semantic search and intelligent Q&A over document collections. It's specifically designed for Small and Medium Enterprises (SMEs) in Kenya.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│                     (Svelte SPA)                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Upload  │  │  Search  │  │   Chat   │  │Analytics │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │ REST API
┌───────────────────────▼─────────────────────────────────────┐
│                     Backend Layer (FastAPI)                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              API Routes                               │  │
│  │  /auth  /upload  /search  /analytics                │  │
│  └────────────────────┬──────────────────────────────────┘  │
│  ┌────────────────────▼──────────────────────────────────┐  │
│  │           Business Logic Services                     │  │
│  │  • Document Processor                                 │  │
│  │  • Embedding Service                                  │  │
│  │  • Search Service (RAG)                              │  │
│  │  • Analytics Service                                  │  │
│  └────────────────────┬──────────────────────────────────┘  │
└────────────────────────┼─────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼──────┐  ┌──────▼──────┐  ┌─────▼────┐
│  PostgreSQL  │  │   Weaviate  │  │  Redis   │
│  (Metadata)  │  │   (Vectors) │  │  (Cache) │
└──────────────┘  └─────────────┘  └──────────┘
```

## Component Details

### 1. Frontend (Svelte)

**Technology Stack:**
- Svelte 4.x
- Vite (build tool)
- TailwindCSS (styling)
- Axios (HTTP client)
- Marked (Markdown rendering)
- svelte-routing (routing)

**Key Components:**

- **Authentication:** Login/Registration with JWT
- **Upload Interface:** Drag-and-drop file upload with progress tracking
- **Search Interface:**
  - Semantic search
  - Keyword search
  - Hybrid search
- **Chat Interface:** Multi-turn conversations with RAG
- **Analytics Dashboard:** Visualizations and metrics

### 2. Backend (FastAPI)

**Technology Stack:**
- FastAPI (web framework)
- SQLAlchemy (ORM)
- Asyncio (async operations)
- Pydantic (validation)
- JWT (authentication)

**Core Services:**

#### Document Processor
- Extracts text from PDFs (pdfplumber, pypdf)
- Processes DOCX files (python-docx)
- OCR for images (Tesseract)
- Text chunking with LangChain

#### Embedding Service
- Generates vector embeddings using Sentence Transformers
- Model: `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions)
- Stores vectors in Weaviate
- Batch processing for efficiency

#### Search Service (RAG)
- **Semantic Search:** Vector similarity using Weaviate
- **Keyword Search:** BM25 or full-text search
- **Hybrid Search:** Combines semantic + keyword with weighted scoring
- **RAG Pipeline:**
  1. Query embedding generation
  2. Vector similarity search
  3. Context retrieval
  4. LLM prompt construction
  5. Answer generation with OpenAI

#### Analytics Service
- Document statistics
- Search metrics
- Performance monitoring
- Usage trends

### 3. Vector Database (Weaviate)

**Purpose:** Store and search document embeddings

**Schema:**

```
DocumentChunk:
  - content: Text
  - document_id: Int
  - chunk_index: Int
  - filename: Text
  - file_type: Text
  - page_number: Int
  - metadata: Object
  - vector: [384 floats]

Document:
  - filename: Text
  - title: Text
  - content: Text
  - file_type: Text
  - user_id: Int
  - metadata: Object
  - vector: [384 floats]
```

**Operations:**
- Near vector search (cosine similarity)
- Filtered search
- Batch operations

### 4. Metadata Database (PostgreSQL)

**Tables:**

```sql
users:
  - id (PK)
  - email (unique)
  - username (unique)
  - hashed_password
  - full_name
  - is_active
  - created_at

documents:
  - id (PK)
  - user_id (FK -> users)
  - filename
  - original_filename
  - file_type
  - file_size
  - status
  - word_count
  - page_count
  - weaviate_id
  - created_at
  - processed_at

document_chunks:
  - id (PK)
  - document_id (FK -> documents)
  - chunk_index
  - content
  - weaviate_id
  - created_at

search_queries:
  - id (PK)
  - user_id (FK -> users)
  - query_text
  - query_type
  - results_count
  - search_time_ms
  - created_at

chat_history:
  - id (PK)
  - user_id (FK -> users)
  - session_id
  - role
  - content
  - sources (JSON)
  - model
  - response_time_ms
  - created_at
```

### 5. Cache Layer (Redis)

**Use Cases:**
- Session storage
- Query result caching
- Rate limiting
- Temporary data storage

## Data Flow

### Document Upload Flow

```
1. User uploads file → Frontend
2. Frontend sends file → Backend /api/upload
3. Backend saves file to disk
4. Document record created in PostgreSQL
5. Document Processor extracts text
6. Text chunked into segments
7. Embedding Service generates vectors
8. Chunks stored in Weaviate
9. Chunk metadata stored in PostgreSQL
10. Document status updated to "completed"
```

### Search Flow

```
1. User enters query → Frontend
2. Frontend sends query → Backend /api/search
3. Embedding Service generates query vector
4. Weaviate performs similarity search
5. Results ranked and filtered
6. Response sent to Frontend
7. Results displayed with highlighting
```

### RAG Query Flow

```
1. User asks question → Frontend
2. Frontend sends question → Backend /api/search/ask
3. Query vector generated
4. Top-k relevant chunks retrieved from Weaviate
5. Context constructed from chunks
6. Prompt sent to OpenAI LLM
7. Answer generated with citations
8. Response with sources sent to Frontend
9. Chat history stored in PostgreSQL
```

## Security

### Authentication
- JWT tokens with configurable expiration
- Password hashing with bcrypt
- Token-based API authentication

### Authorization
- User-scoped data access
- Document ownership verification
- Protected API endpoints

### Data Protection
- HTTPS in production
- Environment variable configuration
- SQL injection prevention (SQLAlchemy ORM)
- Input validation (Pydantic)

## Scalability Considerations

### Current Architecture
- Suitable for 100-1000 users
- Handles up to 100,000 documents
- ~10-50 concurrent requests

### Scaling Options

**Horizontal Scaling:**
- Multiple backend instances behind load balancer
- Weaviate clustering
- PostgreSQL replication

**Performance Optimization:**
- Redis caching for frequent queries
- Async processing with Celery
- CDN for frontend assets
- Database indexing

**Storage Scaling:**
- Object storage (S3) for documents
- Separate Weaviate clusters by tenant
- Database sharding

## Monitoring and Observability

### Metrics
- Request latency
- Search performance
- Embedding generation time
- Error rates
- Document processing status

### Logging
- Structured logging with JSON
- Log levels: DEBUG, INFO, WARNING, ERROR
- Request/response logging
- Error tracking

### Health Checks
- `/health` endpoint
- Database connectivity
- Weaviate availability
- Model loading status

## Technology Choices Rationale

### Why Weaviate?
- Native vector search capabilities
- Fast similarity search
- Scalable architecture
- Good Python client
- Active community

### Why FastAPI?
- High performance (async)
- Automatic API documentation
- Type safety with Pydantic
- Modern Python features
- Easy testing

### Why Svelte?
- Lightweight and fast
- Simple syntax
- Reactive by default
- Small bundle size
- Good developer experience

### Why Sentence Transformers?
- Pre-trained models available
- Good multilingual support
- Fast inference
- Easy to use
- Can run on CPU

## Future Enhancements

1. **Multi-language Support:** Add Swahili language models
2. **Advanced OCR:** Better handling of Kenyan documents
3. **Collaborative Features:** Document sharing between users
4. **Mobile App:** React Native or Flutter app
5. **Local Models:** Ollama integration for privacy
6. **Advanced Analytics:** ML-powered insights
7. **Export Features:** PDF reports, data export
8. **Integrations:** Email, Slack, WhatsApp notifications
