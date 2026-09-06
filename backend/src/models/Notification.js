import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  workspace_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
  type: {
    type: String,
    enum: ['assignment', 'task_update', 'project_update', 'team_update'],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  actor_name: { type: String, default: 'A team member' },
  entity_type: { type: String },
  entity_id: { type: String },
  is_read: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now, index: true },
});

notificationSchema.index({ user_id: 1, created_at: -1 });

export default mongoose.model('Notification', notificationSchema);
