const fs = require('fs');
const pdf = require('pdf-parse');
const natural = require('natural');
const { Ollama } = require('ollama');

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

// TF-IDF for local embeddings
const TfIdf = natural.TfIdf;
const tfidf = new TfIdf();

/**
 * Process a document file and extract text
 */
async function processDocument(filePath, fileName) {
    let text = '';

    try {
        if (filePath.endsWith('.pdf')) {
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdf(dataBuffer);
            text = data.text;
        } else {
            // Text files
            text = fs.readFileSync(filePath, 'utf-8');
        }

        // Create chunks
        const chunks = createChunks(text, fileName);

        return { text, chunks };

    } catch (error) {
        throw new Error(`Failed to process document: ${error.message}`);
    }
}

/**
 * Create text chunks from document
 */
function createChunks(text, fileName, chunkSize = 500) {
    const chunks = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let currentChunk = '';
    let chunkId = 0;

    sentences.forEach(sentence => {
        if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
            chunks.push({
                id: `${fileName}-${chunkId++}`,
                docName: fileName,
                text: currentChunk.trim(),
                embedding: null
            });
            currentChunk = sentence;
        } else {
            currentChunk += sentence;
        }
    });

    if (currentChunk.trim().length > 0) {
        chunks.push({
            id: `${fileName}-${chunkId}`,
            docName: fileName,
            text: currentChunk.trim(),
            embedding: null
        });
    }

    return chunks;
}

/**
 * Generate embedding for text
 */
async function generateEmbedding(text) {
    try {
        if (AI_PROVIDER === 'openai' && openai) {
            // Use OpenAI embeddings
            const response = await openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: text
            });
            return response.data[0].embedding;

        } else if (AI_PROVIDER === 'cohere' && cohere) {
            // Use Cohere embeddings
            const response = await cohere.embed({
                texts: [text],
                model: 'embed-english-v3.0',
                inputType: 'search_query'
            });
            return response.embeddings[0];

        } else {
            // Use local TF-IDF based embeddings
            return generateLocalEmbedding(text);
        }

    } catch (error) {
        console.warn('Embedding generation failed, using local fallback:', error.message);
        return generateLocalEmbedding(text);
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
    features.forEach((([word, count], index) => {
        if (index < 100) {
            embedding[index] = count / words.length; // Normalize
        }
    }));

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
 * Search for similar chunks using vector similarity
 */
function searchSimilar(queryEmbedding, chunks, topK = 5) {
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
 * Generate answer from retrieved chunks
 */
async function generateAnswer(query, chunks) {
    if (chunks.length === 0 || chunks[0].score < 0.1) {
        return "I couldn't find relevant information to answer your question. Please try rephrasing or upload more relevant documents.";
    }

    try {
        const context = chunks.slice(0, 3).map(c => c.text).join('\n\n---\n\n');

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
                    temperature: 0.7,
                    num_predict: 300,
                    top_k: 40,
                    top_p: 0.9
                }
            });

            return response.response.trim();

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
                max_tokens: 300,
                temperature: 0.7
            });

            return response.choices[0].message.content.trim();

        } else if (AI_PROVIDER === 'cohere' && cohere) {
            // Use Cohere for answer generation
            const response = await cohere.generate({
                prompt: `Context:\n${context}\n\nQuestion: ${query}\n\nAnswer the question based only on the context provided:`,
                maxTokens: 300,
                temperature: 0.7
            });

            return response.generations[0].text.trim();

        } else {
            // Local fallback - return most relevant chunks
            const topChunks = chunks.slice(0, 2);
            return topChunks.map(c => c.text).join('\n\n');
        }

    } catch (error) {
        console.warn('Answer generation failed, using local fallback:', error.message);
        const topChunks = chunks.slice(0, 2);
        return topChunks.map(c => c.text).join('\n\n');
    }
}

module.exports = {
    processDocument,
    createChunks,
    generateEmbedding,
    searchSimilar,
    generateAnswer,
    cosineSimilarity
};
