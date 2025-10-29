# Local Setup Guide (Without Docker)

This guide will help you run the AI Document Search system locally using Ollama and local models instead of Docker and OpenAI.

## Prerequisites

1. **Python 3.9+** installed
2. **Node.js 18+** installed
3. **Ollama** installed and running with Mistral model

## Step 1: Install and Setup Ollama

### Windows
```bash
# Download and install from: https://ollama.ai/download
# Or use winget:
winget install Ollama.Ollama

# Start Ollama (usually starts automatically)
# Check if running:
ollama list
```

### macOS/Linux
```bash
# Install Ollama
curl https://ollama.ai/install.sh | sh

# Start Ollama
ollama serve
```

### Pull the Mistral Model
```bash
# This will download ~4GB
ollama pull mistral

# Verify it's installed
ollama list
```

### Test Ollama
```bash
# Test that Ollama is working
ollama run mistral "Hello, how are you?"
```

## Step 2: Setup Backend

```bash
# Navigate to backend folder
cd src/backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create data directories
mkdir -p ../../data/uploads
mkdir -p ../../data/embeddings
mkdir -p ../../data/processed
```

## Step 3: Configure Environment

```bash
# Copy the example env file
cp ../../.env.example ../../.env

# Edit .env (optional - defaults work)
# The file is already configured for local setup:
# - DATABASE_URL=sqlite+aiosqlite:///./data/sme_docs.db
# - OLLAMA_BASE_URL=http://localhost:11434
# - OLLAMA_MODEL=mistral
```

## Step 4: Start Backend

```bash
# Make sure you're in src/backend with venv activated
python main.py

# Or use uvicorn directly:
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend will start on http://localhost:8000

Visit http://localhost:8000/docs for API documentation

## Step 5: Setup Frontend

Open a NEW terminal window:

```bash
# Navigate to frontend folder
cd src/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will start on http://localhost:5173

## Step 6: Access the Application

1. Open your browser and go to **http://localhost:5173**
2. Click "Register" to create a new account
3. Login with your credentials
4. Start uploading documents!

## Testing the System

### 1. Test Backend Health
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected (SQLite)",
  "vector_store": "FAISS (local)",
  "llm": "Ollama (mistral)"
}
```

### 2. Upload a Test Document

1. Go to the Upload page
2. Drag and drop a PDF or text file
3. Wait for processing (first time may be slow as models download)
4. Check the status changes to "completed"

### 3. Test Search

1. Go to Search & Chat page
2. Enter a search query related to your document
3. Try both search modes:
   - **Search Mode**: Find relevant passages
   - **Chat Mode**: Ask questions and get AI answers

### 4. Test RAG (Chat with Documents)

1. Switch to Chat Mode
2. Ask questions like:
   - "Summarize this document"
   - "What are the main points?"
   - "Find information about [topic]"

## Troubleshooting

### Issue: "Ollama connection error"

**Solution:**
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If not running, start it:
# Windows: Start Ollama from Start Menu
# macOS/Linux: ollama serve
```

### Issue: "Model not found"

**Solution:**
```bash
# Pull the mistral model
ollama pull mistral

# Or use a different model you have:
# Edit .env and set OLLAMA_MODEL=llama2
```

### Issue: "Database error"

**Solution:**
```bash
# Delete and recreate the database
rm data/sme_docs.db

# Restart the backend - it will recreate tables
```

### Issue: "Embedding model download slow"

**Solution:**
- The first run downloads the sentence-transformer model (~100MB)
- This only happens once
- Be patient, it will cache locally

### Issue: "Out of memory"

**Solution:**
- Reduce chunk size in settings.py:
  ```python
  chunk_size: int = 300  # reduced from 500
  ```
- Use a smaller embedding model
- Close other applications

### Issue: "Slow response times"

**Solution:**
- Ollama uses your CPU/GPU
- First response is slower (model loading)
- Subsequent responses are faster
- Consider using a smaller model like `mistral` or `llama2:7b`

## Performance Tips

### 1. Use GPU Acceleration (if available)

Ollama automatically uses GPU if available (NVIDIA/AMD)

### 2. Choose the Right Model

```bash
# Faster, smaller (7B parameters)
ollama pull mistral

# Better quality but slower (13B)
ollama pull llama2:13b

# Balanced option
ollama pull codellama
```

### 3. Optimize Settings

Edit `src/backend/config/settings.py`:

```python
# Reduce for faster processing
chunk_size: int = 300
chunk_overlap: int = 30

# Reduce for faster LLM responses
llm_max_tokens: int = 300
```

## Switching to Different Models

### Use Llama 2
```bash
ollama pull llama2
```

Edit .env:
```
OLLAMA_MODEL=llama2
```

### Use CodeLlama
```bash
ollama pull codellama
```

Edit .env:
```
OLLAMA_MODEL=codellama
```

### Use Other Models

See available models: https://ollama.ai/library

## Project Structure

```
Your Setup:
├── data/
│   ├── sme_docs.db          # SQLite database
│   ├── uploads/             # Uploaded files
│   └── embeddings/
│       ├── faiss_index.bin  # FAISS vector index
│       └── metadata.pkl     # Chunk metadata
├── src/
│   ├── backend/             # FastAPI (port 8000)
│   └── frontend/            # Svelte (port 5173)
└── .env                     # Configuration
```

## What's Different from Docker Setup

| Feature | Docker Setup | Local Setup |
|---------|--------------|-------------|
| Database | PostgreSQL | SQLite |
| Vector Store | Weaviate | FAISS |
| LLM | OpenAI API | Ollama (local) |
| Cache | Redis | None (removed) |
| Setup | Complex | Simple |
| Dependencies | Many services | Just Python & Node |
| Cost | API costs | Free (local) |
| Performance | Better | Good enough |
| Privacy | Sends to cloud | 100% local |

## Adding Claude API Later

When you're ready to add Claude API:

1. Get an API key from Anthropic
2. Install the SDK:
   ```bash
   pip install anthropic
   ```
3. Edit `src/backend/services/search_service_local.py`
4. Add Claude as an alternative to Ollama

I can help you with this when you're ready!

## Next Steps

Once everything is running:

1. ✅ Create an account
2. ✅ Upload some documents
3. ✅ Try semantic search
4. ✅ Ask questions in chat mode
5. ✅ View analytics
6. ✅ Test with different document types

## Common Commands Cheat Sheet

```bash
# Start Backend
cd src/backend
venv\Scripts\activate  # Windows
source venv/bin/activate  # macOS/Linux
python main.py

# Start Frontend (new terminal)
cd src/frontend
npm run dev

# Check Ollama
ollama list
ollama ps  # see running models
ollama pull <model>  # download model

# Reset Database
rm data/sme_docs.db

# Reset Vector Store
rm data/embeddings/*
```

## Getting Help

- Check logs in the terminal where backend is running
- Visit http://localhost:8000/docs for API docs
- Make sure Ollama is running (`ollama list`)
- Ensure ports 8000 and 5173 are not in use

## Success Indicators

You know it's working when:
- ✅ Backend starts without errors
- ✅ Frontend loads at http://localhost:5173
- ✅ You can register/login
- ✅ Documents upload and process successfully
- ✅ Search returns results
- ✅ Chat gives contextual answers

Enjoy your local AI document search system!
