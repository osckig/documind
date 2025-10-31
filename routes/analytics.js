const express = require('express');
const router = express.Router();
const { Document, Chunk, ChatHistory, Analytics } = require('../database/models');
const { optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { DocumentClusterer, findSimilarDocuments } = require('../utils/clustering');
const {
    analyzeUploadTrends,
    analyzeContentTrends,
    analyzeQueryTrends
} = require('../utils/trendAnalysis');
const {
    generateBusinessInsights,
    detectSeasonalPatterns,
    extractFinancialData,
    analyzeCustomerInsights,
    identifyRecurringIssues
} = require('../utils/businessIntelligence');

/**
 * Get comprehensive business insights dashboard
 * GET /api/analytics/business-insights
 */
router.get('/business-insights', optionalAuth, asyncHandler(async (req, res) => {
    // Get all documents (or user-specific if authenticated)
    let documents;
    if (req.user) {
        documents = Document.findByUserId(req.user.id);
    } else {
        documents = Document.findAll();
    }

    // Get chat history for query analysis
    const chatHistory = req.user
        ? ChatHistory.findByUserId(req.user.id, 100)
        : ChatHistory.getRecentQueries(100);

    // Generate comprehensive insights
    const insights = generateBusinessInsights(documents, chatHistory);

    res.json({
        success: true,
        insights,
        documentCount: documents.length,
        generatedAt: new Date().toISOString()
    });
}));

/**
 * Get document clusters
 * GET /api/analytics/clusters
 */
router.get('/clusters', optionalAuth, asyncHandler(async (req, res) => {
    const k = parseInt(req.query.k) || 5;

    // Get all chunks with embeddings
    const chunks = Chunk.findAllWithEmbeddings();

    if (chunks.length < k) {
        return res.json({
            success: true,
            message: `Insufficient documents for clustering (need at least ${k})`,
            clusters: []
        });
    }

    // Perform clustering
    const clusterer = new DocumentClusterer(k);
    const clusters = clusterer.cluster(chunks);

    res.json({
        success: true,
        clusters: clusters.map(cluster => ({
            id: cluster.clusterId,
            label: cluster.label,
            size: cluster.size,
            keywords: cluster.keywords,
            averageSimilarity: cluster.avgSimilarity,
            documents: cluster.documents.map(doc => ({
                id: doc.id,
                docName: doc.doc_name,
                preview: doc.text.substring(0, 150) + '...'
            }))
        })),
        totalClusters: clusters.length,
        totalDocuments: chunks.length
    });
}));

/**
 * Get upload trends over time
 * GET /api/analytics/upload-trends
 */
router.get('/upload-trends', optionalAuth, asyncHandler(async (req, res) => {
    const groupBy = req.query.groupBy || 'day';
    const period = parseInt(req.query.period) || 30;

    let documents;
    if (req.user) {
        documents = Document.findByUserId(req.user.id);
    } else {
        documents = Document.findAll();
    }

    const trends = analyzeUploadTrends(documents, { groupBy, period });

    res.json({
        success: true,
        trends,
        period: `${period} ${groupBy}s`,
        generatedAt: new Date().toISOString()
    });
}));

/**
 * Get content trends (topics, keywords over time)
 * GET /api/analytics/content-trends
 */
router.get('/content-trends', optionalAuth, asyncHandler(async (req, res) => {
    const groupBy = req.query.groupBy || 'week';

    let documents;
    if (req.user) {
        documents = Document.findByUserId(req.user.id);
    } else {
        documents = Document.findAll();
    }

    const trends = analyzeContentTrends(documents, { groupBy });

    res.json({
        success: true,
        contentTrends: trends,
        totalDocuments: documents.length
    });
}));

/**
 * Get query trends
 * GET /api/analytics/query-trends
 */
router.get('/query-trends', optionalAuth, asyncHandler(async (req, res) => {
    const groupBy = req.query.groupBy || 'day';
    const period = parseInt(req.query.period) || 30;

    const queries = req.user
        ? ChatHistory.findByUserId(req.user.id, 1000)
        : ChatHistory.getRecentQueries(1000);

    const trends = analyzeQueryTrends(queries, { groupBy, period });

    res.json({
        success: true,
        queryTrends: trends,
        totalQueries: queries.length
    });
}));

/**
 * Get financial insights
 * GET /api/analytics/financial
 */
router.get('/financial', optionalAuth, asyncHandler(async (req, res) => {
    let documents;
    if (req.user) {
        documents = Document.findByUserId(req.user.id);
    } else {
        documents = Document.findAll();
    }

    const financialData = extractFinancialData(documents);

    res.json({
        success: true,
        financial: financialData,
        generatedAt: new Date().toISOString()
    });
}));

/**
 * Get customer insights
 * GET /api/analytics/customer-insights
 */
router.get('/customer-insights', optionalAuth, asyncHandler(async (req, res) => {
    let documents;
    if (req.user) {
        documents = Document.findByUserId(req.user.id);
    } else {
        documents = Document.findAll();
    }

    const customerInsights = analyzeCustomerInsights(documents);

    res.json({
        success: true,
        customerInsights,
        generatedAt: new Date().toISOString()
    });
}));

/**
 * Get recurring issues
 * GET /api/analytics/issues
 */
router.get('/issues', optionalAuth, asyncHandler(async (req, res) => {
    let documents;
    if (req.user) {
        documents = Document.findByUserId(req.user.id);
    } else {
        documents = Document.findAll();
    }

    const issues = identifyRecurringIssues(documents);

    res.json({
        success: true,
        issues,
        generatedAt: new Date().toISOString()
    });
}));

/**
 * Get seasonal patterns
 * GET /api/analytics/seasonal
 */
router.get('/seasonal', optionalAuth, asyncHandler(async (req, res) => {
    let documents;
    if (req.user) {
        documents = Document.findByUserId(req.user.id);
    } else {
        documents = Document.findAll();
    }

    const seasonal = detectSeasonalPatterns(documents);

    res.json({
        success: true,
        seasonal,
        generatedAt: new Date().toISOString()
    });
}));

/**
 * Find similar documents
 * GET /api/analytics/similar/:documentId
 */
router.get('/similar/:documentId', optionalAuth, asyncHandler(async (req, res) => {
    const documentId = parseInt(req.params.documentId);
    const topN = parseInt(req.query.topN) || 5;

    // Get all chunks for the target document
    const targetChunks = Chunk.findByDocumentId(documentId);

    if (targetChunks.length === 0) {
        return res.status(404).json({
            success: false,
            error: 'Document not found or has no chunks'
        });
    }

    // Get all chunks
    const allChunks = Chunk.findAllWithEmbeddings();

    // Find similar documents using first chunk as representative
    const similar = findSimilarDocuments(targetChunks[0], allChunks, topN);

    // Group by document
    const docMap = {};
    similar.forEach(chunk => {
        if (!docMap[chunk.document_id]) {
            docMap[chunk.document_id] = {
                documentId: chunk.document_id,
                docName: chunk.doc_name,
                maxSimilarity: chunk.similarity,
                chunks: []
            };
        }
        docMap[chunk.document_id].chunks.push({
            text: chunk.text.substring(0, 150) + '...',
            similarity: chunk.similarity
        });
        docMap[chunk.document_id].maxSimilarity = Math.max(
            docMap[chunk.document_id].maxSimilarity,
            chunk.similarity
        );
    });

    const similarDocuments = Object.values(docMap)
        .sort((a, b) => b.maxSimilarity - a.maxSimilarity)
        .slice(0, topN);

    res.json({
        success: true,
        sourceDocument: {
            id: documentId,
            name: targetChunks[0].doc_name
        },
        similarDocuments,
        count: similarDocuments.length
    });
}));

/**
 * Get document type distribution
 * GET /api/analytics/document-types
 */
router.get('/document-types', optionalAuth, asyncHandler(async (req, res) => {
    let documents;
    if (req.user) {
        documents = Document.findByUserId(req.user.id);
    } else {
        documents = Document.findAll();
    }

    const typeDistribution = {};
    const { detectDocumentType } = require('../utils/businessIntelligence');

    documents.forEach(doc => {
        const type = detectDocumentType(doc.content || '', doc.original_filename || '');
        typeDistribution[type] = (typeDistribution[type] || 0) + 1;
    });

    const distribution = Object.entries(typeDistribution)
        .map(([type, count]) => ({
            type,
            count,
            percentage: (count / documents.length * 100).toFixed(1)
        }))
        .sort((a, b) => b.count - a.count);

    res.json({
        success: true,
        distribution,
        totalDocuments: documents.length
    });
}));

module.exports = router;
