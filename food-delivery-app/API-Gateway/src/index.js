const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const dotenv = require('dotenv');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configure multer for temporary file storage
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
const upload = multer({ dest: uploadsDir });

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[API Gateway] ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('[API Gateway] Request body keys:', Object.keys(req.body));
  }
  next();
});

// Proxy for restaurant static files (images)
app.use('/uploads', createProxyMiddleware({
  target: process.env.RESTAURANT_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/uploads': '/uploads'
  },
  onProxyReq: function(proxyReq, req, res) {
    console.log(`[API Gateway] Forwarding static file request to Restaurant Service:`, process.env.RESTAURANT_SERVICE_URL + proxyReq.path);
  },
  onError: function(err, req, res) {
    console.error('[API Gateway] Restaurant Static Files Proxy Error:', err);
    res.status(404).send('Image not found');
  }
}));

// Direct handler for restaurant creation with image
app.post('/api/restaurants/with-image', upload.single('image'), async (req, res) => {
  try {
    console.log('[API Gateway] Handling restaurant creation with image');
    console.log('[API Gateway] File:', req.file);
    console.log('[API Gateway] Body keys:', Object.keys(req.body));
    
    // Create a form data object for forwarding
    const formData = new FormData();
    
    // Add all text fields from the original request
    Object.keys(req.body).forEach(key => {
      formData.append(key, req.body[key]);
    });
    
    // Add the uploaded file if it exists
    if (req.file) {
      formData.append('image', fs.createReadStream(req.file.path), {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });
    }
    
    // Forward to the restaurant service
    const response = await axios.post(
      `${process.env.RESTAURANT_SERVICE_URL}/api/restaurants/with-image`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': req.headers.authorization
        }
      }
    );
    
    // Clean up the temporary file
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    
    // Return the response from the service
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('[API Gateway] Error forwarding restaurant file upload:', error);
    
    // Clean up the temporary file if there was an error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    
    if (error.response) {
      // Forward the error from the service
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ message: 'Error processing restaurant file upload' });
    }
  }
});

// Direct handler for restaurant update with image
app.put('/api/restaurants/:id/with-image', upload.single('image'), async (req, res) => {
  try {
    console.log('[API Gateway] Handling restaurant update with image');
    console.log('[API Gateway] File:', req.file);
    console.log('[API Gateway] Body keys:', Object.keys(req.body));
    
    // Create a form data object for forwarding
    const formData = new FormData();
    
    // Add all text fields from the original request
    Object.keys(req.body).forEach(key => {
      formData.append(key, req.body[key]);
    });
    
    // Add the uploaded file if it exists
    if (req.file) {
      formData.append('image', fs.createReadStream(req.file.path), {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });
    }
    
    // Forward to the restaurant service
    const response = await axios.put(
      `${process.env.RESTAURANT_SERVICE_URL}/api/restaurants/${req.params.id}/with-image`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': req.headers.authorization
        }
      }
    );
    
    // Clean up the temporary file
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    
    // Return the response from the service
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('[API Gateway] Error forwarding restaurant update file upload:', error);
    
    // Clean up the temporary file if there was an error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    
    if (error.response) {
      // Forward the error from the service
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ message: 'Error processing restaurant update file upload' });
    }
  }
});

// Direct handler for menu item creation with image
app.post('/api/restaurants/:id/menu-with-image', upload.single('image'), async (req, res) => {
  try {
    console.log('[API Gateway] Handling menu item with image creation directly');
    console.log('[API Gateway] File:', req.file);
    console.log('[API Gateway] Body:', req.body);
    
    // Create a form data object for forwarding
    const formData = new FormData();
    
    // Add all text fields from the original request
    Object.keys(req.body).forEach(key => {
      formData.append(key, req.body[key]);
    });
    
    // Add the uploaded file if it exists
    if (req.file) {
      formData.append('image', fs.createReadStream(req.file.path), {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });
    }
    
    // Forward to the restaurant service
    const response = await axios.post(
      `${process.env.RESTAURANT_SERVICE_URL}/api/restaurants/${req.params.id}/menu-with-image`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': req.headers.authorization
        }
      }
    );
    
    // Clean up the temporary file
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    
    // Return the response from the service
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('[API Gateway] Error forwarding file upload:', error);
    
    // Clean up the temporary file if there was an error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    
    if (error.response) {
      // Forward the error from the service
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ message: 'Error processing file upload' });
    }
  }
});

// Direct handler for menu item update with image
app.put('/api/restaurants/menu-with-image/:itemId', upload.single('image'), async (req, res) => {
  try {
    console.log('[API Gateway] Handling menu item with image update directly');
    console.log('[API Gateway] File:', req.file);
    console.log('[API Gateway] Body:', req.body);
    
    // Create a form data object for forwarding
    const formData = new FormData();
    
    // Add all text fields from the original request
    Object.keys(req.body).forEach(key => {
      formData.append(key, req.body[key]);
    });
    
    // Add the uploaded file if it exists
    if (req.file) {
      formData.append('image', fs.createReadStream(req.file.path), {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });
    }
    
    // Forward to the restaurant service
    const response = await axios.put(
      `${process.env.RESTAURANT_SERVICE_URL}/api/restaurants/menu-with-image/${req.params.itemId}`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': req.headers.authorization
        }
      }
    );
    
    // Clean up the temporary file
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    
    // Return the response from the service
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('[API Gateway] Error forwarding file upload:', error);
    
    // Clean up the temporary file if there was an error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    
    if (error.response) {
      // Forward the error from the service
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ message: 'Error processing file upload' });
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'API Gateway is running' });
});

