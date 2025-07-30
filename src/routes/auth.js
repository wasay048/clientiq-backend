const express = require('express');
const router = express.Router();

const {
    register,
    login,
    getProfile,
    updateProfile,
    changePassword,
    refreshToken,
    logout
} = require('../controllers/authController');

const { authenticate } = require('../middleware/auth');
const {
    validateRegistration,
    validateLogin,
    sanitizeInput
} = require('../middleware/validation');

// public means these routes can be accessed without token
router.post('/register', sanitizeInput, validateRegistration, register);
router.post('/login', sanitizeInput, validateLogin, login);

// token compulsory for these routes
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, sanitizeInput, updateProfile);
router.put('/password', authenticate, sanitizeInput, changePassword);
router.post('/refresh', authenticate, refreshToken);
router.post('/logout', authenticate, logout);

module.exports = router;
