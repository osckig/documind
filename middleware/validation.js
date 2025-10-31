const { body, param, query, validationResult } = require('express-validator');
const { AppError } = require('./errorHandler');

/**
 * Validate request and throw error if invalid
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => ({
            field: err.path || err.param,
            message: err.msg
        }));
        throw new AppError('Validation failed', 400, errorMessages);
    }
    next();
};

/**
 * User registration validation
 */
const validateRegistration = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Username can only contain letters, numbers, underscores and hyphens'),
    body('email')
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    validate
];

/**
 * User login validation
 */
const validateLogin = [
    body('username')
        .trim()
        .notEmpty()
        .withMessage('Username is required'),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    validate
];

/**
 * Query validation
 */
const validateQuery = [
    body('query')
        .trim()
        .notEmpty()
        .withMessage('Query is required')
        .isLength({ min: 3, max: 1000 })
        .withMessage('Query must be between 3 and 1000 characters'),
    validate
];

/**
 * Document ID validation
 */
const validateDocumentId = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Invalid document ID'),
    validate
];

/**
 * Pagination validation
 */
const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    validate
];

/**
 * File upload validation (additional checks)
 */
const validateFileUpload = (req, res, next) => {
    if (!req.file) {
        throw new AppError('No file uploaded', 400);
    }

    const allowedMimes = [
        'application/pdf',
        'text/plain',
        'text/markdown',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
        'image/png',
        'image/jpeg',
        'image/jpg'
    ];

    if (!allowedMimes.includes(req.file.mimetype)) {
        throw new AppError('Invalid file type', 400);
    }

    // Additional size check (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (req.file.size > maxSize) {
        throw new AppError('File size exceeds 10MB limit', 400);
    }

    next();
};

module.exports = {
    validate,
    validateRegistration,
    validateLogin,
    validateQuery,
    validateDocumentId,
    validatePagination,
    validateFileUpload
};
