const { verifyToken } = require('../utils/jwt');

// Authenticate user (works for both admin and members)
const authenticate = async (req, res, next) => {
  try {
    // Get the token from the header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: true, message: 'Access denied. No token provided.' });
    }
    
    // Extract the token
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: true, message: 'Invalid token.' });
    }
    
    // Attach user info to request (works for both admin and members)
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: true, message: 'Internal server error.' });
  }
};

// Authenticate admin only
const authenticateAdmin = async (req, res, next) => {
  try {
    // Get the token from the header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: true, message: 'Access denied. No token provided.' });
    }
    
    // Extract the token
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: true, message: 'Invalid token.' });
    }
    
    // Check if token is for admin
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: true, message: 'Access denied. Admin privileges required.' });
    }
    
    // Attach admin info to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: 'admin'
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: true, message: 'Internal server error.' });
  }
};

// Check if user has admin role (must be used after authenticate)
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: true, message: 'Access denied. Admin privileges required.' });
  }
  
  next();
};

module.exports = {
  authenticate,
  authenticateAdmin,
  isAdmin
};
