const User = require('../models/User');
const { generateToken, generateRefreshToken } = require('../utils/jwt');

const register = async (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body;


        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({
                error: 'Email already exists',
                message: 'An account with this email already exists'
            });
        }

   
        const user = new User({
            email,
            password,
            firstName,
            lastName
        });

        await user.save();

        const tokenPayload = {
            userId: user._id,
            email: user.email,
            role: user.role
        };

        const token = generateToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);

        res.status(201).json({
            message: 'Registration successful',
            user: user.toProfile(),
            token,
            refreshToken
        });

    } catch (error) {
        console.error('Registration error:', error);

        if (error.code === 11000) {
            return res.status(409).json({
                error: 'Email already exists',
                message: 'An account with this email already exists'
            });
        }

        res.status(500).json({
            error: 'Registration failed',
            message: 'An error occurred during registration'
        });
    }
};


const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({
                error: 'Invalid credentials',
                message: 'Email or password is incorrect'
            });
        }

        if (!user.isActive) {
            return res.status(401).json({
                error: 'Account inactive',
                message: 'Your account has been deactivated'
            });
        }

    
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                error: 'Invalid credentials',
                message: 'Email or password is incorrect'
            });
        }

 
        const tokenPayload = {
            userId: user._id,
            email: user.email,
            role: user.role
        };

        const token = generateToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);

    
        user.lastLogin = new Date();
        await user.save();

        res.json({
            message: 'Login successful',
            user: user.toProfile(),
            token,
            refreshToken
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Login failed',
            message: 'An error occurred during login'
        });
    }
};


const getProfile = async (req, res) => {
    try {

        res.json({
            user: req.user.toProfile()
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            error: 'Failed to get profile',
            message: 'An error occurred while fetching profile'
        });
    }
};

const updateProfile = async (req, res) => {
    try {
        const { firstName, lastName } = req.body;
        const userId = req.user._id;


        if (!firstName || !lastName) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'First name and last name are required'
            });
        }


        const user = await User.findByIdAndUpdate(
            userId,
            { firstName, lastName },
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({
                error: 'User not found'
            });
        }

        res.json({
            message: 'Profile updated successfully',
            user: user.toProfile()
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            error: 'Failed to update profile',
            message: 'An error occurred while updating profile'
        });
    }
};


const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user._id;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'Current password and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                error: 'Invalid password',
                message: 'New password must be at least 6 characters long'
            });
        }

  
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                error: 'User not found'
            });
        }

        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
            return res.status(401).json({
                error: 'Invalid current password'
            });
        }

   
        user.password = newPassword;
        await user.save();

        res.json({
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            error: 'Failed to change password',
            message: 'An error occurred while changing password'
        });
    }
};

const refreshToken = async (req, res) => {
    try {
       
        const tokenPayload = {
            userId: req.user._id,
            email: req.user.email,
            role: req.user.role
        };

        const newToken = generateToken(tokenPayload);

        res.json({
            message: 'Token refreshed successfully',
            token: newToken
        });

    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(500).json({
            error: 'Failed to refresh token',
            message: 'An error occurred while refreshing token'
        });
    }
};


const logout = async (req, res) => {
    try {
        
        res.json({
            message: 'Logout successful'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            error: 'Logout failed',
            message: 'An error occurred during logout'
        });
    }
};

module.exports = {
    register,
    login,
    getProfile,
    updateProfile,
    changePassword,
    refreshToken,
    logout
};
