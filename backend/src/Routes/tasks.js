import express from 'express';
import { authenticate } from '../middleware/auth.js';
import Task from '../models/Task.js';
import mongoose from 'mongoose';
import Workspace from '../models/Workspace.js';
import { notifyWorkspace } from '../services/notificationService.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    console.log(' Fetching tasks for user:', req.userId);
    const workspaces = await Workspace.find({ member_ids: req.userId }).select('_id');
    const workspaceIds = workspaces.map((workspace) => workspace._id);
    const tasks = await Task.find({
      $or: [
        { user_id: req.userId },
        { assignee_id: req.userId },
        { workspace_id: { $in: workspaceIds } },
      ],
    }).sort({ created_at: -1 });
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
    
    const { workspace_id: workspaceId, assignee_id: assigneeId } = req.body;
    let workspace = null;
    if (workspaceId) {
      workspace = await Workspace.findOne({ _id: workspaceId, member_ids: req.userId });
      if (!workspace) return res.status(403).json({ error: 'You are not a member of this workspace' });
      if (assigneeId && !workspace.member_ids.includes(assigneeId)) {
        return res.status(400).json({ error: 'Assignee must be a workspace member' });
      }
    }

    const task = new Task({ ...req.body, user_id: req.userId, workspace_id: workspace?._id });
    await task.save();
    if (task.workspace_id) {
      await notifyWorkspace({
        workspaceId: task.workspace_id,
        actorId: req.userId,
        type: 'task_update',
        title: 'New task created',
        message: '{{actor}} created "' + task.title + '".',
        entityType: 'task',
        entityId: task._id,
      });
    }
    if (task.assignee_id && task.workspace_id) {
      await notifyWorkspace({
        workspaceId: task.workspace_id,
        actorId: req.userId,
        onlyUserId: task.assignee_id,
        type: 'assignment',
        title: 'Task assigned to you',
        message: '{{actor}} assigned you "' + task.title + '".',
        entityType: 'task',
        entityId: task._id,
      });
    }
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
    
    const existingTask = await Task.findOne({ _id: req.params.id });
    if (!existingTask) return res.status(404).json({ error: 'Task not found' });
    if (existingTask.workspace_id) {
      const workspace = await Workspace.findOne({ _id: existingTask.workspace_id, member_ids: req.userId });
      if (!workspace) return res.status(403).json({ error: 'You are not a workspace member' });
      if (req.body.assignee_id && !workspace.member_ids.includes(req.body.assignee_id)) {
        return res.status(400).json({ error: 'Assignee must be a workspace member' });
      }
    } else {
      if (existingTask.user_id.toString() !== req.userId) {
        return res.status(403).json({ error: 'You cannot update this task' });
      }
      if (req.body.assignee_id) {
        const workspace = await Workspace.findOne({
          member_ids: { $all: [req.userId, req.body.assignee_id] },
        });
        if (!workspace) return res.status(400).json({ error: 'Assignee must be a member of your workspace' });
        req.body.workspace_id = workspace._id;
      }
    }

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id },
      { ...req.body, updated_at: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!task) {
      console.log(' Task not found for ID:', req.params.id);
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const wasAssignedTo = existingTask.assignee_id?.toString();
    const isAssignedTo = task.assignee_id?.toString();
    if (isAssignedTo && isAssignedTo !== wasAssignedTo && task.workspace_id) {
      await notifyWorkspace({
        workspaceId: task.workspace_id,
        actorId: req.userId,
        onlyUserId: isAssignedTo,
        type: 'assignment',
        title: 'Task assigned to you',
        message: '{{actor}} assigned you "' + task.title + '".',
        entityType: 'task',
        entityId: task._id,
      });
    }
    if (task.status === 'done' && existingTask.status !== 'done' && task.workspace_id) {
      await notifyWorkspace({
        workspaceId: task.workspace_id,
        actorId: req.userId,
        type: 'task_update',
        title: 'Task completed',
        message: '{{actor}} marked "' + task.title + '" as done.',
        entityType: 'task',
        entityId: task._id,
      });
    } else if (task.status !== existingTask.status && task.workspace_id) {
      await notifyWorkspace({
        workspaceId: task.workspace_id,
        actorId: req.userId,
        type: 'task_update',
        title: 'Task status updated',
        message: '{{actor}} moved "' + task.title + '" to ' + task.status.replace('_', ' ') + '.',
        entityType: 'task',
        entityId: task._id,
      });
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