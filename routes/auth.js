const express = require('express');
const router = express.Router();
const { User } = require('../database/models');
const { generateToken, authenticateToken } = require('../middleware/auth');
const { validateRegistration, validateLogin } = require('../middleware/validation');
const { authLimiter } = require('../middleware/rateLimiter');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { Analytics } = require('../database/models');

/**
 * Register a new user
 * POST /api/auth/register
 */
router.post('/register', authLimiter, validateRegistration, asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = User.findByUsername(username) || User.findByEmail(email);

    if (existingUser) {
        throw new AppError('Username or email already exists', 400);
    }

    // Create user
    const user = User.create(username, email, password);

    // Track event
    Analytics.track('user_registered', { userId: user.id }, user.id);

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            apiKey: user.api_key
        },
        token
    });
}));

/**
 * Login user
 * POST /api/auth/login
 */
router.post('/login', authLimiter, validateLogin, asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    // Find user
    const user = User.findByUsername(username);

    if (!user) {
        throw new AppError('Invalid credentials', 401);
    }

    // Verify password
    const isValidPassword = User.verifyPassword(user, password);

    if (!isValidPassword) {
        throw new AppError('Invalid credentials', 401);
    }

    // Track event
    Analytics.track('user_login', { userId: user.id }, user.id);

    // Generate token
    const token = generateToken(user);

    res.json({
        success: true,
        message: 'Login successful',
        user: {
            id: user.id,
            username: user.username,
            email: user.email
        },
        token
    });
}));

/**
 * Get current user profile
 * GET /api/auth/me
 */
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
    const user = User.findById(req.user.id);

    if (!user) {
        throw new AppError('User not found', 404);
    }

    res.json({
        success: true,
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            apiKey: user.api_key,
            createdAt: user.created_at
        }
    });
}));

/**
 * Refresh API key
 * POST /api/auth/refresh-api-key
 */
router.post('/refresh-api-key', authenticateToken, asyncHandler(async (req, res) => {
    const crypto = require('crypto');
    const newApiKey = crypto.randomBytes(32).toString('hex');

    User.update(req.user.id, { api_key: newApiKey });

    // Track event
    Analytics.track('api_key_refreshed', { userId: req.user.id }, req.user.id);

    res.json({
        success: true,
        message: 'API key refreshed successfully',
        apiKey: newApiKey
    });
}));

/**
 * Update user profile
 * PUT /api/auth/profile
 */
router.put('/profile', authenticateToken, asyncHandler(async (req, res) => {
    const { email } = req.body;
    const updates = {};

    if (email) {
        // Check if email is already in use by another user
        const existingUser = User.findByEmail(email);
        if (existingUser && existingUser.id !== req.user.id) {
            throw new AppError('Email already in use', 400);
        }
        updates.email = email;
    }

    const updatedUser = User.update(req.user.id, updates);

    res.json({
        success: true,
        message: 'Profile updated successfully',
        user: {
            id: updatedUser.id,
            username: updatedUser.username,
            email: updatedUser.email
        }
    });
}));

/**
 * Change password
 * POST /api/auth/change-password
 */
router.post('/change-password', authenticateToken, asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        throw new AppError('Current password and new password are required', 400);
    }

    if (newPassword.length < 6) {
        throw new AppError('New password must be at least 6 characters long', 400);
    }

    // Verify current password
    const user = User.findById(req.user.id);
    const isValidPassword = User.verifyPassword(user, currentPassword);

    if (!isValidPassword) {
        throw new AppError('Current password is incorrect', 401);
    }

    // Update password
    User.update(req.user.id, { password: newPassword });

    // Track event
    Analytics.track('password_changed', { userId: req.user.id }, req.user.id);

    res.json({
        success: true,
        message: 'Password changed successfully'
    });
}));

module.exports = router;
