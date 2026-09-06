// backend/src/middleware/auth.js
import jwt from 'jsonwebtoken';

export const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    console.log('🔑 Auth header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader) {
      console.log('❌ No authorization header');
      return res.status(401).json({ 
        message: 'No token provided' 
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    console.log('🔑 Token received:', token ? token.substring(0, 20) + '...' : 'Empty');
    
    if (!token) {
      console.log('❌ Empty token');
      return res.status(401).json({ 
        message: 'No token provided' 
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log('✅ Token decoded:', decoded);
    
    // ✅ Set userId in multiple formats for compatibility
    req.userId = decoded.userId || decoded.id || decoded._id || decoded.user;
    req.user = decoded;
    req.userId = req.userId || req.user?.id || req.user?.userId;
    
    console.log('✅ User ID set:', req.userId);
    
    if (!req.userId) {
      console.log('❌ No user ID found in token:', decoded);
      return res.status(401).json({ 
        message: 'Invalid token structure' 
      });
    }
    
    next();
  } catch (error) {
    console.error('❌ Auth error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Invalid token' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expired' 
      });
    }
    
    res.status(401).json({ 
      message: error.message || 'Authentication failed' 
    });
  }
};