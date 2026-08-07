import express from 'express';
import { authenticate } from '../middleware/auth.js';
import Task from '../models/Task.js';
import mongoose from 'mongoose';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    console.log(' Fetching tasks for user:', req.userId);
    const tasks = await Task.find({ user_id: req.userId }).sort({ created_at: -1 });
    console.log(` Found ${tasks.length} tasks`);
    res.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks', message: error.message });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    console.log(' Creating task for user:', req.userId);
    console.log(' Task data:', req.body);
    
    const task = new Task({ ...req.body, user_id: req.userId });
    await task.save();
    console.log(' Task created:', task._id);
    res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(400).json({ error: 'Failed to create task', message: error.message });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    console.log(' Updating task with ID:', req.params.id);
    console.log(' Update data:', req.body);
    console.log(' User ID:', req.userId);
    
    // Check if ID is valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.error(' Invalid ObjectId:', req.params.id);
      return res.status(400).json({ error: 'Invalid task ID format' });
    }
    
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user_id: req.userId },
      { ...req.body, updated_at: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!task) {
      console.log(' Task not found for ID:', req.params.id);
      return res.status(404).json({ error: 'Task not found' });
    }
    
    console.log(' Task updated:', task._id);
    res.json(task);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(400).json({ error: 'Failed to update task', message: error.message });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    console.log(' Deleting task with ID:', req.params.id);
    console.log(' User ID:', req.userId);
    
    // Check if ID is valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.error(' Invalid ObjectId:', req.params.id);
      return res.status(400).json({ error: 'Invalid task ID format' });
    }
    
    const task = await Task.findOneAndDelete({ _id: req.params.id, user_id: req.userId });
    
    if (!task) {
      console.log(' Task not found for ID:', req.params.id);
      return res.status(404).json({ error: 'Task not found' });
    }
    
    console.log(' Task deleted:', task._id);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task', message: error.message });
  }
});

export default router;