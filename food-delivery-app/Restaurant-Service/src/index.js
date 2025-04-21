const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const restaurantRoutes = require('./routes/restaurant.routes');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory with proper configuration
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads'), {
  // Set Cache-Control headers for better performance
  maxAge: '1d',
  // Set proper MIME types for images
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filePath.endsWith('.gif')) {
      res.setHeader('Content-Type', 'image/gif');
    }
  }
}));

// Routes
app.use('/api/restaurants', restaurantRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/food-delivery')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Restaurant Service is running on port ${PORT}`);
}); 