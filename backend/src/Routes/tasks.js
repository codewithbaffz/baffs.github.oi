import express from 'express';
import { authenticate } from '../middleware/auth.js';
import  Task  from '../models/Task.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const tasks = await Task.find({ user_id: req.userId }).sort({ created_at: -1 });
    res.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks', message: error.message });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const task = new Task({ ...req.body, user_id: req.userId });
    await task.save();
    res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(400).json({ error: 'Failed to create task', message: error.message });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user_id: req.userId },
      { ...req.body, updated_at: new Date() },
      { new: true, runValidators: true }
    );
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(400).json({ error: 'Failed to update task', message: error.message });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user_id: req.userId });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task', message: error.message });
  }
});

export default router;