# DocuMind Enhanced - Upgrade Guide

This guide will help you understand and use all the new features added to DocuMind.

## What's New?

### 🗄️ **Persistent Database**
- **SQLite database** - All data is now saved permanently
- No more data loss on server restart
- Documents, chunks, users, and chat history are all persisted

### 🔐 **User Authentication**
- **JWT tokens** for secure authentication
- **API keys** for programmatic access
- User registration and login
- Password management

### 📁 **More File Types**
- **DOCX** - Microsoft Word documents
- **CSV/Excel** - Spreadsheet files (.csv, .xlsx, .xls)
- **Images** - OCR support for PNG, JPG, JPEG

### 🔍 **Better Search**
- **Hybrid Search** - Combines vector similarity + keyword matching
- **Smarter Chunking** - Semantic chunking with paragraph awareness
- **Caching** - Faster queries with intelligent caching

### ⚡ **Performance**
- **Embedding Cache** - Reuse computed embeddings
- **Query Cache** - Instant answers for repeated questions
- **Document Cache** - Faster file processing

### 🔒 **Security**
- **Helmet.js** - Security headers
- **Rate Limiting** - Prevent abuse
- **Input Validation** - Protect against bad data
- **CORS** - Configurable cross-origin requests

### 📊 **Analytics**
- **Event Tracking** - Monitor usage patterns
- **Popular Queries** - See what users are asking
- **Dashboard Stats** - System metrics

### 🌐 **Real-time Features**
- **WebSocket** - Real-time upload progress
- **Chat History** - Save and retrieve conversations
- **Session Management** - Track user sessions

### 📝 **Enhanced Logging**
- **Winston** - Structured logging
- **Error Tracking** - Detailed error logs
- **Request Logging** - Monitor API usage

---

## Migration from Old Version

### Step 1: Backup Your Data (Optional)

If you have important documents uploaded to the old version:
1. Navigate to the `uploads/` folder
2. Copy all files to a safe location
3. These can be re-uploaded to the new version

### Step 2: Update Dependencies

```bash
npm install
```

This will install all new packages:
- `sql.js` - Database
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT authentication
- `helmet` - Security
- `express-rate-limit` - Rate limiting
- `express-validator` - Input validation
- `winston` - Logging
- `mammoth` - DOCX support
- `xlsx` - Excel support
- `tesseract.js` - OCR
- `node-cache` - Caching
- `socket.io` - WebSocket
- `uuid` - Unique IDs

### Step 3: Update Environment Variables

Copy the new `.env.example` to your `.env`:

```bash
copy .env.example .env
```

**Important new variables:**
```env
# JWT Secret (CHANGE THIS!)
JWT_SECRET=your-super-secret-key-here

# Generate a strong secret with:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 4: Choose Your Server

You now have two options:

#### Option A: Use Enhanced Server (Recommended)
```bash
npm run start:enhanced
```

Features: All new features enabled

#### Option B: Use Original Server
```bash
npm start
```

Features: Original functionality (for comparison)

---

## Using the Enhanced Server

### Starting the Server

**Production:**
```bash
npm run start:enhanced
```

**Development (auto-reload):**
```bash
npm run dev:enhanced
```

### First Time Setup

1. **Start the server**
   ```bash
   npm run start:enhanced
   ```

2. **Create a user account** (optional)
   ```bash
   curl -X POST http://localhost:3002/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"username": "admin", "email": "admin@example.com", "password": "SecurePass123"}'
   ```

3. **Get your API key**
   The response will include an API key you can use for authentication

### Authentication

You can use the API in three ways:

#### 1. No Authentication (Anonymous)
Just use the API without any auth headers:
```bash
curl http://localhost:3002/api/health
```

#### 2. JWT Token
```bash
# Login
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "SecurePass123"}'

# Use the token
curl http://localhost:3002/api/documents \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 3. API Key
```bash
curl http://localhost:3002/api/documents \
  -H "X-API-Key: YOUR_API_KEY"
```

---

## New API Endpoints

### Authentication
```
POST /api/auth/register      - Register new user
POST /api/auth/login         - Login user
GET  /api/auth/me            - Get current user
POST /api/auth/refresh-api-key - Refresh API key
PUT  /api/auth/profile       - Update profile
POST /api/auth/change-password - Change password
```

### Documents (Enhanced)
```
POST /api/upload             - Upload document (now supports DOCX, CSV, Excel, Images)
GET  /api/documents          - List documents (with pagination)
GET  /api/chunks             - Get document chunks
DELETE /api/documents/:id    - Delete document
```

### Chat & Query (Enhanced)
```
POST /api/query              - Query documents (hybrid search)
GET  /api/chat-history/:sessionId - Get chat history
GET  /api/sessions           - Get user sessions
```

