import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import eventRoutes from './routes/events.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'],
  credentials: true,
}));
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
  console.log(` ${req.method} ${req.url}`);
  next();
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/schedulfy')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error(' MongoDB connection error:', err.message));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Routes
console.log(' Registering routes...');
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/events', eventRoutes);
console.log(' Routes registered');

// 404 handler
app.use((req, res) => {
  console.log(` 404: ${req.method} ${req.url}`);
  res.status(404).json({ 
    error: 'Not Found', 
    message: `Route ${req.method} ${req.url} not found` 
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(' Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error', 
    message: err.message 
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(` Test: http://localhost:${PORT}/api/health`);
});