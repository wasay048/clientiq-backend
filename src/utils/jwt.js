const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * @param {Object} payload - User data to include in token
 * @returns {String} JWT token
 */
const generateToken = (payload) => {
    try {
        return jwt.sign(payload, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN,
            issuer: 'clientiq-api',
            audience: 'clientiq-app'
        });
    } catch (error) {
        throw new Error('Token generation failed');
    }
};

/**
 * @param {String} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET, {
            issuer: 'clientiq-api',
            audience: 'clientiq-app'
        });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token has expired');
        } else if (error.name === 'JsonWebTokenError') {
            throw new Error('Invalid token');
        } else {
            throw new Error('Token verification failed');
        }
    }
};

/**
 * @param {String} authHeader - Authorization header value
 * @returns {String|null} JWT token or null
 */
const extractToken = (authHeader) => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.substring(7);
};

/**
 * @param {Object} payload - User data to include in token
 * @returns {String} Refresh token
 */
const generateRefreshToken = (payload) => {
    try {
        return jwt.sign(payload, JWT_SECRET, {
            expiresIn: '30d',
            issuer: 'clientiq-api',
            audience: 'clientiq-refresh'
        });
    } catch (error) {
        throw new Error('Refresh token generation failed');
    }
};

/**
 * @param {String} token - Refresh token to verify
 * @returns {Object} Decoded token payload
 */
const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET, {
            issuer: 'clientiq-api',
            audience: 'clientiq-refresh'
        });
    } catch (error) {
        throw new Error('Invalid refresh token');
    }
};

module.exports = {
    generateToken,
    verifyToken,
    extractToken,
    generateRefreshToken,
    verifyRefreshToken
};
