# DocuMind - Intelligent Document Assistant

A powerful, production-ready RAG (Retrieval-Augmented Generation) system for document analysis and question answering with advanced features.

## ✨ Features

### Core Features
- 📄 **Multi-Format Support**: PDF, TXT, MD, DOCX, CSV, Excel, Images (OCR)
- 🔍 **Hybrid Search**: Combines vector similarity with keyword matching
- 💬 **Intelligent Q&A**: Context-aware answers from your documents
- 🗄️ **Persistent Storage**: SQLite database for all data
- 🔐 **Authentication**: JWT tokens + API keys
- ⚡ **Smart Caching**: Fast responses with intelligent caching
- 🌐 **Real-time Updates**: WebSocket for live progress
- 📊 **Analytics Dashboard**: Track usage and insights

### Advanced Features
- 🧠 **Semantic Chunking**: Smart document segmentation
- 🔄 **Multiple AI Providers**: OpenAI, Cohere, Ollama, or local
- 🔒 **Enterprise Security**: Helmet, rate limiting, CORS
- 📝 **Chat History**: Save and retrieve conversations
- 📈 **Event Tracking**: Monitor system usage
- 🎨 **Modern UI**: Beautiful, responsive interface

---

## 🚀 Quick Start

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

#### For Ollama (Local AI - Recommended)
```env
AI_PROVIDER=ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=mistral
JWT_SECRET=your-super-secret-key-here
```

#### For OpenAI (Best Quality)
```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_api_key_here
JWT_SECRET=your-super-secret-key-here
```

#### For Local Mode (No AI Setup)
```env
AI_PROVIDER=local
JWT_SECRET=your-super-secret-key-here
```

**IMPORTANT**: Change `JWT_SECRET` to a strong random value:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Choose Your Server

#### Enhanced Server (Recommended - All Features)
```bash
npm run start:enhanced
```

#### Original Server (Basic Features)
```bash
npm start
```

### 4. Open the Application

Open your browser and navigate to:
```
http://localhost:3002
```

---

## 📖 Usage

### Basic Workflow

1. **Upload Documents**
   - Drag & drop or click to select files
   - Supported: PDF, DOCX, TXT, MD, CSV, Excel, Images
   - Maximum size: 10MB per file

2. **Ask Questions**
   - Type your question in the query box
   - Get AI-generated answers with source citations
   - Hybrid search for better accuracy

3. **Browse Knowledge Base**
   - View all document chunks
   - See processing metadata
   - Navigate with pagination

4. **Manage Documents**
   - View upload history
   - Delete documents
   - Track analytics

### Authentication (Optional)

Create a user account for personalized features:

```bash
curl -X POST http://localhost:3002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_username",
    "email": "your@email.com",
    "password": "SecurePass123"
  }'
```

---

## 🔌 API Endpoints

### Health & Status
- `GET /api/health` - Health check with feature list

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/refresh-api-key` - Generate new API key
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/change-password` - Change password

### Documents
- `POST /api/upload` - Upload document (supports multiple formats)
- `GET /api/documents` - List all documents (with pagination)
- `GET /api/chunks` - Get document chunks (paginated)
- `DELETE /api/documents/:id` - Delete document

### Query & Search
- `POST /api/query` - Query documents (hybrid search)
- `GET /api/chat-history/:sessionId` - Get chat history
- `GET /api/sessions` - Get user sessions (auth required)

### Cache Management
- `GET /api/cache/stats` - Get cache statistics
- `POST /api/cache/clear` - Clear all caches

### Analytics
- `GET /api/analytics/dashboard` - Get dashboard stats (auth required)
- `GET /api/analytics/popular-queries` - Get popular queries

---

## 🛠️ Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | 3002 | No |
| `NODE_ENV` | Environment (development/production) | development | No |
| `AI_PROVIDER` | AI provider (ollama/openai/cohere/local) | ollama | No |
| `OLLAMA_HOST` | Ollama server URL | http://localhost:11434 | If using Ollama |
| `OLLAMA_MODEL` | Ollama model name | mistral | If using Ollama |
| `OPENAI_API_KEY` | OpenAI API key | - | If using OpenAI |
| `COHERE_API_KEY` | Cohere API key | - | If using Cohere |
| `JWT_SECRET` | Secret for JWT tokens | - | **Yes (Enhanced)** |
| `JWT_EXPIRES_IN` | Token expiration time | 7d | No |
| `CORS_ORIGIN` | Allowed CORS origins | * | No |
| `LOG_LEVEL` | Logging level | info | No |

### Rate Limits

- **General API**: 100 requests / 15 minutes
- **Authentication**: 5 attempts / 15 minutes
- **File Upload**: 20 uploads / hour
- **Queries**: 10 queries / minute

---

## 📁 Project Structure

