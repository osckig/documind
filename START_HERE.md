# 🚀 START HERE - Quick Guide

## What You Have

A complete **AI Document Search System** with:
- ✅ Local LLM (Ollama + Mistral) - No API costs
- ✅ RAG (Retrieval-Augmented Generation)
- ✅ **Tool System** - Calculator 🧮, Web Search 🌐, Stats 📊
- ✅ Vector Search (FAISS)
- ✅ Svelte Frontend
- ✅ 100% Local & Private

## How to Run

### Option 1: Manual (Recommended for first time)

See **[MANUAL_RUN.md](MANUAL_RUN.md)** for detailed step-by-step instructions.

**Quick version:**

**Terminal 1 (Backend):**
```bash
cd src\backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

**Terminal 2 (Frontend):**
```bash
cd src\frontend
npm install
npm run dev
```

**Browser:**
```
http://localhost:5173
```

### Option 2: Automated Script

Double-click **RUN.bat** (may need to run as administrator)

## Test the System

1. **Register** → Create account
2. **Login** → Enter credentials
3. **Test Calculator**: Ask "What is 2 + 2?" in Chat mode
   - Should show 🧮 icon and answer "4"
4. **Upload Document** → PDF, DOCX, or TXT
5. **Search** → Find content
6. **Chat with Docs** → Ask questions about your documents

## Tool Examples

Try these in Chat Mode:

### 🧮 Calculator
```
"What is 2 + 2?"
"Calculate 15 * 8 + 10"
"What is 2 ** 8?"
```

### 📊 Document Stats
```
"How many documents do I have?"
"List all my documents"
"Show document count"
```

### 🌐 Web Search
```
"Search web for Python programming"
"Latest AI news"
```

## Documentation

| File | Description |
|------|-------------|
| **MANUAL_RUN.md** | Step-by-step manual startup guide |
| **LOCAL_SETUP.md** | Complete setup instructions |
| **TOOLS_GUIDE.md** | How to use and create tools |
| **PROJECT_GUIDE.md** | Year 4 project documentation |
| **ARCHITECTURE.md** | System architecture details |

## Quick Checks

✅ **Ollama installed?** Run: `ollama list`
✅ **Mistral model?** Should show in the list
✅ **Python 3.9+?** Run: `python --version`
✅ **Node.js 18+?** Run: `node --version`

## Troubleshooting

**"Port already in use"**:
- Kill processes on ports 8000 (backend) and 5173 (frontend)

**"Module not found"**:
- Backend: Reinstall `pip install -r requirements.txt`
- Frontend: Reinstall `npm install`

**"Ollama connection error"**:
- Start Ollama from Start Menu or run `ollama serve`
- Test: `ollama run mistral "test"`

## System URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## What Makes This Special?

1. **100% Local** - No cloud, no API costs, full privacy
2. **Tool System** - Like Verba/Elysia, AI can use tools
3. **RAG Powered** - Answers questions from your documents
4. **Kenyan Context** - Optimized for Kenyan SMEs
5. **Year 4 Project** - Complete, production-ready system

## Need Help?

1. Check **MANUAL_RUN.md** for detailed instructions
2. Look at terminal outputs for errors
3. Check browser console (F12)
4. Verify Ollama is running: `ollama list`

## Success! 🎉

You'll know it's working when:
- ✅ You see the login page
- ✅ Can register and login
- ✅ "What is 2+2?" returns "4" with 🧮 icon
- ✅ Can upload and search documents

**Have fun with your AI Document Search System!**

---

**For detailed guides, see:**
- [MANUAL_RUN.md](MANUAL_RUN.md) - How to run
- [TOOLS_GUIDE.md](TOOLS_GUIDE.md) - Tool system
- [PROJECT_GUIDE.md](PROJECT_GUIDE.md) - Project details
