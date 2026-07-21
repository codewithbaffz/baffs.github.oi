// backend/src/models/Task.js
import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['todo', 'in_progress', 'done', 'overdue', 'snoozed'],
    default: 'todo',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  due_date: {
    type: Date,
  },
  completed_at: {
    type: Date,
  },
  tags: {
    type: [String],
    default: [],
  },
  is_ai_generated: {
    type: Boolean,
    default: false,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

// Update the updated_at timestamp on save
taskSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Add indexes for better query performance
taskSchema.index({ user_id: 1, status: 1 });
taskSchema.index({ user_id: 1, due_date: 1 });
taskSchema.index({ user_id: 1, created_at: -1 });

const Task = mongoose.model('Task', taskSchema);
export default Task;