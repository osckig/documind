const fs = require('fs');
const natural = require('natural');
const { Ollama } = require('ollama');
const { EmbeddingCache, QueryCache } = require('./cache');
const { processDocument } = require('./fileProcessors');
const { createChunks } = require('./chunking');

// OpenAI, Cohere, and Ollama setup
let openai, cohere, ollama;
const AI_PROVIDER = process.env.AI_PROVIDER || 'ollama';

// Initialize Ollama
ollama = new Ollama({ host: process.env.OLLAMA_HOST || 'http://localhost:11434' });

if (AI_PROVIDER === 'openai' && process.env.OPENAI_API_KEY) {
    const { OpenAI } = require('openai');
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

if (AI_PROVIDER === 'cohere' && process.env.COHERE_API_KEY) {
    const { CohereClient } = require('cohere-ai');
    cohere = new CohereClient({ token: process.env.COHERE_API_KEY });
}

// TF-IDF for local embeddings and keyword search
const TfIdf = natural.TfIdf;
const tfidf = new TfIdf();

/**
 * Process a document file and extract text with enhanced file type support
 */
async function processDocumentEnhanced(filePath, fileName) {
    try {
        const fileType = fileName.substring(fileName.lastIndexOf('.'));
        const { text, metadata } = await processDocument(filePath, fileName, fileType);

        // Create chunks using semantic chunking
        const chunks = createChunks(text, fileName, {
            strategy: 'semantic',
            maxChunkSize: 500,
            minChunkSize: 100,
            overlapSize: 50
        });

        return { text, chunks, metadata };

    } catch (error) {
        throw new Error(`Failed to process document: ${error.message}`);
    }
}

/**
 * Generate embedding for text with caching
 */
async function generateEmbedding(text) {
    // Check cache first
    if (EmbeddingCache.has(text)) {
        return EmbeddingCache.get(text);
    }

    try {
        let embedding;

        if (AI_PROVIDER === 'openai' && openai) {
            // Use OpenAI embeddings
            const response = await openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: text
            });
            embedding = response.data[0].embedding;

        } else if (AI_PROVIDER === 'cohere' && cohere) {
            // Use Cohere embeddings
            const response = await cohere.embed({
                texts: [text],
                model: 'embed-english-v3.0',
                inputType: 'search_query'
            });
            embedding = response.embeddings[0];

        } else {
            // Use local TF-IDF based embeddings
            embedding = generateLocalEmbedding(text);
        }

        // Cache the embedding
        EmbeddingCache.set(text, embedding);

        return embedding;

    } catch (error) {
        console.warn('Embedding generation failed, using local fallback:', error.message);
        const embedding = generateLocalEmbedding(text);
        EmbeddingCache.set(text, embedding);
        return embedding;
    }
}

/**
 * Generate local TF-IDF based embedding
 */
function generateLocalEmbedding(text) {
    // Preprocess text
    const words = text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2);

    // Create a simple word frequency vector
    const wordCount = {};
    words.forEach(word => {
        wordCount[word] = (wordCount[word] || 0) + 1;
    });

    // Get top words as features
    const features = Object.entries(wordCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 100);

    // Create embedding vector (simplified)
    const embedding = new Array(100).fill(0);
    features.forEach(([word, count], index) => {
        if (index < 100) {
            embedding[index] = count / words.length; // Normalize
        }
    });

    return embedding;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
        return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Keyword-based search using TF-IDF
 */
function keywordSearch(query, chunks, topK = 10) {
    const tokenizer = new natural.WordTokenizer();
    const queryTokens = tokenizer.tokenize(query.toLowerCase());

    const scores = chunks.map(chunk => {
        const chunkTokens = tokenizer.tokenize(chunk.text.toLowerCase());

        // Calculate term frequency
        let score = 0;
        queryTokens.forEach(token => {
            const count = chunkTokens.filter(t => t === token).length;
            score += count;
        });

        // Boost exact phrase matches
        if (chunk.text.toLowerCase().includes(query.toLowerCase())) {
            score *= 2;
        }

        return {
            ...chunk,
            keywordScore: score / chunkTokens.length
        };
    });

    return scores
        .filter(chunk => chunk.keywordScore > 0)
        .sort((a, b) => b.keywordScore - a.keywordScore)
        .slice(0, topK);
}

/**
 * Hybrid search combining vector similarity and keyword matching
 */
function hybridSearch(queryEmbedding, query, chunks, topK = 5) {
    // Vector similarity search
    const vectorScored = chunks.map(chunk => ({
        ...chunk,
        vectorScore: cosineSimilarity(queryEmbedding, chunk.embedding)
    }));

    // Keyword search
    const keywordScored = keywordSearch(query, chunks, chunks.length);

    // Combine scores (weighted average)
    const vectorWeight = 0.7;
    const keywordWeight = 0.3;

    const combined = vectorScored.map(vChunk => {
        const kChunk = keywordScored.find(k => k.id === vChunk.id);
        const keyScore = kChunk ? kChunk.keywordScore : 0;

        return {
            ...vChunk,
            keywordScore: keyScore,
            hybridScore: (vChunk.vectorScore * vectorWeight) + (keyScore * keywordWeight)
        };
    });

    return combined
        .sort((a, b) => b.hybridScore - a.hybridScore)
        .slice(0, topK)
        .filter(chunk => chunk.hybridScore > 0);
}

