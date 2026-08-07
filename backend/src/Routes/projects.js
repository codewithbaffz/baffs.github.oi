// backend/src/Routes/projects.js
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import Project from '../models/Project.js';

const router = express.Router();

// Get all projects for the current user
router.get('/', authenticate, async (req, res) => {
  try {
    console.log('📋 Fetching projects for user:', req.userId);
    const projects = await Project.find({ user_id: req.userId });
    console.log(`✅ Found ${projects.length} projects`);
    res.json(projects);
  } catch (error) {
    console.error('❌ Error fetching projects:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create a new project
router.post('/', authenticate, async (req, res) => {
  try {
    console.log('📝 Creating project for user:', req.userId);
    console.log('📦 Project data:', req.body);
    
    const project = new Project({
      name: req.body.name,
      description: req.body.description || '',
      color: req.body.color || '#6C63FF',
      status: req.body.status || 'active',
      due_date: req.body.due_date || null,
      user_id: req.userId,
    });
    await project.save();
    
    console.log('✅ Project created:', project._id);
    res.status(201).json(project);
  } catch (error) {
    console.error('❌ Error creating project:', error);
    res.status(400).json({ message: error.message });
  }
});

// Update a project
router.patch('/:id', authenticate, async (req, res) => {
  try {
    console.log(`📝 Updating project ${req.params.id} for user:`, req.userId);
    console.log('📦 Update data:', req.body);
    
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, user_id: req.userId },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    console.log('✅ Project updated:', project._id);
    res.json(project);
  } catch (error) {
    console.error('❌ Error updating project:', error);
    res.status(400).json({ message: error.message });
  }
});

// Delete a project
router.delete('/:id', authenticate, async (req, res) => {
  try {
    console.log(`🗑️ Deleting project ${req.params.id} for user:`, req.userId);
    
    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      user_id: req.userId,
    });
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    console.log('✅ Project deleted:', project._id);
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting project:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;