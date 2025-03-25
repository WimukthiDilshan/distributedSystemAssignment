const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// Public Routes
router.get('/', (req, res) => {
  res.status(200).json({ message: 'Welcome to the Food Delivery API Gateway' });
});

// Protected Route Example
router.get('/protected', authMiddleware, (req, res) => {
  res.status(200).json({ 
    message: 'This is a protected route', 
    userId: req.userId 
  });
});

module.exports = router; 