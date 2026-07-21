import express from 'express';
import { authenticate } from '../middleware/auth.js';
import  Events  from '../models/Events.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const events = await Event.find({ user_id: req.userId }).sort({ created_date: -1 });
    res.json(events);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to fetch events', message: error.message });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const event = new Event({ ...req.body, user_id: req.userId });
    await event.save();
    res.status(201).json(event);
  } catch (error) {
    console.error('Create event error:', error);
    res.status(400).json({ error: 'Failed to create event', message: error.message });
  }
});

router.get('/date/:date', authenticate, async (req, res) => {
  try {
    const date = new Date(req.params.date);
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));
    const events = await Event.find({
      user_id: req.userId,
      created_date: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ created_date: -1 });
    res.json(events);
  } catch (error) {
    console.error('Get events by date error:', error);
    res.status(500).json({ error: 'Failed to fetch events', message: error.message });
  }
});

router.get('/range', authenticate, async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) {
      return res.status(400).json({ error: 'Missing parameters' });
    }
    const events = await Event.find({
      user_id: req.userId,
      created_date: { $gte: new Date(start), $lte: new Date(end) }
    }).sort({ created_date: -1 });
    res.json(events);
  } catch (error) {
    console.error('Get events range error:', error);
    res.status(500).json({ error: 'Failed to fetch events', message: error.message });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const event = await Event.findOneAndUpdate(
      { _id: req.params.id, user_id: req.userId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    console.error('Update event error:', error);
    res.status(400).json({ error: 'Failed to update event', message: error.message });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const event = await Event.findOneAndDelete({ _id: req.params.id, user_id: req.userId });
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event', message: error.message });
  }
});

export default router;