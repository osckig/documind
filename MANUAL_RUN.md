# Manual Run Guide - Step by Step

Follow these steps to run the AI Document Search system manually.

## Prerequisites Check

✅ Python 3.9+ installed
✅ Node.js 18+ installed
✅ Ollama installed with Mistral model

## Step 1: Open TWO PowerShell/CMD Windows

You need two separate terminal windows:
- **Terminal 1**: For Backend
- **Terminal 2**: For Frontend

---

## Terminal 1: Start Backend

### 1.1 Navigate to backend folder
```bash
cd "c:\Users\OSCAR\Desktop\New folder (2)\src\backend"
```

### 1.2 Create virtual environment (first time only)
```bash
python -m venv venv
```

### 1.3 Activate virtual environment
```bash
venv\Scripts\activate
```

You should see `(venv)` in your prompt.

### 1.4 Install dependencies (first time only)
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

**Note**: This will take 5-10 minutes on first run. It downloads:
- FastAPI and web frameworks
- Sentence Transformers (AI models ~100MB)
- FAISS for vector search
- Ollama client
- Document processing libraries

### 1.5 Start the backend
```bash
python main.py
```

**Expected output:**
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

✅ **Backend is running!** Keep this window open.

---

## Terminal 2: Start Frontend

### 2.1 Navigate to frontend folder
```bash
cd "c:\Users\OSCAR\Desktop\New folder (2)\src\frontend"
```

### 2.2 Install dependencies (first time only)
```bash
npm install
```

**Note**: This will take 2-5 minutes on first run.

### 2.3 Start the frontend
```bash
npm run dev
```

**Expected output:**
```
  VITE v5.0.10  ready in 1234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

✅ **Frontend is running!** Keep this window open.

---

## Step 2: Open Browser

Open your browser and go to:
```
http://localhost:5173
```

You should see the login page!

---

## Step 3: Create Account & Test

### 3.1 Register
1. Click "Register"
2. Enter:
   - Username: `test`
   - Email: `test@example.com`
   - Password: `password123`
3. Click "Register"

### 3.2 Login
1. Login with your credentials
2. You'll see the home dashboard

### 3.3 Test Calculator Tool
1. Go to "Search & Chat"
2. Switch to "Chat Mode"
3. Type: **"What is 2 + 2?"**
4. Press Send
5. Look for 🧮 calculator icon
6. Should answer: "The answer is 4"

### 3.4 Upload a Document
1. Go to "Upload"
2. Drag and drop a PDF or text file
3. Wait for processing (status changes to "completed")

### 3.5 Test Document Search
1. Go to "Search & Chat"
2. Switch to "Search Mode"
3. Search for keywords from your document
4. You should see results!

### 3.6 Test RAG (Chat with Documents)
1. Stay in "Search & Chat"
2. Switch to "Chat Mode"
3. Ask: "What is this document about?"
4. Get AI-powered answer with sources!

### 3.7 Test Document Stats Tool
1. Ask: **"How many documents do I have?"**
2. Look for 📊 stats icon
3. Should tell you the count

---

## Troubleshooting

### Issue: "Port already in use"

**Backend (8000)**:
```bash
# Find process using port 8000
netstat -ano | findstr :8000

# Kill the process (replace PID)
taskkill /PID <PID> /F
```

**Frontend (5173)**:
```bash
# Find process using port 5173
netstat -ano | findstr :5173

# Kill the process (replace PID)
taskkill /PID <PID> /F
```

### Issue: "Module not found" errors

Backend:
```bash
cd "c:\Users\OSCAR\Desktop\New folder (2)\src\backend"
venv\Scripts\activate
pip install -r requirements.txt --force-reinstall
```

Frontend:
```bash
cd "c:\Users\OSCAR\Desktop\New folder (2)\src\frontend"
rm -rf node_modules
npm install
```

### Issue: "Ollama connection error"

1. Check Ollama is running:
```bash
ollama list
```

2. If not running, start it:
   - Windows: Open Ollama from Start Menu
   - Or run: `ollama serve`

3. Test Ollama:
```bash
ollama run mistral "Hello"
```

### Issue: "Embedding model download slow"

This is normal on first run. The sentence-transformer model (~100MB) downloads automatically. Just wait - it only happens once.

### Issue: "FAISS not found" or "aiosqlite not found"

```bash
cd src\backend
venv\Scripts\activate
pip install faiss-cpu aiosqlite numpy==1.24.3
```

### Issue: Frontend shows blank page

1. Check browser console (F12) for errors
2. Make sure backend is running on port 8000
3. Try: http://localhost:5173 in incognito mode

---

## Quick Commands Reference

### Backend
```bash
# Navigate
cd "c:\Users\OSCAR\Desktop\New folder (2)\src\backend"

# Activate venv
venv\Scripts\activate

# Run
python main.py
```

### Frontend
```bash
# Navigate
cd "c:\Users\OSCAR\Desktop\New folder (2)\src\frontend"

# Run
npm run dev
```

### Check Services
```bash
# Check backend
curl http://localhost:8000/health

# Check Ollama
ollama list
```

---

## Stopping the System

1. **Stop Backend**: Press `Ctrl+C` in Terminal 1
2. **Stop Frontend**: Press `Ctrl+C` in Terminal 2
3. **Close terminals**

---

## What to Expect

### First Run
- Backend takes ~30 seconds to start (loads AI models)
- Frontend takes ~5 seconds
- First document upload is slow (downloads embedding model)
- First Ollama query is slow (loads model into memory)

### Subsequent Runs
- Backend: ~5 seconds
- Frontend: ~3 seconds
- Everything much faster (models cached)

---

## Success Indicators

✅ Backend console shows "Uvicorn running on http://0.0.0.0:8000"
✅ Frontend console shows "Local: http://localhost:5173/"
✅ Browser loads the login page
✅ Can register and login
✅ Calculator tool works: "What is 2+2?" → "4" with 🧮 icon

---

## System URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| Health Check | http://localhost:8000/health |

---

## Need Help?

1. Check both terminal windows for error messages
2. Look at browser console (F12 → Console tab)
3. Check `data/sme_docs.db` was created (means database works)
4. Check `data/embeddings/` folder (means FAISS works)
5. Run: `ollama run mistral "test"` (means Ollama works)

---

## Quick Test Script

Once both services are running, open a third terminal and test:

```bash
# Test backend health
curl http://localhost:8000/health

# Should return:
# {
#   "status": "healthy",
#   "database": "connected (SQLite)",
#   "vector_store": "FAISS (local)",
#   "llm": "Ollama (mistral)"
# }
```

---

## Ready to Start?

1. Open Terminal 1 → Run backend commands
2. Open Terminal 2 → Run frontend commands
3. Open Browser → Go to http://localhost:5173
4. Register → Login → Test!

**Enjoy your local AI Document Search system! 🚀**
