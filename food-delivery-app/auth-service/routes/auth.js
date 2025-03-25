const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');
const authMiddleware = require('../middleware/auth');

// Registration route
router.post('/register', authController.register);

// Login route
router.post('/login', authController.login);

// Logout route (requires authentication)
router.post('/logout', authMiddleware, authController.logout);

// Get authenticated user data
router.get('/me', authMiddleware, authController.getMe);

module.exports = router; 