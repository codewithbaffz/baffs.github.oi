import jwt from 'jsonwebtoken';

export const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'No token provided' 
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Set userId in request for routes to use
    req.userId = decoded.userId || decoded.id;
    
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid or expired token' 
    });
  }
};