const { verifyToken, extractToken } = require('../utils/jwt');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
    try {
        const token = extractToken(req.headers.authorization);

        if (!token) {
            return res.status(401).json({
                error: 'Access denied',
                message: 'No token provided'
            });
        }


        const decoded = verifyToken(token);


        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            return res.status(401).json({
                error: 'Access denied',
                message: 'Invalid token - user not found'
            });
        }

        if (!user.isActive) {
            return res.status(401).json({
                error: 'Access denied',
                message: 'Account is inactive'
            });
        }


        req.user = user;
        next();

    } catch (error) {
        console.error('Authentication error:', error.message);

        if (error.message.includes('expired')) {
            return res.status(401).json({
                error: 'Token expired',
                message: 'Please login again'
            });
        }

        return res.status(401).json({
            error: 'Access denied',
            message: 'Invalid token'
        });
    }
};


const requirePremium = (req, res, next) => {
    if (req.user.role !== 'premium') {
        return res.status(403).json({
            error: 'Premium required',
            message: 'This feature requires a premium subscription'
        });
    }
    next();
};

const optionalAuth = async (req, res, next) => {
    try {
        const token = extractToken(req.headers.authorization);

        if (token) {
            const decoded = verifyToken(token);
            const user = await User.findById(decoded.userId).select('-password');

            if (user && user.isActive) {
                req.user = user;
            }
        }

        next();
    } catch (error) {
        next();
    }
};

module.exports = {
    authenticate,
    requirePremium,
    optionalAuth
};
