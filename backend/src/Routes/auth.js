import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    console.log(' Registration request body:', req.body);
    const { email, password, name } = req.body;
    
    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({ 
        error: 'Missing fields',
        message: 'Email, password, and name are required' 
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        error: 'User already exists',
        message: 'Email is already registered' 
      });
    }

    // Create new user
    const user = new User({ email, password, name });
    await user.save();
    console.log('User created:', user._id);

    // Generate token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ 
      error: 'Registration failed',
      message: error.message 
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    console.log(' Login request received');
    console.log(' Request body:', req.body);
    
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      console.log(' Missing email or password');
      return res.status(400).json({ 
        error: 'Missing credentials',
        message: 'Email and password are required' 
      });
    }
    
    // Find user
    const user = await User.findOne({ email });
    console.log(' User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Email or password is incorrect' 
      });
    }

    // Check password
    console.log(' Comparing password...');
    const isMatch = await user.comparePassword(password);
    console.log('Password match:', isMatch);
    
    if (!isMatch) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Email or password is incorrect' 
      });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    console.log('Login successful for:', email);
    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(400).json({ 
      error: 'Login failed',
      message: error.message 
    });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    console.log(' Getting user info for ID:', req.userId);
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'User no longer exists' 
      });
    }
    
    res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      preferences: user.preferences,
    });
  } catch (error) {
    console.error(' Get user error:', error);
    res.status(500).json({ 
      error: 'Failed to get user',
      message: error.message 
    });
  }
});

router.post('/logout', authenticate, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;