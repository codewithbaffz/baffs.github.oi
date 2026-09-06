import express from 'express';
import { authenticate } from '../middleware/auth.js';
import Notification from '../models/Notification.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const notifications = await Notification.find({ user_id: req.userId })
      .sort({ created_at: -1 })
      .limit(50)
      .lean();
    res.json(notifications.map((notification) => ({
      ...notification,
      id: notification._id,
      created_date: notification.created_at,
    })));
  } catch (error) {
    res.status(500).json({ message: 'Failed to load notifications', error: error.message });
  }
});

router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user_id: req.userId },
      { is_read: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ message: 'Failed to mark notification as read', error: error.message });
  }
});

router.patch('/read-all', authenticate, async (req, res) => {
  try {
    await Notification.updateMany({ user_id: req.userId, is_read: false }, { is_read: true });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ message: 'Failed to mark notifications as read', error: error.message });
  }
});

export default router;
