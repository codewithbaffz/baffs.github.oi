// backend/src/routes/aiRoutes.js
import express from 'express';
import rateLimit from 'express-rate-limit';
import { processAICommand, executeAIAction } from '../controllers/aiController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Rate limiting to prevent abuse
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    type: 'error',
    message: 'Too many AI requests. Please slow down.',
  },
});

// All AI routes require authentication
router.use(authenticate);

// AI command processing
router.post('/command', aiLimiter, processAICommand);

// AI action execution
router.post('/execute', aiLimiter, executeAIAction);

export default router;