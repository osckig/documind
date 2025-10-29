# How to Run DocuMind - Complete Guide

This guide will help you run the DocuMind application on your own without assistance.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Configuration Options](#configuration-options)
4. [Starting the Application](#starting-the-application)
5. [Using the Application](#using-the-application)
6. [Troubleshooting](#troubleshooting)
7. [Stopping the Application](#stopping-the-application)

---

## Prerequisites

Before running DocuMind, ensure you have:

### Required
- **Node.js** (version 14 or higher)
  - Check if installed: `node --version`
  - Download from: https://nodejs.org/

### Optional (for better AI performance)
- **Ollama** (for local AI processing)
  - Download from: https://ollama.ai/
  - After installing, run: `ollama pull mistral`

- **OpenAI API Key** (for best quality)
  - Get from: https://platform.openai.com/api-keys

- **Cohere API Key** (alternative AI provider)
  - Get from: https://dashboard.cohere.com/api-keys

---

## Quick Start

### Step 1: Install Dependencies

Open a terminal/command prompt in the project folder and run:

```bash
npm install
```

This will install all required packages. You only need to do this once (or after pulling updates).

### Step 2: Configure Environment

The `.env` file contains your configuration. Here are the main options:

#### Option A: Use Ollama (Local AI - Recommended for Privacy)
```env
PORT=3002
AI_PROVIDER=ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=mistral
```

**Requirements:**
- Ollama must be installed and running
- Run `ollama pull mistral` to download the model

#### Option B: Use Local Mode (No AI Setup Required)
```env
PORT=3002
AI_PROVIDER=local
```

**Note:** This uses basic TF-IDF for search. Less accurate but requires no setup.

#### Option C: Use OpenAI (Best Quality)
```env
PORT=3002
AI_PROVIDER=openai
OPENAI_API_KEY=your_actual_api_key_here
```

**Requirements:**
- OpenAI API key (costs money per usage)
- Replace `your_actual_api_key_here` with your real key

#### Option D: Use Cohere
```env
PORT=3002
AI_PROVIDER=cohere
COHERE_API_KEY=your_actual_api_key_here
```

### Step 3: Start the Server

```bash
npm start
```

You should see:
```
╔═══════════════════════════════════════╗
║       DocuMind Backend Server         ║
╚═══════════════════════════════════════╝

Server running on: http://localhost:3002
AI Provider: ollama
Ready to process documents!
```

### Step 4: Open in Browser

Open your web browser and go to:
```
http://localhost:3002
```

---

## Configuration Options

### Changing the Port

If port 3002 is already in use, edit `.env`:
```env
PORT=3000
```
Then use `http://localhost:3000` instead.

### Switching AI Providers

Edit the `.env` file and change `AI_PROVIDER`:
- `ollama` - Local AI (requires Ollama running)
- `openai` - OpenAI API (requires API key)
- `cohere` - Cohere API (requires API key)
- `local` - Basic search (no AI setup needed)

After changing, restart the server (Ctrl+C, then `npm start`).

---

## Starting the Application

### On Windows

#### Method 1: Using Command Prompt
1. Open Command Prompt
2. Navigate to project folder:
   ```cmd
   cd "c:\Users\OSCAR\Desktop\New folder (2)"
   ```
3. Run:
   ```cmd
   npm start
   ```

#### Method 2: Using the Batch File
Double-click `start.bat` in the project folder.

#### Method 3: Using RUN.bat
Double-click `RUN.bat` for an interactive start menu.

### On Mac/Linux

1. Open Terminal
2. Navigate to project folder:
   ```bash
   cd "/path/to/project"
   ```
3. Run:
   ```bash
   npm start
   ```

---

## Using the Application

### 1. Upload Documents

1. Click the **"Upload Files"** tab
2. Click **"Choose Files"** or drag & drop files
3. Supported formats: PDF, TXT, MD
4. Maximum file size: 10MB per file
5. Click **"Upload"** and wait for processing

### 2. Ask Questions

1. Click the **"Query Assistant"** tab
2. Type your question in the text box
3. Click **"Ask Question"**
4. View the AI-generated answer with source references

### 3. Browse Knowledge Base

1. Click the **"Knowledge Base"** tab
2. View all document chunks stored in the system
3. Use pagination to navigate through entries
4. See source document names and content

### 4. Manage Documents

- View all uploaded documents in the Knowledge Base
- Delete documents if needed (future feature)

---

## Troubleshooting

### Problem: "Cannot find module" error

**Solution:** Install dependencies:
```bash
npm install
```

### Problem: "Port 3002 already in use"

**Solution 1:** Change the port in `.env`:
```env
PORT=3003
```

**Solution 2:** Find and stop the process using port 3002:

Windows:
```cmd
netstat -ano | findstr :3002
taskkill /PID <process_id> /F
```

Mac/Linux:
```bash
lsof -i :3002
kill -9 <process_id>
```

### Problem: "Ollama not responding" or connection errors

**Solution:**
1. Check if Ollama is running:
   ```bash
   ollama list
   ```
2. If not running, start Ollama service
3. OR switch to local mode in `.env`:
   ```env
   AI_PROVIDER=local
   ```

### Problem: "OpenAI API error" or "Invalid API key"

**Solution:**
1. Check your API key in `.env` is correct
2. Verify you have credits in your OpenAI account
3. OR switch to local mode:
   ```env
   AI_PROVIDER=local
   ```

### Problem: Server starts but browser shows "Cannot connect"

**Solution:**
1. Check the terminal for the correct URL
2. Make sure server is still running (look for errors)
3. Try `http://localhost:3002` (or your configured port)
4. Clear browser cache or try incognito mode

### Problem: File upload fails

**Solution:**
1. Check file size (must be under 10MB)
2. Check file format (PDF, TXT, MD only)
3. Check uploads folder has write permissions
4. Look at terminal for error messages

---

## Stopping the Application

### Method 1: Terminal/Command Prompt
Press `Ctrl + C` in the terminal where the server is running.

### Method 2: Close Terminal
Simply close the terminal/command prompt window.

### Method 3: Force Stop (if frozen)

Windows:
```cmd
taskkill /F /IM node.exe
```

Mac/Linux:
```bash
pkill node
```

---

## Development Mode (Auto-Reload)

For development with automatic server restart on file changes:

```bash
npm run dev
```

This requires `nodemon` which is already in your dev dependencies.

---

## API Endpoints (For Testing)

You can test the API directly using tools like Postman or curl:

- **Health Check:**
  ```bash
  curl http://localhost:3002/api/health
  ```

- **List Documents:**
  ```bash
  curl http://localhost:3002/api/documents
  ```

- **Get Chunks:**
  ```bash
  curl http://localhost:3002/api/chunks?page=1&limit=10
  ```

- **Query:**
  ```bash
  curl -X POST http://localhost:3002/api/query \
    -H "Content-Type: application/json" \
    -d '{"query":"your question here"}'
  ```

---

## Additional Resources

- **Local Setup Guide:** See `LOCAL_SETUP.md`
- **Manual Run Guide:** See `MANUAL_RUN.md`
- **Quick Start:** See `QUICKSTART.md`
- **Project Guide:** See `PROJECT_GUIDE.md`
- **Tools Guide:** See `TOOLS_GUIDE.md`

---

## Common Workflows

### Daily Usage
1. Open terminal in project folder
2. Run `npm start`
3. Open browser to `http://localhost:3002`
4. Upload documents and ask questions
5. Press `Ctrl+C` when done

### First Time Setup
1. Install Node.js
2. (Optional) Install Ollama and run `ollama pull mistral`
3. Navigate to project folder
4. Run `npm install`
5. Configure `.env` file
6. Run `npm start`

### Switching AI Providers
1. Stop server (`Ctrl+C`)
2. Edit `.env` file
3. Change `AI_PROVIDER=` to desired provider
4. Run `npm start` again

---

## Tips

- **Keep terminal open** while using the application
- **Check terminal output** for errors and status messages
- **Use local mode** if you don't want to set up API keys
- **Use Ollama** for privacy and no API costs
- **Use OpenAI** for best quality answers (costs money)
- **Restart server** after changing `.env` configuration

---

## Need Help?

If you encounter issues not covered here:
1. Check the terminal output for error messages
2. Review the other documentation files in this project
3. Check that all prerequisites are installed
4. Try switching to `AI_PROVIDER=local` for testing

---

**Last Updated:** October 2024
