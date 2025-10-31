const NodeCache = require('node-cache');
const crypto = require('crypto');

/**
 * Cache for embeddings
 */
const embeddingCache = new NodeCache({
    stdTTL: 3600, // 1 hour
    checkperiod: 600, // Check for expired keys every 10 minutes
    maxKeys: 10000
});

/**
 * Cache for query results
 */
const queryCache = new NodeCache({
    stdTTL: 1800, // 30 minutes
    checkperiod: 300,
    maxKeys: 1000
});

/**
 * Cache for document processing results
 */
const documentCache = new NodeCache({
    stdTTL: 7200, // 2 hours
    checkperiod: 600,
    maxKeys: 500
});

/**
 * Generate hash for cache key
 */
function generateHash(data) {
    return crypto
        .createHash('sha256')
        .update(typeof data === 'string' ? data : JSON.stringify(data))
        .digest('hex');
}

/**
 * Embedding cache functions
 */
const EmbeddingCache = {
    get: (text) => {
        const key = generateHash(text);
        return embeddingCache.get(key);
    },

    set: (text, embedding) => {
        const key = generateHash(text);
        return embeddingCache.set(key, embedding);
    },

    has: (text) => {
        const key = generateHash(text);
        return embeddingCache.has(key);
    },

    clear: () => {
        return embeddingCache.flushAll();
    },

    stats: () => {
        return embeddingCache.getStats();
    }
};

/**
 * Query cache functions
 */
const QueryCache = {
    get: (query) => {
        const key = generateHash(query.toLowerCase().trim());
        const cached = queryCache.get(key);

        if (cached) {
            // Update hit count
            cached.hits = (cached.hits || 0) + 1;
            cached.lastAccessed = new Date();
            queryCache.set(key, cached);
        }

        return cached;
    },

    set: (query, result) => {
        const key = generateHash(query.toLowerCase().trim());
        const cacheData = {
            query,
            result,
            hits: 1,
            created: new Date(),
            lastAccessed: new Date()
        };
        return queryCache.set(key, cacheData);
    },

    has: (query) => {
        const key = generateHash(query.toLowerCase().trim());
        return queryCache.has(key);
    },

    clear: () => {
        return queryCache.flushAll();
    },

    stats: () => {
        return queryCache.getStats();
    },

    getPopular: (limit = 10) => {
        const keys = queryCache.keys();
        const items = keys.map(key => queryCache.get(key)).filter(Boolean);
        return items
            .sort((a, b) => b.hits - a.hits)
            .slice(0, limit)
            .map(item => ({
                query: item.query,
                hits: item.hits,
                lastAccessed: item.lastAccessed
            }));
    }
};

/**
 * Document cache functions
 */
const DocumentCache = {
    get: (filePath) => {
        const key = generateHash(filePath);
        return documentCache.get(key);
    },

    set: (filePath, data) => {
        const key = generateHash(filePath);
        return documentCache.set(key, data);
    },

    has: (filePath) => {
        const key = generateHash(filePath);
        return documentCache.has(key);
    },

    delete: (filePath) => {
        const key = generateHash(filePath);
        return documentCache.del(key);
    },

    clear: () => {
        return documentCache.flushAll();
    },

    stats: () => {
        return documentCache.getStats();
    }
};

/**
 * Clear all caches
 */
function clearAllCaches() {
    embeddingCache.flushAll();
    queryCache.flushAll();
    documentCache.flushAll();
}

/**
 * Get combined cache statistics
 */
function getAllStats() {
    return {
        embedding: embeddingCache.getStats(),
        query: queryCache.getStats(),
        document: documentCache.getStats()
    };
}

module.exports = {
    EmbeddingCache,
    QueryCache,
    DocumentCache,
    clearAllCaches,
    getAllStats,
    generateHash
};
