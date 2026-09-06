// backend/src/models/Project.js
import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  color: {
    type: String,
    default: '#6C63FF',
  },
  status: {
    type: String,
    enum: ['active', 'on_hold', 'completed', 'archived'],
    default: 'active',
  },
  due_date: {
    type: Date,
    default: null,
  },
  user_id: {
    type: String,
    required: true,
  },
  workspace_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Project', projectSchema);