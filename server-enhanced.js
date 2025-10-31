const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

// Database
const { ready: dbReady, saveDatabase } = require('./database/init');
const { User, Document, Chunk, ChatHistory, Analytics } = require('./database/models');

// Middleware
const { errorHandler, notFound, asyncHandler, AppError, logger } = require('./middleware/errorHandler');
const { optionalAuth, authenticateToken } = require('./middleware/auth');
const { apiLimiter, uploadLimiter, queryLimiter } = require('./middleware/rateLimiter');
const {
    validateQuery,
    validateDocumentId,
    validatePagination,
    validateFileUpload
} = require('./middleware/validation');

// Routes
const authRoutes = require('./routes/auth');

// Utilities
const {
    processDocument,
    generateEmbedding,
    searchSimilar,
    generateAnswer,
    summarizeDocument
} = require('./utils/ai-utils-enhanced');
const { QueryCache, EmbeddingCache, DocumentCache, clearAllCaches, getAllStats } = require('./utils/cache');

const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server for Socket.IO
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST']
    }
});

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false // Allow inline scripts for frontend
}));

// CORS
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use(express.static('.'));

// Request logging
app.use((req, res, next) => {
    logger.info({
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
    next();
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Configure multer for file uploads with enhanced file types
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedExtensions = [
            '.pdf', '.txt', '.md',
            '.docx', '.csv', '.xlsx', '.xls',
            '.png', '.jpg', '.jpeg'
        ];

        if (allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`Only ${allowedExtensions.join(', ')} files are allowed`));
        }
    }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    socket.on('disconnect', () => {
        logger.info(`Socket disconnected: ${socket.id}`);
    });
});

// Wait for database to be ready
dbReady.then(() => {
    logger.info('Database ready');
}).catch(err => {
    logger.error('Database initialization failed:', err);
});

// Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'DocuMind Enhanced backend is running',
        features: {
            database: 'SQLite',
            authentication: 'JWT + API Key',
            fileTypes: ['PDF', 'TXT', 'MD', 'DOCX', 'CSV', 'XLSX', 'Images (OCR)'],
            search: 'Hybrid (Vector + Keyword)',
            caching: 'Enabled',
            realtime: 'WebSocket'
        }
    });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Upload document
app.post('/api/upload', optionalAuth, uploadLimiter, upload.single('file'), validateFileUpload, asyncHandler(async (req, res) => {
    const socketId = req.body.socketId;
    const socket = socketId ? io.sockets.sockets.get(socketId) : null;

    try {
        if (!req.file) {
            throw new AppError('No file uploaded', 400);
        }

        const filePath = req.file.path;
        const fileName = req.file.originalname;
        const fileType = path.extname(fileName);

        // Emit progress
        if (socket) {
            socket.emit('upload:progress', { stage: 'processing', progress: 10 });
        }

        // Process the document
        const { text, chunks, metadata } = await processDocument(filePath, fileName);

        if (socket) {
            socket.emit('upload:progress', { stage: 'embedding', progress: 40 });
        }

        // Generate embeddings for chunks
        const totalChunks = chunks.length;
        for (let i = 0; i < chunks.length; i++) {
            chunks[i].embedding = await generateEmbedding(chunks[i].text);

            if (socket && i % 5 === 0) {
                const progress = 40 + Math.floor((i / totalChunks) * 50);
                socket.emit('upload:progress', { stage: 'embedding', progress });
            }
        }

        // Store document in database
        const doc = Document.create({
            userId: req.user?.id || null,
            filename: req.file.filename,
            originalFilename: fileName,
            filePath: filePath,
            fileType: fileType,
            fileSize: req.file.size,
            content: text,
            metadata: metadata
        });

        // Store chunks
        const chunksWithDocId = chunks.map((chunk, index) => ({
            documentId: doc.id,
            chunkIndex: index,
            text: chunk.text,
            embedding: chunk.embedding,
            metadata: chunk.metadata
        }));

        Chunk.createMany(chunksWithDocId);

        // Generate summary
        let summary = null;
        try {
            summary = await summarizeDocument(text, 150);
        } catch (error) {
            logger.warn('Summary generation failed:', error);
        }

        if (socket) {
            socket.emit('upload:progress', { stage: 'complete', progress: 100 });
        }

        // Track analytics
        Analytics.track('document_uploaded', {
            documentId: doc.id,
            fileType,
            fileSize: req.file.size,
            chunks: chunks.length
        }, req.user?.id);

        res.json({
            success: true,
            document: {
                id: doc.id,
                filename: doc.original_filename,
                fileType: doc.file_type,
                fileSize: doc.file_size,
                chunksCreated: chunks.length,
                summary: summary,
                metadata: doc.metadata
            },
            stats: {
                totalDocuments: Document.count(),
                totalChunks: Chunk.count()
            }
        });

    } catch (error) {
        if (socket) {
            socket.emit('upload:error', { message: error.message });
        }
        throw error;
    }
}));

// Get all documents
app.get('/api/documents', optionalAuth, validatePagination, asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    let documents;
    if (req.user) {
        documents = Document.findByUserId(req.user.id);
    } else {
        documents = Document.findAll();
    }

    // Paginate
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedDocs = documents.slice(start, end);

    res.json({
        documents: paginatedDocs.map(doc => ({
            id: doc.id,
            filename: doc.original_filename,
            fileType: doc.file_type,
            fileSize: doc.file_size,
            uploadedAt: doc.created_at,
            metadata: doc.metadata
        })),
        pagination: {
            page,
            limit,
            total: documents.length,
            totalPages: Math.ceil(documents.length / limit)
        }
    });
}));

