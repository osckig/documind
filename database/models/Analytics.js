const { db } = require('../init');

class Analytics {
    /**
     * Track an event
     */
    static track(eventType, eventData, userId = null) {
        const stmt = db.prepare(`
            INSERT INTO analytics (user_id, event_type, event_data)
            VALUES (?, ?, ?)
        `);

        const data = eventData ? JSON.stringify(eventData) : null;

        return stmt.run(userId, eventType, data);
    }

    /**
     * Get events by type
     */
    static getByType(eventType, limit = 100) {
        const stmt = db.prepare(`
            SELECT * FROM analytics
            WHERE event_type = ?
            ORDER BY created_at DESC
            LIMIT ?
        `);
        const events = stmt.all(eventType, limit);
        return events.map(event => {
            if (event.event_data) event.event_data = JSON.parse(event.event_data);
            return event;
        });
    }

    /**
     * Get events by user
     */
    static getByUser(userId, limit = 100) {
        const stmt = db.prepare(`
            SELECT * FROM analytics
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        `);
        const events = stmt.all(userId, limit);
        return events.map(event => {
            if (event.event_data) event.event_data = JSON.parse(event.event_data);
            return event;
        });
    }

    /**
     * Get event counts by type
     */
    static getEventCounts(startDate = null, endDate = null) {
        let query = `
            SELECT event_type, COUNT(*) as count
            FROM analytics
        `;

        const params = [];
        const conditions = [];

        if (startDate) {
            conditions.push('created_at >= ?');
            params.push(startDate);
        }

        if (endDate) {
            conditions.push('created_at <= ?');
            params.push(endDate);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' GROUP BY event_type ORDER BY count DESC';

        const stmt = db.prepare(query);
        return stmt.all(...params);
    }

    /**
     * Get dashboard stats
     */
    static getDashboardStats() {
        // Total events
        const totalEvents = db.prepare('SELECT COUNT(*) as count FROM analytics').get().count;

        // Events by type
        const eventsByType = this.getEventCounts();

        // Events in last 24 hours
        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const recentEvents = db.prepare('SELECT COUNT(*) as count FROM analytics WHERE created_at >= ?').get(last24Hours).count;

        // Most active users
        const activeUsers = db.prepare(`
            SELECT user_id, COUNT(*) as event_count
            FROM analytics
            WHERE user_id IS NOT NULL
            GROUP BY user_id
            ORDER BY event_count DESC
            LIMIT 10
        `).all();

        return {
            totalEvents,
            eventsByType,
            recentEvents,
            activeUsers
        };
    }

    /**
     * Delete old events
     */
    static deleteOlderThan(days) {
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        const stmt = db.prepare('DELETE FROM analytics WHERE created_at < ?');
        return stmt.run(cutoffDate);
    }
}

module.exports = Analytics;
