/**
 * Advanced chunking strategies for document processing
 */

/**
 * Create semantic chunks based on paragraphs and sentence boundaries
 */
function createSemanticChunks(text, fileName, options = {}) {
    const {
        maxChunkSize = 500,
        minChunkSize = 100,
        overlapSize = 50
    } = options;

    const chunks = [];
    let chunkId = 0;

    // Split by paragraphs first
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);

    let currentChunk = '';
    let currentChunkWords = [];

    paragraphs.forEach((paragraph, paraIndex) => {
        const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];

        sentences.forEach(sentence => {
            const sentenceTrimmed = sentence.trim();
            if (!sentenceTrimmed) return;

            const words = sentenceTrimmed.split(/\s+/);
            const potentialChunk = currentChunkWords.concat(words);

            // Check if adding this sentence would exceed max size
            if (potentialChunk.length > maxChunkSize && currentChunkWords.length >= minChunkSize) {
                // Save current chunk
                chunks.push({
                    id: `${fileName}-${chunkId++}`,
                    docName: fileName,
                    text: currentChunkWords.join(' '),
                    embedding: null,
                    metadata: {
                        chunkIndex: chunkId - 1,
                        wordCount: currentChunkWords.length,
                        paragraphIndex: paraIndex
                    }
                });

                // Start new chunk with overlap
                const overlapWords = currentChunkWords.slice(-overlapSize);
                currentChunkWords = overlapWords.concat(words);
            } else {
                // Add to current chunk
                currentChunkWords = potentialChunk;
            }
        });

        // Add paragraph break marker
        if (currentChunkWords.length > 0) {
            currentChunkWords.push('\n');
        }
    });

    // Add final chunk if it has content
    if (currentChunkWords.length > 0) {
        chunks.push({
            id: `${fileName}-${chunkId}`,
            docName: fileName,
            text: currentChunkWords.join(' ').trim(),
            embedding: null,
            metadata: {
                chunkIndex: chunkId,
                wordCount: currentChunkWords.length
            }
        });
    }

    return chunks;
}

/**
 * Create fixed-size chunks (legacy method)
 */
function createFixedChunks(text, fileName, chunkSize = 500) {
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
                embedding: null,
                metadata: {
                    chunkIndex: chunkId - 1,
                    wordCount: currentChunk.split(/\s+/).length
                }
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
            embedding: null,
            metadata: {
                chunkIndex: chunkId,
                wordCount: currentChunk.split(/\s+/).length
            }
        });
    }

    return chunks;
}

/**
 * Create chunks based on headings (for structured documents)
 */
function createHeadingBasedChunks(text, fileName) {
    const chunks = [];
    let chunkId = 0;

    // Split by common heading patterns
    const sections = text.split(/(?=^#{1,6}\s|^[A-Z][^a-z\n]{3,}$|^\d+\.\s+[A-Z])/m);

    sections.forEach((section, index) => {
        const trimmed = section.trim();
        if (trimmed.length < 50) return; // Skip very small sections

        // Extract heading if present
        const headingMatch = trimmed.match(/^(#{1,6}\s+.+?|[A-Z][^a-z\n]{3,}|\d+\.\s+[A-Z].+?)$/m);
        const heading = headingMatch ? headingMatch[1] : null;

        chunks.push({
            id: `${fileName}-${chunkId++}`,
            docName: fileName,
            text: trimmed,
            embedding: null,
            metadata: {
                chunkIndex: chunkId - 1,
                heading,
                sectionIndex: index,
                wordCount: trimmed.split(/\s+/).length
            }
        });
    });

    return chunks;
}

/**
 * Main chunking function that auto-selects strategy
 */
function createChunks(text, fileName, options = {}) {
    const {
        strategy = 'semantic', // 'semantic', 'fixed', or 'heading'
        maxChunkSize = 500,
        minChunkSize = 100,
        overlapSize = 50
    } = options;

    // Auto-detect if document has headings
    const hasHeadings = /^#{1,6}\s|^[A-Z][^a-z\n]{10,}$|^\d+\.\s+[A-Z]/m.test(text);

    let selectedStrategy = strategy;
    if (strategy === 'auto') {
        selectedStrategy = hasHeadings ? 'heading' : 'semantic';
    }

    switch (selectedStrategy) {
        case 'heading':
            return createHeadingBasedChunks(text, fileName);

        case 'fixed':
            return createFixedChunks(text, fileName, maxChunkSize);

        case 'semantic':
        default:
            return createSemanticChunks(text, fileName, {
                maxChunkSize,
                minChunkSize,
                overlapSize
            });
    }
}

module.exports = {
    createChunks,
    createSemanticChunks,
    createFixedChunks,
    createHeadingBasedChunks
};