// Get document chunks
app.get('/api/chunks', optionalAuth, validatePagination, asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const chunks = Chunk.findAll(page, limit);
    const totalChunks = Chunk.count();

    res.json({
        chunks: chunks.map(chunk => ({
            id: chunk.id,
            docName: chunk.doc_name,
            text: chunk.text,
            metadata: chunk.metadata
        })),
        pagination: {
            page,
            limit,
            total: totalChunks,
            totalPages: Math.ceil(totalChunks / limit)
        }
    });
}));

// Query endpoint with hybrid search
app.post('/api/query', optionalAuth, queryLimiter, validateQuery, asyncHandler(async (req, res) => {
    const { query, useCache = true, useHybrid = true } = req.body;
    const sessionId = req.body.sessionId || uuidv4();

    const chunks = Chunk.findAllWithEmbeddings();

    if (chunks.length === 0) {
        throw new AppError('No documents uploaded yet', 400);
    }

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Search for similar chunks (with hybrid search)
    const results = searchSimilar(queryEmbedding, query, chunks, 5, useHybrid);

    // Generate answer
    const { answer, cached, cacheHits } = await generateAnswer(query, results, { useCache });

    // Save to chat history
    ChatHistory.create({
        userId: req.user?.id || null,
        sessionId,
        query,
        answer,
        sources: results.map(r => ({
            docName: r.doc_name,
            text: r.text,
            score: r.hybridScore || r.score
        }))
    });

    // Track analytics
    Analytics.track('query_performed', {
        query,
        cached,
        resultCount: results.length
    }, req.user?.id);

    res.json({
        answer,
        sources: results.map(r => ({
            docName: r.doc_name,
            text: r.text,
            score: r.hybridScore || r.score,
            vectorScore: r.vectorScore,
            keywordScore: r.keywordScore
        })),
        sessionId,
        cached,
        cacheHits
    });
}));

// Get chat history
app.get('/api/chat-history/:sessionId', optionalAuth, asyncHandler(async (req, res) => {
    const { sessionId } = req.params;

    const history = ChatHistory.findBySessionId(sessionId);

    res.json({
        sessionId,
        messages: history.map(h => ({
            id: h.id,
            query: h.query,
            answer: h.answer,
            sources: h.sources,
            createdAt: h.created_at
        }))
    });
}));

// Get user sessions
app.get('/api/sessions', authenticateToken, asyncHandler(async (req, res) => {
    const sessions = ChatHistory.getUserSessions(req.user.id);

    res.json({
        sessions
    });
}));

// Delete document
app.delete('/api/documents/:id', optionalAuth, validateDocumentId, asyncHandler(async (req, res) => {
    const docId = parseInt(req.params.id);
    const doc = Document.findById(docId);

    if (!doc) {
        throw new AppError('Document not found', 404);
    }

    // Check ownership if user is authenticated
    if (req.user && doc.user_id !== req.user.id) {
        throw new AppError('Unauthorized', 403);
    }

    // Delete file from disk
    if (fs.existsSync(doc.file_path)) {
        fs.unlinkSync(doc.file_path);
    }

    // Delete chunks
    Chunk.deleteByDocumentId(docId);

    // Delete document
    Document.delete(docId);

    // Clear caches
    DocumentCache.delete(doc.file_path);

    // Track analytics
    Analytics.track('document_deleted', { documentId: docId }, req.user?.id);

    res.json({
        success: true,
        message: 'Document deleted successfully'
    });
}));

// Cache management
app.get('/api/cache/stats', asyncHandler(async (req, res) => {
    res.json({
        success: true,
        stats: getAllStats()
    });
}));

app.post('/api/cache/clear', asyncHandler(async (req, res) => {
    clearAllCaches();

    res.json({
        success: true,
        message: 'All caches cleared'
    });
}));

// Analytics endpoints
app.get('/api/analytics/dashboard', authenticateToken, asyncHandler(async (req, res) => {
    const stats = Analytics.getDashboardStats();

    res.json({
        success: true,
        stats
    });
}));

// Popular queries
app.get('/api/analytics/popular-queries', asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const popular = QueryCache.getPopular(limit);

    res.json({
        success: true,
        queries: popular
    });
}));

// Not found handler
app.use(notFound);

// Error handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGINT', () => {
    logger.info('Shutting down gracefully...');
    saveDatabase();
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    logger.info('Shutting down gracefully...');
    saveDatabase();
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════╗
║   DocuMind Enhanced Backend Server      ║
╚══════════════════════════════════════════╝

Server running on: http://localhost:${PORT}
API endpoint: http://localhost:${PORT}/api
Frontend: http://localhost:${PORT}

🔒 Security: Helmet + CORS + Rate Limiting
🗄️  Database: SQLite with persistence
🔑 Auth: JWT + API Keys
📁 File Types: PDF, DOCX, CSV, Excel, Images (OCR)
🔍 Search: Hybrid (Vector + Keyword)
⚡ Caching: Embeddings + Queries
🌐 WebSocket: Real-time updates
📊 Analytics: Event tracking

AI Provider: ${process.env.AI_PROVIDER || 'local'}
Ready to process documents!
    `);

    logger.info(`Server started on port ${PORT}`);
});

module.exports = { app, server, io };