```
├── server.js                 # Original server (basic features)
├── server-enhanced.js        # Enhanced server (all features)
├── index.html               # Frontend UI
├── app.js                   # Frontend logic
├── styles.css               # Styling
├── package.json             # Dependencies
├── .env                     # Configuration
│
├── database/                # Database & Models
│   ├── init.js             # Database initialization
│   └── models/             # Data models
│       ├── User.js
│       ├── Document.js
│       ├── Chunk.js
│       ├── ChatHistory.js
│       └── Analytics.js
│
├── middleware/              # Express middleware
│   ├── auth.js             # Authentication
│   ├── errorHandler.js     # Error handling & logging
│   ├── validation.js       # Input validation
│   └── rateLimiter.js      # Rate limiting
│
├── routes/                  # API routes
│   └── auth.js             # Authentication routes
│
├── utils/                   # Utilities
│   ├── ai-utils.js         # Original AI utilities
│   ├── ai-utils-enhanced.js # Enhanced AI with caching
│   ├── fileProcessors.js   # Multi-format file processing
│   ├── chunking.js         # Smart chunking strategies
│   └── cache.js            # Caching utilities
│
├── uploads/                 # Uploaded files
├── logs/                    # Application logs
└── documentation/           # Additional docs
```

---

## 🔧 Technologies

### Frontend
- Vanilla JavaScript
- HTML5
- CSS3
- Socket.IO (client)

### Backend
- Node.js
- Express.js
- Socket.IO (server)
- SQLite (via sql.js)

### AI & ML
- OpenAI API
- Cohere API
- Ollama (local LLM)
- Natural (TF-IDF)

### Security
- Helmet.js
- JWT (jsonwebtoken)
- bcryptjs
- express-rate-limit
- express-validator

### File Processing
- pdf-parse (PDF)
- mammoth (DOCX)
- xlsx (Excel/CSV)
- tesseract.js (OCR)

### Utilities
- Winston (logging)
- node-cache (caching)
- UUID (unique IDs)

---

## 🎯 Use Cases

- **Research**: Analyze academic papers and research documents
- **Business**: Process contracts, reports, and business documents
- **Legal**: Search through legal documents and case files
- **Education**: Study materials and course documents
- **Personal**: Organize and search personal document collections
- **Data Analysis**: Extract insights from spreadsheets and data files

---

## 🔐 Security Features

1. **Authentication**
   - JWT token-based authentication
   - API key support for programmatic access
   - Password hashing with bcrypt

2. **Rate Limiting**
   - Prevent brute force attacks
   - Limit upload frequency
   - Query rate limiting

3. **Input Validation**
   - Sanitize all inputs
   - File type validation
   - Size limits

4. **Security Headers**
   - Helmet.js for security headers
   - CORS configuration
   - XSS protection

---

## ⚡ Performance Optimizations

1. **Caching**
   - Embedding cache (reuse computed vectors)
   - Query cache (instant repeated answers)
   - Document cache (faster processing)

2. **Smart Chunking**
   - Semantic chunking with overlap
   - Paragraph-aware splitting
   - Metadata preservation

3. **Hybrid Search**
   - Vector similarity (70% weight)
   - Keyword matching (30% weight)
   - Phrase boost for exact matches

4. **Database**
   - Indexed queries
   - Transaction support
   - Efficient storage

---

## 📊 Analytics & Monitoring

- **Event Tracking**: Monitor all user actions
- **Popular Queries**: See trending questions
- **Cache Statistics**: Monitor cache performance
- **Error Logging**: Structured error logs
- **Request Logging**: Track API usage

---

## 🚀 Deployment

### Development
```bash
npm run dev:enhanced
```

### Production
```bash
NODE_ENV=production npm run start:enhanced
```

### Docker (Coming Soon)
```bash
docker-compose up
```

---

## 📝 Development

### Run with Auto-Reload
```bash
npm run dev:enhanced
```

### View Logs
```bash
# Error logs
cat logs/error.log

# All logs
cat logs/combined.log
```

### Clear Cache
```bash
curl -X POST http://localhost:3002/api/cache/clear
```

---

## 🔄 Upgrading

See [UPGRADE_GUIDE.md](UPGRADE_GUIDE.md) for detailed upgrade instructions from the basic version.

---

## 📚 Documentation

- [Quick Start Guide](QUICKSTART.md)
- [Upgrade Guide](UPGRADE_GUIDE.md)
- [How to Run](HOW_TO_RUN.md)
- [Local Setup](LOCAL_SETUP.md)
- [Project Guide](PROJECT_GUIDE.md)
- [Tools Guide](TOOLS_GUIDE.md)

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🙏 Acknowledgments

- OpenAI for GPT models
- Cohere for embedding models
- Ollama for local LLM support
- All open-source contributors

---

## 📞 Support

For issues and questions:
- Check the documentation
- Review logs in `logs/` folder
- See example usage in guides

---

**Built with ❤️ using Claude Code**