// Proxy middleware configuration
const authServiceProxy = createProxyMiddleware({
  target: process.env.AUTH_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/auth': '/api/auth'
  },
  onProxyReq: function(proxyReq, req, res) {
    console.log(`[API Gateway] Forwarding ${req.method} request to Auth Service:`, process.env.AUTH_SERVICE_URL + proxyReq.path);
    
    if (req.body && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
      let bodyData = JSON.stringify(req.body);
      // Update header
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      // Stream the data
      proxyReq.write(bodyData);
    }
  },
  onError: function(err, req, res) {
    console.error('[API Gateway] Auth Service Proxy Error:', err);
    res.status(500).json({ message: 'Auth Service unavailable' });
  }
});

const restaurantServiceProxy = createProxyMiddleware({
  target: process.env.RESTAURANT_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/restaurants': '/api/restaurants'
  },
  onProxyReq: function(proxyReq, req, res) {
    console.log(`[API Gateway] Forwarding ${req.method} request to Restaurant Service:`, process.env.RESTAURANT_SERVICE_URL + proxyReq.path);
    
    if (req.headers.authorization) {
      proxyReq.setHeader('Authorization', req.headers.authorization);
    }

    // Skip body processing for multipart/form-data requests
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      console.log('[API Gateway] Multipart form data detected, passing through without modification');
      return;
    }

    if (req.body && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
      let bodyData = JSON.stringify(req.body);
      // Update header
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      // Stream the data
      proxyReq.write(bodyData);
    }
  },
  onError: function(err, req, res) {
    console.error('[API Gateway] Restaurant Service Proxy Error:', err);
    res.status(500).json({ message: 'Restaurant Service unavailable' });
  }
});

const orderServiceProxy = createProxyMiddleware({
  target: process.env.ORDER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/cart': '/api/cart',
    '^/api/orders': '/api/orders',
    '^/api/payments': '/api/payments'
  },
  onProxyReq: function(proxyReq, req, res) {
    console.log(`[API Gateway] Forwarding ${req.method} request to Order Service:`, process.env.ORDER_SERVICE_URL + proxyReq.path);
    
    if (req.headers.authorization) {
      proxyReq.setHeader('Authorization', req.headers.authorization);
    }

    if (req.body && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
      let bodyData = JSON.stringify(req.body);
      // Update header
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      // Stream the data
      proxyReq.write(bodyData);
    }
  },
  onError: function(err, req, res) {
    console.error('[API Gateway] Order Service Proxy Error:', err);
    res.status(500).json({ message: 'Order Service unavailable' });
  }
});

const deliveryServiceProxy = createProxyMiddleware({
  target: process.env.DELIVERY_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/delivery': '/api/delivery'
  },
  onProxyReq: function(proxyReq, req, res) {
    console.log(`[API Gateway] Forwarding ${req.method} request to Delivery Service:`, process.env.DELIVERY_SERVICE_URL + proxyReq.path);
    
    if (req.headers.authorization) {
      proxyReq.setHeader('Authorization', req.headers.authorization);
    }

    if (req.body && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
      let bodyData = JSON.stringify(req.body);
      // Update header
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      // Stream the data
      proxyReq.write(bodyData);
    }
  },
  onError: function(err, req, res) {
    console.error('[API Gateway] Delivery Service Proxy Error:', err);
    res.status(500).json({ message: 'Delivery Service unavailable' });
  }
});

// Special proxy for file uploads
const fileUploadProxy = createProxyMiddleware({
  target: process.env.RESTAURANT_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/restaurants': '/api/restaurants'
  },
  selfHandleResponse: false, // Let the target server handle the response
  // Don't copy body, let the request pass through untouched
  onProxyReq: function(proxyReq, req, res) {
    console.log(`[API Gateway] Forwarding file upload request to Restaurant Service: ${req.method} ${req.path}`);
    console.log(`[API Gateway] Content-Type: ${req.headers['content-type']}`);
    
    if (req.headers.authorization) {
      proxyReq.setHeader('Authorization', req.headers.authorization);
    }
    
    // Don't modify the request body for multipart/form-data
    console.log('[API Gateway] Passing through multipart form data without modification');
  },
  // Log the response
  onProxyRes: function(proxyRes, req, res) {
    console.log(`[API Gateway] Received response from Restaurant Service: ${proxyRes.statusCode}`);
    
    // Read the response data for debugging
    let responseBody = '';
    proxyRes.on('data', function (chunk) {
      responseBody += chunk;
    });
    
    proxyRes.on('end', function () {
      try {
        console.log('[API Gateway] Response body:', responseBody);
      } catch (e) {
        console.error('[API Gateway] Error parsing response:', e);
      }
    });
  },
  onError: function(err, req, res) {
    console.error('[API Gateway] Restaurant Service File Upload Proxy Error:', err);
    res.status(500).json({ message: 'Restaurant Service file upload failed' });
  }
});

// Routes
app.use('/api/auth', authServiceProxy);

// Special routes for file uploads
app.use('/api/restaurants/*/menu-with-image', fileUploadProxy);
app.use('/api/restaurants/menu-with-image', fileUploadProxy);
app.use('/api/restaurants', restaurantServiceProxy);

app.use('/api/cart', orderServiceProxy);
app.use('/api/orders', orderServiceProxy);
app.use('/api/payments',orderServiceProxy);
app.use('/api/delivery', deliveryServiceProxy);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[API Gateway Error]', err);
  if (!res.headersSent) {
    res.status(500).json({ message: 'Something went wrong!' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API Gateway is running on port ${PORT}`);
  console.log('Auth Service URL:', process.env.AUTH_SERVICE_URL);
  console.log('Restaurant Service URL:', process.env.RESTAURANT_SERVICE_URL);
  console.log('Order Service URL:', process.env.ORDER_SERVICE_URL);
  console.log('Delivery Service URL:', process.env.DELIVERY_SERVICE_URL);
}); 