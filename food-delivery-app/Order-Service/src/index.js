const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const cartRoutes = require('./routes/cart.routes');
const orderRoutes = require('./routes/order.routes');
const paymentRoutes = require('./routes/payment.routes');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

// Create a raw body parser for Stripe webhooks
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// Use JSON parser for all other routes
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {

  if (req.body && Object.keys(req.body).length > 0) {
    
  }
  if (req.query && Object.keys(req.query).length > 0) {
  }
  next();
});

// Routes
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'order-service' });
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/food-delivery')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`Order Service is running on port ${PORT}`);
}); 