import mongoose from 'mongoose';

const teamMessageSchema = new mongoose.Schema({
  workspace_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  author_id: { type: String, required: true },
  author_name: { type: String, required: true },
  message: { type: String, required: true, trim: true, maxlength: 2000 },
  reply_to: { type: mongoose.Schema.Types.ObjectId, ref: 'TeamMessage', default: null },
  created_at: { type: Date, default: Date.now, index: true },
});

teamMessageSchema.index({ workspace_id: 1, created_at: -1 });

export default mongoose.model('TeamMessage', teamMessageSchema);