### Cache Management
```
GET  /api/cache/stats        - Get cache statistics
POST /api/cache/clear        - Clear all caches
```

### Analytics
```
GET  /api/analytics/dashboard - Get dashboard stats
GET  /api/analytics/popular-queries - Get popular queries
```

---

## New Features Guide

### 1. Uploading Documents

**New file types supported:**

```bash
# Upload a Word document
curl -X POST http://localhost:3002/api/upload \
  -F "file=@document.docx"

# Upload an Excel file
curl -X POST http://localhost:3002/api/upload \
  -F "file=@data.xlsx"

# Upload an image (OCR)
curl -X POST http://localhost:3002/api/upload \
  -F "file=@screenshot.png"
```

**With real-time progress (WebSocket):**

See the frontend code for WebSocket implementation example.

### 2. Querying with Hybrid Search

```bash
curl -X POST http://localhost:3002/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is the main topic?",
    "useHybrid": true,
    "useCache": true
  }'
```

Response includes both vector and keyword scores:
```json
{
  "answer": "The main topic is...",
  "sources": [
    {
      "docName": "document.pdf",
      "text": "...",
      "score": 0.85,
      "vectorScore": 0.8,
      "keywordScore": 0.9
    }
  ],
  "cached": false
}
```

### 3. Chat History

```bash
# Query with session ID
curl -X POST http://localhost:3002/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is this about?",
    "sessionId": "my-session-123"
  }'

# Retrieve chat history
curl http://localhost:3002/api/chat-history/my-session-123
```

### 4. Cache Management

```bash
# View cache stats
curl http://localhost:3002/api/cache/stats

# Clear caches
curl -X POST http://localhost:3002/api/cache/clear
```

### 5. Analytics

```bash
# Dashboard stats
curl http://localhost:3002/api/analytics/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"

# Popular queries
curl http://localhost:3002/api/analytics/popular-queries
```

---

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3002 |
| `NODE_ENV` | Environment | development |
| `AI_PROVIDER` | AI provider (ollama/openai/cohere/local) | ollama |
| `OLLAMA_HOST` | Ollama server URL | http://localhost:11434 |
| `OLLAMA_MODEL` | Ollama model name | mistral |
| `JWT_SECRET` | Secret for JWT tokens | (required) |
| `JWT_EXPIRES_IN` | Token expiration | 7d |
| `CORS_ORIGIN` | Allowed CORS origins | * |
| `LOG_LEVEL` | Logging level | info |

### Rate Limits

- **API General**: 100 requests per 15 minutes
- **Authentication**: 5 attempts per 15 minutes
- **File Upload**: 20 uploads per hour
- **Queries**: 10 queries per minute

---

## Troubleshooting

### Database Issues

**Problem**: Database not initializing

**Solution**:
1. Delete `database/documind.db`
2. Restart the server
3. Database will be recreated automatically

### Authentication Issues

**Problem**: JWT token expired

**Solution**: Login again to get a new token

**Problem**: API key not working

**Solution**: Refresh your API key via `/api/auth/refresh-api-key`

### File Upload Issues

**Problem**: File type not supported

**Solution**: Check the supported formats:
- Documents: PDF, TXT, MD, DOCX
- Data: CSV, XLSX, XLS
- Images: PNG, JPG, JPEG

**Problem**: File too large

**Solution**: Maximum file size is 10MB

### Performance Issues

**Problem**: Slow queries

**Solution**:
1. Enable caching: `useCache: true` in query
2. Check cache stats: `GET /api/cache/stats`
3. Clear old caches if needed

---

## Best Practices

### Security

1. **Change JWT_SECRET** in production
2. **Use HTTPS** for production deployments
3. **Set CORS_ORIGIN** to your domain
4. **Regular password changes** for user accounts

### Performance

1. **Enable caching** for frequent queries
2. **Use hybrid search** for better relevance
3. **Monitor cache stats** to optimize
4. **Clear old caches** periodically

### Data Management

1. **Regular database backups** (copy `database/documind.db`)
2. **Monitor disk space** (uploads and logs)
3. **Clean up old documents** if needed
4. **Review analytics** for insights

---

## Rollback to Old Version

If you need to rollback:

1. **Stop the enhanced server**
2. **Start the original server**:
   ```bash
   npm start
   ```
3. **Note**: You'll lose access to database features, but uploaded files remain

---

## Support & Resources

- **Documentation**: See README.md
- **API Reference**: See this guide
- **Issues**: Check logs in `logs/` folder
- **Questions**: Review the code comments

---

## Next Steps

1. ✅ Start the enhanced server
2. ✅ Create a user account (optional)
3. ✅ Upload your first document
4. ✅ Try the hybrid search
5. ✅ Explore analytics dashboard
6. ✅ Check out chat history features

Enjoy the enhanced DocuMind!
