const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const jwt = require('jsonwebtoken');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'API Gateway is up and running!' });
});

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('Handling /api/auth/register');
    console.log('Request body:', req.body);
    
    const response = await axios.post(
      `http://auth-service:3001/api/auth/register`,
      req.body,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Auth service response:', response.data);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error forwarding register request:', error.message);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        message: 'Internal Server Error'
      });
    }
  }
});

// Add direct route for auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('Handling /api/auth/login');
    console.log('Request body:', req.body);
    
    const response = await axios.post(
      `http://auth-service:3001/api/auth/login`,
      req.body,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Auth service login response:', response.data);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error forwarding login request:', error.message);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        message: 'Internal Server Error'
      });
    }
  }
});

// User Routes
app.get('/api/users/profile', async (req, res) => {
  console.log('Handling /api/users/profile');
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ message: 'Authorization token is required' });
    }
    
    console.log('Token:', token);
    
    // Extract user ID from token
    const tokenParts = token.split(' ')[1];
    const decoded = jwt.verify(tokenParts, process.env.JWT_SECRET || 'your_jwt_secret');
    const userId = decoded.userId;
    
    console.log('User ID from token:', userId);
    
    // Forward request to correct user endpoint
    const response = await axios.get(`http://user-service:3002/api/user/${userId}`, {
      headers: {
        Authorization: token
      }
    });
    
    console.log('User service profile response:', response.data);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error forwarding profile request:', error.message);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log(`Auth Service URL: http://auth-service:3001`);
  console.log(`User Service URL: http://user-service:3002`);
}); 