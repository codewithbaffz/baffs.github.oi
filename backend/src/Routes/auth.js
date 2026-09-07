// backend/src/Routes/auth.js
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import crypto from 'node:crypto';
import { sendPasswordResetEmail } from '../services/emailService.js';

const router = express.Router();

router.post('/forgot-password', async (req, res) => {
  const genericResponse = { message: 'If an account exists with that email, you will receive a password reset link shortly.' };

  try {
    const email = req.body?.email?.trim().toLowerCase();
    if (!email) return res.status(200).json(genericResponse);

    const user = await User.findOne({ email });
    if (!user) return res.status(200).json(genericResponse);

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.password_reset_token_hash = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.password_reset_expires_at = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    await sendPasswordResetEmail({ email: user.email, resetToken });
    return res.status(200).json(genericResponse);
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(200).json(genericResponse);
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password || password.length < 6) {
      return res.status(400).json({ message: 'A valid token and password of at least 6 characters are required' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      password_reset_token_hash: tokenHash,
      password_reset_expires_at: { $gt: new Date() },
    });
    if (!user) return res.status(400).json({ message: 'This reset link is invalid or has expired' });

    user.password = password;
    user.password_reset_token_hash = null;
    user.password_reset_expires_at = null;
    await user.save();
    return res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ message: 'Unable to reset password' });
  }
});

const getFrontendUrl = () => process.env.FRONTEND_URL || 'http://localhost:5173';

router.get('/google', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({ message: 'Google sign-in is not configured on the server' });
  }

  const redirect = typeof req.query.redirect === 'string' && req.query.redirect.startsWith('/')
    ? req.query.redirect
    : '/';
  const state = Buffer.from(JSON.stringify({ redirect })).toString('base64url');
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI || `${getFrontendUrl()}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state,
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

router.get('/google/callback', async (req, res) => {
  const frontendUrl = getFrontendUrl();
  try {
    if (req.query.error) throw new Error('Google sign-in was cancelled');
    const redirect = req.query.state
      ? JSON.parse(Buffer.from(req.query.state, 'base64url').toString()).redirect || '/'
      : '/';
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${frontendUrl}/api/auth/google/callback`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: req.query.code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) throw new Error(tokenData.error_description || 'Google token exchange failed');

    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileResponse.json();
    if (!profileResponse.ok || !profile.email) throw new Error('Google did not return an email address');

    let user = await User.findOne({ email: profile.email.toLowerCase() });
    if (!user) {
      user = await User.create({
        name: profile.name || profile.email.split('@')[0],
        email: profile.email.toLowerCase(),
        password: crypto.randomBytes(32).toString('hex'),
      });
    }

    const token = jwt.sign({ id: user._id, userId: user._id }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });
    res.redirect(`${frontendUrl}/login?google_token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(redirect)}`);
  } catch (error) {
    console.error('Google login error:', error);
    res.redirect(`${frontendUrl}/login?google_error=${encodeURIComponent(error.message)}`);
  }
});

// Test route - Check if auth routes are working
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Auth routes are working!',
    timestamp: new Date().toISOString()
  });
});

// Register
router.post('/register', async (req, res) => {
  console.log(' Register request received');
  
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
    
    console.log(' User created:', { id: user._id, email: user.email });
    
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
    console.error(' Register error:', error);
    res.status(500).json({ 
      message: error.message || 'Registration failed'
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  console.log(' Login request received');
  console.log(' Email:', req.body?.email);
  
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      console.log(' Missing credentials');
      return res.status(400).json({ 
        message: 'Email and password are required'
      });
    }
    
    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log(' User not found:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(' Password mismatch for:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    console.log(' User logged in:', { id: user._id, email: user.email });
    
    // Create token
    const token = jwt.sign(
      { id: user._id, userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    // Send response
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        full_name: user.full_name || user.name,
        email: user.email,
        role: user.role || 'member',
      }
    });
  } catch (error) {
    console.error(' Login error:', error);
    console.error(' Stack:', error.stack);
    res.status(500).json({ 
      message: error.message || 'Login failed. Please try again.'
    });
  }
});

//  FIXED: Get current user - Using req.userId (set by middleware)
router.get('/me', authenticate, async (req, res) => {
  console.log(' /me endpoint called');
  console.log(' User ID from token (req.userId):', req.userId);
  
  try {
    //  Use req.userId from middleware
    const userId = req.userId;
    
    if (!userId) {
      console.log(' No user ID found in request');
      return res.status(401).json({ 
        message: 'User ID not found. Please login again.'
      });
    }
    
    // Find user by ID
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      console.log(' User not found for ID:', userId);
      return res.status(404).json({ 
        message: 'User not found'
      });
    }

    console.log(' User authenticated:', { id: user._id, email: user.email });
    
    // Return user data
    res.json({
      id: user._id,
      name: user.name,
      full_name: user.full_name || user.name,
      email: user.email,
      role: user.role || 'member',
      isVerified: user.isVerified || false,
      createdAt: user.createdAt || user.created_at
    });
  } catch (error) {
    console.error(' /me error:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to fetch user'
    });
  }
});

router.get('/settings', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password -password_reset_token_hash -password_reset_expires_at');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role || 'member',
      ...(user.settings?.toObject?.() || user.settings || {}),
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load settings' });
  }
});

router.patch('/settings', authenticate, async (req, res) => {
  try {
    const allowedFields = [
      'display_name', 'bio', 'avatar_url', 'timezone', 'peak_hours_start',
      'peak_hours_end', 'reminder_1day_enabled', 'reminder_1hour_enabled',
      'google_calendar_connected', 'zoom_connected',
    ];
    const updates = Object.fromEntries(
      allowedFields
        .filter((field) => req.body?.[field] !== undefined)
        .map((field) => [`settings.${field}`, req.body[field]])
    );
    if (typeof updates['settings.display_name'] === 'string' && !updates['settings.display_name'].trim()) {
      return res.status(400).json({ message: 'Display name cannot be empty' });
    }
    const user = await User.findByIdAndUpdate(req.userId, { $set: updates }, { new: true, runValidators: true })
      .select('-password -password_reset_token_hash -password_reset_expires_at');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.settings?.toObject?.() || user.settings || {});
  } catch (error) {
    res.status(400).json({ message: error.message || 'Failed to save settings' });
  }
});

router.patch('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Current password and a new password of at least 6 characters are required' });
    }
    const user = await User.findById(req.userId);
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update password' });
  }
});

//  Add a health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'Auth routes are healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;