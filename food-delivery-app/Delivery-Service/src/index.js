const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const deliveryRoutes = require('./routes/delivery.routes');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[Delivery Service] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/delivery', deliveryRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'delivery-service' });
});

// MongoDB connection (if needed in the future)
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('[Delivery Service] Connected to MongoDB'))
  .catch((err) => console.error('[Delivery Service] MongoDB connection error:', err));

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
  console.log(`[Delivery Service] Delivery Service is running on port ${PORT}`);
  console.log(`[Delivery Service] Using MongoDB URI: ${process.env.MONGO_URI.substring(0, 20)}...`);
}); 