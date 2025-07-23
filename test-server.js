const express = require('express');
require('dotenv').config();

const app = express();

// Try to identify which route is causing the issue
console.log('Testing basic server setup...');

// Basic middleware
app.use(express.json());

// Test basic route
app.get('/test', (req, res) => {
    res.json({ message: 'Test route working' });
});

// Try to load routes one by one
try {
    console.log('Loading auth routes...');
    const authRoutes = require('./src/routes/auth');
    app.use('/api/auth', authRoutes);
    console.log('✅ Auth routes loaded successfully');
} catch (error) {
    console.error('❌ Error loading auth routes:', error.message);
}

try {
    console.log('Loading company routes...');
    const companyRoutes = require('./src/routes/company');
    app.use('/api/company', companyRoutes);
    console.log('✅ Company routes loaded successfully');
} catch (error) {
    console.error('❌ Error loading company routes:', error.message);
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Test server running on port ${PORT}`);
});
