import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import authRoutes from './Routes/auth.js';
import eventRoutes from './Routes/events.js';
import taskRoutes from './Routes/tasks.js';
import projectRoutes from './Routes/projects.js';
import workspaceRoutes from './Routes/workspace.js';
import aiRoutes from './Routes/aiRoutes.js';
import notificationRoutes from './Routes/notifications.js';



const app = express();

// Updated CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:3001',
  process.env.FRONTEND_URL, // e.g. https://baffs-github-oi-schedulfy.vercel.app
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, mobile apps, server-to-server)
    if (!origin) return callback(null, true);

    const isAllowedExact = allowedOrigins.includes(origin);
    const isVercelPreview = /^https:\/\/baffs-github-oi-schedulfy[a-z0-9-]*\.vercel\.app$/.test(origin);

    if (isAllowedExact || isVercelPreview) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id']
}));

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/workspace', workspaceRoutes);
app.use('/api/ai', aiRoutes); //  FIXED: Added /api prefix
app.use('/api/notifications', notificationRoutes);

// Test route
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend is running!',
    endpoints: {
      auth: '/api/auth',
      events: '/api/events',
      tasks: '/api/tasks',
      projects: '/api/projects',
      ai: '/api/ai'
    }
  });
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path 
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(' Error:', err.stack);
  
  // Handle MongoDB duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({ 
      error: `Duplicate ${field} value`,
      field: field,
      message: `A record with this ${field} already exists`
    });
  }
  
  // Handle validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ 
      error: 'Validation Error',
      details: errors 
    });
  }
  
  // Handle CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({ 
      error: 'Invalid ID format',
      message: `Invalid ${err.path}: ${err.value}`
    });
  }
  
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

const PORT = process.env.PORT || 5000;

// MongoDB Connection with better error handling
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/productivityapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log(' Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(` Server running on http://localhost:${PORT}`);
      console.log(`   Test: http://localhost:${PORT}/api/test`);
      console.log(`   Auth: http://localhost:${PORT}/api/auth`);
      console.log(`   Tasks: http://localhost:${PORT}/api/tasks`);
      console.log(`   AI: http://localhost:${PORT}/api/ai/command`); //  Now matches frontend
    });
  })
  .catch(err => {
    console.error(' MongoDB connection error:', err.message);
    console.log(' Server will start without MongoDB (some features may not work)');
    
    // Still start the server even if MongoDB fails
    app.listen(PORT, () => {
      console.log(` Server running on http://localhost:${PORT} (without MongoDB)`);
    });
  });

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log(' MongoDB connection closed');
    process.exit(0);
  } catch (err) {
    console.error(' Error closing MongoDB connection:', err);
    process.exit(1);
  }
});

export default app;