/**
 * Search for similar chunks (with hybrid search option)
 */
function searchSimilar(queryEmbedding, query, chunks, topK = 5, useHybrid = true) {
    if (useHybrid && query) {
        return hybridSearch(queryEmbedding, query, chunks, topK);
    }

    // Standard vector search
    const scored = chunks.map(chunk => ({
        ...chunk,
        score: cosineSimilarity(queryEmbedding, chunk.embedding)
    }));

    return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .filter(chunk => chunk.score > 0);
}

/**
 * Generate answer from retrieved chunks with caching
 */
async function generateAnswer(query, chunks, options = {}) {
    const { useCache = true, temperature = 0.7, maxTokens = 300 } = options;

    // Check cache first
    if (useCache && QueryCache.has(query)) {
        const cached = QueryCache.get(query);
        return {
            answer: cached.result.answer,
            cached: true,
            cacheHits: cached.hits
        };
    }

    if (chunks.length === 0 || chunks[0].score < 0.1) {
        return {
            answer: "I couldn't find relevant information to answer your question. Please try rephrasing or upload more relevant documents.",
            cached: false
        };
    }

    try {
        const context = chunks.slice(0, 3).map(c => c.text).join('\n\n---\n\n');
        let answer;

        if (AI_PROVIDER === 'ollama') {
            // Use Ollama with Mistral for answer generation
            const prompt = `You are an intelligent document analysis assistant. Answer the question based ONLY on the provided context. Be concise, accurate, and insightful.

Context from documents:
${context}

Question: ${query}

Answer:`;

            const response = await ollama.generate({
                model: process.env.OLLAMA_MODEL || 'mistral',
                prompt: prompt,
                stream: false,
                options: {
                    temperature,
                    num_predict: maxTokens,
                    top_k: 40,
                    top_p: 0.9
                }
            });

            answer = response.response.trim();

        } else if (AI_PROVIDER === 'openai' && openai) {
            // Use OpenAI for answer generation
            const response = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant that answers questions based on the provided context. Only use information from the context.'
                    },
                    {
                        role: 'user',
                        content: `Context:\n${context}\n\nQuestion: ${query}\n\nAnswer:`
                    }
                ],
                max_tokens: maxTokens,
                temperature
            });

            answer = response.choices[0].message.content.trim();

        } else if (AI_PROVIDER === 'cohere' && cohere) {
            // Use Cohere for answer generation
            const response = await cohere.generate({
                prompt: `Context:\n${context}\n\nQuestion: ${query}\n\nAnswer the question based only on the context provided:`,
                maxTokens,
                temperature
            });

            answer = response.generations[0].text.trim();

        } else {
            // Local fallback - return most relevant chunks
            const topChunks = chunks.slice(0, 2);
            answer = topChunks.map(c => c.text).join('\n\n');
        }

        // Cache the result
        if (useCache) {
            QueryCache.set(query, { answer });
        }

        return {
            answer,
            cached: false
        };

    } catch (error) {
        console.warn('Answer generation failed, using local fallback:', error.message);
        const topChunks = chunks.slice(0, 2);
        return {
            answer: topChunks.map(c => c.text).join('\n\n'),
            cached: false,
            error: error.message
        };
    }
}

/**
 * Summarize a document
 */
async function summarizeDocument(text, maxLength = 200) {
    try {
        if (AI_PROVIDER === 'ollama') {
            const response = await ollama.generate({
                model: process.env.OLLAMA_MODEL || 'mistral',
                prompt: `Summarize the following document in ${maxLength} words or less:\n\n${text}\n\nSummary:`,
                stream: false,
                options: {
                    temperature: 0.5,
                    num_predict: maxLength
                }
            });

            return response.response.trim();

        } else if (AI_PROVIDER === 'openai' && openai) {
            const response = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant that creates concise summaries.'
                    },
                    {
                        role: 'user',
                        content: `Summarize the following document in ${maxLength} words or less:\n\n${text}`
                    }
                ],
                max_tokens: maxLength,
                temperature: 0.5
            });

            return response.choices[0].message.content.trim();
        }

        // Fallback: return first few sentences
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        return sentences.slice(0, 3).join(' ').substring(0, maxLength * 5) + '...';

    } catch (error) {
        console.warn('Summarization failed:', error.message);
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        return sentences.slice(0, 3).join(' ').substring(0, maxLength * 5) + '...';
    }
}

module.exports = {
    processDocument: processDocumentEnhanced,
    createChunks,
    generateEmbedding,
    searchSimilar,
    generateAnswer,
    cosineSimilarity,
    hybridSearch,
    keywordSearch,
    summarizeDocument
};
