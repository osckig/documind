const { db } = require('../init');

class Chunk {
    /**
     * Create a new chunk
     */
    static create(data) {
        const stmt = db.prepare(`
            INSERT INTO chunks (document_id, chunk_index, text, embedding, metadata)
            VALUES (?, ?, ?, ?, ?)
        `);

        const embedding = data.embedding ? Buffer.from(JSON.stringify(data.embedding)) : null;
        const metadata = data.metadata ? JSON.stringify(data.metadata) : null;

        const result = stmt.run(
            data.documentId,
            data.chunkIndex,
            data.text,
            embedding,
            metadata
        );

        return this.findById(result.lastInsertRowid);
    }

    /**
     * Create multiple chunks at once
     */
    static createMany(chunks) {
        const stmt = db.prepare(`
            INSERT INTO chunks (document_id, chunk_index, text, embedding, metadata)
            VALUES (?, ?, ?, ?, ?)
        `);

        const transaction = db.transaction((chunks) => {
            for (const chunk of chunks) {
                const embedding = chunk.embedding ? Buffer.from(JSON.stringify(chunk.embedding)) : null;
                const metadata = chunk.metadata ? JSON.stringify(chunk.metadata) : null;

                stmt.run(
                    chunk.documentId,
                    chunk.chunkIndex,
                    chunk.text,
                    embedding,
                    metadata
                );
            }
        });

        transaction(chunks);
    }

    /**
     * Find chunk by ID
     */
    static findById(id) {
        const stmt = db.prepare('SELECT * FROM chunks WHERE id = ?');
        const chunk = stmt.get(id);
        return this._parseChunk(chunk);
    }

    /**
     * Find chunks by document ID
     */
    static findByDocumentId(documentId) {
        const stmt = db.prepare('SELECT * FROM chunks WHERE document_id = ? ORDER BY chunk_index');
        const chunks = stmt.all(documentId);
        return chunks.map(chunk => this._parseChunk(chunk));
    }

    /**
     * Find all chunks with pagination
     */
    static findAll(page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        const stmt = db.prepare(`
            SELECT c.*, d.original_filename as doc_name
            FROM chunks c
            JOIN documents d ON c.document_id = d.id
            ORDER BY c.created_at DESC
            LIMIT ? OFFSET ?
        `);
        const chunks = stmt.all(limit, offset);
        return chunks.map(chunk => this._parseChunk(chunk));
    }

    /**
     * Get all chunks for search (with embeddings)
     */
    static findAllWithEmbeddings() {
        const stmt = db.prepare(`
            SELECT c.*, d.original_filename as doc_name
            FROM chunks c
            JOIN documents d ON c.document_id = d.id
        `);
        const chunks = stmt.all();
        return chunks.map(chunk => this._parseChunk(chunk));
    }

    /**
     * Update chunk
     */
    static update(id, updates) {
        const fields = [];
        const values = [];

        Object.keys(updates).forEach(key => {
            if (key === 'embedding') {
                fields.push('embedding = ?');
                values.push(Buffer.from(JSON.stringify(updates[key])));
            } else if (key === 'metadata') {
                fields.push('metadata = ?');
                values.push(JSON.stringify(updates[key]));
            } else {
                fields.push(`${key} = ?`);
                values.push(updates[key]);
            }
        });

        values.push(id);

        const stmt = db.prepare(`
            UPDATE chunks
            SET ${fields.join(', ')}
            WHERE id = ?
        `);

        stmt.run(...values);
        return this.findById(id);
    }

    /**
     * Delete chunk
     */
    static delete(id) {
        const stmt = db.prepare('DELETE FROM chunks WHERE id = ?');
        return stmt.run(id);
    }

    /**
     * Delete chunks by document ID
     */
    static deleteByDocumentId(documentId) {
        const stmt = db.prepare('DELETE FROM chunks WHERE document_id = ?');
        return stmt.run(documentId);
    }

    /**
     * Get chunk count
     */
    static count() {
        const stmt = db.prepare('SELECT COUNT(*) as count FROM chunks');
        return stmt.get().count;
    }

    /**
     * Get chunk count by document
     */
    static countByDocument(documentId) {
        const stmt = db.prepare('SELECT COUNT(*) as count FROM chunks WHERE document_id = ?');
        return stmt.get(documentId).count;
    }

    /**
     * Parse chunk data (convert embedding from Buffer)
     */
    static _parseChunk(chunk) {
        if (!chunk) return null;

        if (chunk.embedding) {
            chunk.embedding = JSON.parse(chunk.embedding.toString());
        }
        if (chunk.metadata) {
            chunk.metadata = JSON.parse(chunk.metadata);
        }
        return chunk;
    }
}

module.exports = Chunk;
