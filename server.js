const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve frontend files

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + file.originalname;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedExtensions = ['.pdf', '.txt', '.md'];

        if (allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF, TXT, and MD files are allowed'));
        }
    }
});

// In-memory storage for documents and embeddings
let documents = [];
let documentChunks = [];

// Import AI utilities
const { processDocument, generateEmbedding, searchSimilar, generateAnswer } = require('./utils/ai-utils');

// Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'DocuMind backend is running' });
});

// Upload document
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const filePath = req.file.path;
        const fileName = req.file.originalname;

        // Process the document
        const { text, chunks } = await processDocument(filePath, fileName);

        // Generate embeddings for chunks
        for (let chunk of chunks) {
            chunk.embedding = await generateEmbedding(chunk.text);
        }

        // Store document
        const doc = {
            id: Date.now() + Math.random(),
            filename: fileName,
            content: text,
            uploadedAt: new Date(),
            filePath: filePath
        };

        documents.push(doc);
        documentChunks.push(...chunks);

        res.json({
            success: true,
            document: {
                id: doc.id,
                filename: doc.filename,
                chunksCreated: chunks.length
            },
            stats: {
                totalDocuments: documents.length,
                totalChunks: documentChunks.length
            }
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all documents
app.get('/api/documents', (req, res) => {
    const docs = documents.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        uploadedAt: doc.uploadedAt
    }));

    res.json({
        documents: docs,
        stats: {
            totalDocuments: documents.length,
            totalChunks: documentChunks.length
        }
    });
});

// Get document chunks with pagination
app.get('/api/chunks', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIdx = (page - 1) * limit;
    const endIdx = startIdx + limit;

    const paginatedChunks = documentChunks.slice(startIdx, endIdx).map(chunk => ({
        docId: chunk.docId,
        docName: chunk.docName,
        text: chunk.text
    }));

    res.json({
        chunks: paginatedChunks,
        pagination: {
            page: page,
            limit: limit,
            total: documentChunks.length,
            totalPages: Math.ceil(documentChunks.length / limit)
        }
    });
});

// Search/Query endpoint
app.post('/api/query', async (req, res) => {
    try {
        const { query } = req.body;

        if (!query || query.trim().length === 0) {
            return res.status(400).json({ error: 'Query is required' });
        }

        if (documentChunks.length === 0) {
            return res.status(400).json({ error: 'No documents uploaded yet' });
        }

        // Generate embedding for the query
        const queryEmbedding = await generateEmbedding(query);

        // Search for similar chunks
        const results = searchSimilar(queryEmbedding, documentChunks, 5);

        // Generate answer from results
        const answer = await generateAnswer(query, results);

        res.json({
            answer: answer,
            sources: results.map(r => ({
                docName: r.docName,
                text: r.text,
                score: r.score
            }))
        });

    } catch (error) {
        console.error('Query error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete document
app.delete('/api/documents/:id', (req, res) => {
    try {
        const docId = parseFloat(req.params.id);
        const docIndex = documents.findIndex(doc => doc.id === docId);

        if (docIndex === -1) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const doc = documents[docIndex];

        // Delete file from disk
        if (fs.existsSync(doc.filePath)) {
            fs.unlinkSync(doc.filePath);
        }

        // Remove from arrays
        documents.splice(docIndex, 1);
        documentChunks = documentChunks.filter(chunk => chunk.docId !== docId);

        res.json({
            success: true,
            message: 'Document deleted',
            stats: {
                totalDocuments: documents.length,
                totalChunks: documentChunks.length
            }
        });

    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════╗
║       DocuMind Backend Server         ║
╚═══════════════════════════════════════╝

Server running on: http://localhost:${PORT}
API endpoint: http://localhost:${PORT}/api
Frontend: http://localhost:${PORT}

AI Provider: ${process.env.AI_PROVIDER || 'local'}
Ready to process documents!
    `);
});
