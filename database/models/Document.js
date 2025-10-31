const { db } = require('../init');

class Document {
    /**
     * Create a new document
     */
    static create(data) {
        const stmt = db.prepare(`
            INSERT INTO documents (user_id, filename, original_filename, file_path, file_type, file_size, content, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const metadata = data.metadata ? JSON.stringify(data.metadata) : null;

        const result = stmt.run(
            data.userId || null,
            data.filename,
            data.originalFilename,
            data.filePath,
            data.fileType,
            data.fileSize,
            data.content,
            metadata
        );

        return this.findById(result.lastInsertRowid);
    }

    /**
     * Find document by ID
     */
    static findById(id) {
        const stmt = db.prepare('SELECT * FROM documents WHERE id = ?');
        const doc = stmt.get(id);
        if (doc && doc.metadata) {
            doc.metadata = JSON.parse(doc.metadata);
        }
        return doc;
    }

    /**
     * Find documents by user ID
     */
    static findByUserId(userId) {
        const stmt = db.prepare('SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC');
        const docs = stmt.all(userId);
        return docs.map(doc => {
            if (doc.metadata) doc.metadata = JSON.parse(doc.metadata);
            return doc;
        });
    }

    /**
     * Find all documents
     */
    static findAll() {
        const stmt = db.prepare('SELECT * FROM documents ORDER BY created_at DESC');
        const docs = stmt.all();
        return docs.map(doc => {
            if (doc.metadata) doc.metadata = JSON.parse(doc.metadata);
            return doc;
        });
    }

    /**
     * Update document
     */
    static update(id, updates) {
        const fields = [];
        const values = [];

        Object.keys(updates).forEach(key => {
            if (key === 'metadata') {
                fields.push('metadata = ?');
                values.push(JSON.stringify(updates[key]));
            } else {
                fields.push(`${key} = ?`);
                values.push(updates[key]);
            }
        });

        values.push(id);

        const stmt = db.prepare(`
            UPDATE documents
            SET ${fields.join(', ')}
            WHERE id = ?
        `);

        stmt.run(...values);
        return this.findById(id);
    }

    /**
     * Delete document
     */
    static delete(id) {
        const stmt = db.prepare('DELETE FROM documents WHERE id = ?');
        return stmt.run(id);
    }

    /**
     * Get document count
     */
    static count() {
        const stmt = db.prepare('SELECT COUNT(*) as count FROM documents');
        return stmt.get().count;
    }

    /**
     * Get document count by user
     */
    static countByUser(userId) {
        const stmt = db.prepare('SELECT COUNT(*) as count FROM documents WHERE user_id = ?');
        return stmt.get(userId).count;
    }

    /**
     * Search documents by filename
     */
    static searchByFilename(query) {
        const stmt = db.prepare('SELECT * FROM documents WHERE original_filename LIKE ? ORDER BY created_at DESC');
        const docs = stmt.all(`%${query}%`);
        return docs.map(doc => {
            if (doc.metadata) doc.metadata = JSON.parse(doc.metadata);
            return doc;
        });
    }
}

module.exports = Document;
