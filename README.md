# DocuMind - Intelligent Document Assistant

A powerful RAG (Retrieval-Augmented Generation) system for document analysis and question answering.

## Features

- 📄 **Document Upload**: PDF, TXT, and Markdown support
- 🔍 **Semantic Search**: Vector-based similarity search
- 💬 **Intelligent Q&A**: Context-aware answers from your documents
- 🎨 **Modern UI**: Beautiful purple-themed interface
- 🚀 **Fast Backend**: Node.js + Express API
- 🤖 **Multiple AI Providers**: OpenAI, Cohere, or local embeddings

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file:

```bash
copy .env.example .env
```

Edit `.env` and configure your settings:

- **For local mode** (no API keys needed):
  ```
  AI_PROVIDER=local
  USE_LOCAL_EMBEDDINGS=true
  ```

- **For OpenAI** (better quality):
  ```
  AI_PROVIDER=openai
  OPENAI_API_KEY=your_api_key_here
  ```

- **For Cohere**:
  ```
  AI_PROVIDER=cohere
  COHERE_API_KEY=your_api_key_here
  ```

### 3. Start the Server

```bash
npm start
```

The server will start on `http://localhost:3000`

### 4. Open the Application

Open your browser and navigate to:
```
http://localhost:3000
```

## Usage

1. **Upload Documents**
   - Click "Upload Files" tab
   - Drag & drop or click to select PDF/TXT/MD files
   - Wait for processing

2. **Ask Questions**
   - Click "Query Assistant" tab
   - Type your question
   - Get intelligent answers with sources

3. **Browse Documents**
   - Click "Knowledge Base" tab
   - View all document segments
   - Navigate with pagination

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/upload` - Upload document
- `GET /api/documents` - List all documents
- `GET /api/chunks?page=1&limit=10` - Get document chunks
- `POST /api/query` - Query documents
- `DELETE /api/documents/:id` - Delete document

## Project Structure

```
├── index.html          # Frontend UI
├── app.js              # Frontend logic
├── styles.css          # Styling
├── server.js           # Backend server
├── package.json        # Dependencies
├── .env                # Configuration
├── utils/
│   └── ai-utils.js     # AI utilities
└── uploads/            # Uploaded files
```

## Technologies

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Node.js, Express
- **AI**: OpenAI API, Cohere API, Natural (TF-IDF)
- **Document Processing**: pdf-parse, multer

## Development

For development with auto-reload:

```bash
npm install -g nodemon
npm run dev
```

## Notes

- Maximum file size: 10MB
- Supported formats: PDF, TXT, MD
- Local mode uses TF-IDF for embeddings (no API costs)
- OpenAI/Cohere provide better semantic understanding

## License

MIT
