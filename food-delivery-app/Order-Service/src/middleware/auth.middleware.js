const jwt = require('jsonwebtoken');

const auth = async (req, res, next) => {
  try {
    
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ message: 'No authentication token provided' });
    }

    try {
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-key-change-this-in-production');
      req.user = decoded;
      
      // Check for restaurantId from different sources
      if (req.user.role === 'restaurant_admin') {
        // Start with token restaurantId
        if (decoded.restaurantId) {
          req.user.restaurantId = decoded.restaurantId;
        } 
        // Next check query parameter
        else if (req.query.restaurantId) {
          req.user.restaurantId = req.query.restaurantId;
          
        }
        // Finally check custom header
        else if (req.header('X-Restaurant-Id')) {
          req.user.restaurantId = req.header('X-Restaurant-Id');
          
        }
        
      
      }
      
      next();
    } catch (error) {
      console.error('Token verification failed:', error.message);
      return res.status(401).json({ message: 'Invalid token' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Authentication error' });
  }
};

const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.',
        required: roles,
        current: req.user?.role
      });
    }
    next();
  };
};

module.exports = { auth, checkRole }; 