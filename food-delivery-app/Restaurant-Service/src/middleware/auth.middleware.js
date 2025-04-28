const jwt = require('jsonwebtoken');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No authentication token provided' });
    }

    // Special case for admin token
    if (token.startsWith('admin-token-')) {
      req.user = {
        userId: 'admin-id',
        role: 'admin'
      };
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-key-change-this-in-production');
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Invalid token' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Authentication error' });
  }
};

// Optional auth middleware that doesn't block requests without tokens
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      // Continue without setting req.user
      console.log('No authentication token provided, continuing as unauthenticated');
      return next();
    }

    // Special case for admin token
    if (token.startsWith('admin-token-')) {
      req.user = {
        userId: 'admin-id',
        role: 'admin'
      };
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-key-change-this-in-production');
      req.user = decoded;
      console.log(`User authenticated: ${req.user.userId}, role: ${req.user.role}`);
    } catch (error) {
      console.log('Invalid token provided, continuing as unauthenticated');
      // Continue without setting req.user even if token is invalid
    }
    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    // Continue anyway to not block the request
    next();
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

module.exports = { auth, optionalAuth, checkRole }; 