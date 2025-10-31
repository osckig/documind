const { db } = require('../init');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class User {
    /**
     * Create a new user
     */
    static create(username, email, password) {
        const passwordHash = bcrypt.hashSync(password, 10);
        const apiKey = crypto.randomBytes(32).toString('hex');

        const stmt = db.prepare(`
            INSERT INTO users (username, email, password_hash, api_key)
            VALUES (?, ?, ?, ?)
        `);

        const result = stmt.run(username, email, passwordHash, apiKey);
        return this.findById(result.lastInsertRowid);
    }

    /**
     * Find user by ID
     */
    static findById(id) {
        const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
        return stmt.get(id);
    }

    /**
     * Find user by username
     */
    static findByUsername(username) {
        const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
        return stmt.get(username);
    }

    /**
     * Find user by email
     */
    static findByEmail(email) {
        const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
        return stmt.get(email);
    }

    /**
     * Find user by API key
     */
    static findByApiKey(apiKey) {
        const stmt = db.prepare('SELECT * FROM users WHERE api_key = ?');
        return stmt.get(apiKey);
    }

    /**
     * Verify password
     */
    static verifyPassword(user, password) {
        return bcrypt.compareSync(password, user.password_hash);
    }

    /**
     * Update user
     */
    static update(id, updates) {
        const fields = [];
        const values = [];

        Object.keys(updates).forEach(key => {
            if (key === 'password') {
                fields.push('password_hash = ?');
                values.push(bcrypt.hashSync(updates[key], 10));
            } else {
                fields.push(`${key} = ?`);
                values.push(updates[key]);
            }
        });

        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        const stmt = db.prepare(`
            UPDATE users
            SET ${fields.join(', ')}
            WHERE id = ?
        `);

        stmt.run(...values);
        return this.findById(id);
    }

    /**
     * Delete user
     */
    static delete(id) {
        const stmt = db.prepare('DELETE FROM users WHERE id = ?');
        return stmt.run(id);
    }

    /**
     * Get all users
     */
    static findAll() {
        const stmt = db.prepare('SELECT id, username, email, created_at FROM users');
        return stmt.all();
    }
}

module.exports = User;
