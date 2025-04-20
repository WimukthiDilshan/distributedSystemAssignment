const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No authentication token, access denied' });
    }

    try {
      // Use same JWT secret that other services are using
      const secret = process.env.JWT_SECRET || 'your_jwt_secret_key';
      console.log(`[Delivery Service] Using JWT secret: ${secret.substring(0, 3)}...`);
      
      const verified = jwt.verify(token, secret);
      if (!verified) {
        throw new Error('Token verification failed');
      }
      
      req.user = verified;
      console.log(`[Delivery Service] Authenticated user: ${req.user.userId}, role: ${req.user.role}`);
      next();
    } catch (jwtError) {
      console.error('[Delivery Service] JWT error:', jwtError.message);
      return res.status(401).json({ message: 'Token is not valid' });
    }
  } catch (error) {
    console.error('[Delivery Service] Auth middleware error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. Not authorized for this resource',
        requiredRoles: roles,
        userRole: req.user.role
      });
    }
    
    next();
  };
};

module.exports = { auth, checkRole }; 