const jwt = require('jsonwebtoken');
const { User } = require('../database/models');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate JWT token
 */
function generateToken(user) {
    return jwt.sign(
        {
            id: user.id,
            username: user.username,
            email: user.email
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

/**
 * Verify JWT token middleware
 */
function authenticateToken(req, res, next) {
    // Get token from header or query
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        // Check for API key as fallback
        return authenticateApiKey(req, res, next);
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }

        req.user = user;
        next();
    });
}

/**
 * API Key authentication
 */
function authenticateApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;

    if (!apiKey) {
        return res.status(401).json({ error: 'Authentication required. Provide token or API key.' });
    }

    const user = User.findByApiKey(apiKey);

    if (!user) {
        return res.status(403).json({ error: 'Invalid API key' });
    }

    req.user = {
        id: user.id,
        username: user.username,
        email: user.email
    };

    next();
}

/**
 * Optional authentication - doesn't fail if no auth provided
 */
function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const apiKey = req.headers['x-api-key'] || req.query.api_key;

    if (token) {
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (!err) {
                req.user = user;
            }
        });
    } else if (apiKey) {
        const user = User.findByApiKey(apiKey);
        if (user) {
            req.user = {
                id: user.id,
                username: user.username,
                email: user.email
            };
        }
    }

    next();
}

module.exports = {
    generateToken,
    authenticateToken,
    authenticateApiKey,
    optionalAuth,
    JWT_SECRET
};
