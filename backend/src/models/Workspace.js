import mongoose from 'mongoose';

const workspaceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  admin_id: {
    type: String,
    required: true,
  },
  invite_code: {
    type: String,
    required: true,
    unique: true,
  },
  member_ids: [{
    type: String,
  }],
  visibility: {
    tasks: {
      type: Boolean,
      default: true,
    },
    projects: {
      type: Boolean,
      default: true,
    },
    members: {
      type: Boolean,
      default: true,
    },
  },
  invitations: [{
    email: {
      type: String,
      required: true,
    },
    token: {
      type: String,
      required: true,
    },
    invited_by: {
      type: String,
      required: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    expires_at: {
      type: Date,
      required: true,
    },
    accepted: {
      type: Boolean,
      default: false,
    },
  }],
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

// Update timestamp on save
workspaceSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

export default mongoose.model('Workspace', workspaceSchema);