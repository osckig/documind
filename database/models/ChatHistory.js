const { db } = require('../init');

class ChatHistory {
    /**
     * Create a new chat entry
     */
    static create(data) {
        const stmt = db.prepare(`
            INSERT INTO chat_history (user_id, session_id, query, answer, sources)
            VALUES (?, ?, ?, ?, ?)
        `);

        const sources = data.sources ? JSON.stringify(data.sources) : null;

        const result = stmt.run(
            data.userId || null,
            data.sessionId,
            data.query,
            data.answer,
            sources
        );

        return this.findById(result.lastInsertRowid);
    }

    /**
     * Find chat by ID
     */
    static findById(id) {
        const stmt = db.prepare('SELECT * FROM chat_history WHERE id = ?');
        const chat = stmt.get(id);
        if (chat && chat.sources) {
            chat.sources = JSON.parse(chat.sources);
        }
        return chat;
    }

    /**
     * Find chats by session ID
     */
    static findBySessionId(sessionId) {
        const stmt = db.prepare('SELECT * FROM chat_history WHERE session_id = ? ORDER BY created_at ASC');
        const chats = stmt.all(sessionId);
        return chats.map(chat => {
            if (chat.sources) chat.sources = JSON.parse(chat.sources);
            return chat;
        });
    }

    /**
     * Find chats by user ID
     */
    static findByUserId(userId, limit = 50) {
        const stmt = db.prepare('SELECT * FROM chat_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?');
        const chats = stmt.all(userId, limit);
        return chats.map(chat => {
            if (chat.sources) chat.sources = JSON.parse(chat.sources);
            return chat;
        });
    }

    /**
     * Get all sessions for a user
     */
    static getUserSessions(userId) {
        const stmt = db.prepare(`
            SELECT DISTINCT session_id, MIN(created_at) as started_at, MAX(created_at) as last_message_at, COUNT(*) as message_count
            FROM chat_history
            WHERE user_id = ?
            GROUP BY session_id
            ORDER BY last_message_at DESC
        `);
        return stmt.all(userId);
    }

    /**
     * Delete chat entry
     */
    static delete(id) {
        const stmt = db.prepare('DELETE FROM chat_history WHERE id = ?');
        return stmt.run(id);
    }

    /**
     * Delete session
     */
    static deleteSession(sessionId) {
        const stmt = db.prepare('DELETE FROM chat_history WHERE session_id = ?');
        return stmt.run(sessionId);
    }

    /**
     * Get recent queries
     */
    static getRecentQueries(limit = 10) {
        const stmt = db.prepare('SELECT query, answer, created_at FROM chat_history ORDER BY created_at DESC LIMIT ?');
        return stmt.all(limit);
    }
}

module.exports = ChatHistory;
