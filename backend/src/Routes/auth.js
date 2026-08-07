// backend/src/Routes/auth.js
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Test route - Check if auth routes are working
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Auth routes are working!',
    timestamp: new Date().toISOString()
  });
});

// Register
router.post('/register', async (req, res) => {
  console.log('📝 Register request received');
  
  try {
    const { name, email, password } = req.body;
    
    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ 
        message: 'Name, email, and password are required'
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters'
      });
    }
    
    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Create user
    const user = new User({ 
      name, 
      email: email.toLowerCase(), 
      password 
    });
    await user.save();
    
    console.log('✅ User created:', { id: user._id, email: user.email });
    
    // Create token
    const token = jwt.sign(
      { id: user._id, userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        full_name: user.full_name || user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('❌ Register error:', error);
    res.status(500).json({ 
      message: error.message || 'Registration failed'
    });
  }
});

// Login - FIXED VERSION
router.post('/login', async (req, res) => {
  console.log('🔐 Login request received');
  console.log('📧 Email:', req.body?.email);
  
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      console.log('❌ Missing credentials');
      return res.status(400).json({ 
        message: 'Email and password are required'
      });
    }
    
    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('❌ Password mismatch for:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    console.log('✅ User logged in:', { id: user._id, email: user.email });
    
    // Create token
    const token = jwt.sign(
      { id: user._id, userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    // Send response in the format your AuthContext expects
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        full_name: user.full_name || user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    console.error('❌ Stack:', error.stack);
    res.status(500).json({ 
      message: error.message || 'Login failed. Please try again.'
    });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  console.log('🔍 /me endpoint called - User ID:', req.userId);
  
  try {
    const user = await User.findById(req.userId).select('-password');
    
    if (!user) {
      console.log('❌ User not found for ID:', req.userId);
      return res.status(404).json({ 
        message: 'User not found'
      });
    }

    console.log('✅ User authenticated:', { id: user._id, email: user.email });
    
    res.json({
      id: user._id,
      name: user.name,
      full_name: user.full_name || user.name,
      email: user.email,
      isVerified: user.isVerified || false,
      createdAt: user.createdAt || user.created_at
    });
  } catch (error) {
    console.error('❌ /me error:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to fetch user'
    });
  }
});

export default router;