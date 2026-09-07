import mongoose from 'mongoose';

const teamMeetingSchema = new mongoose.Schema({
  workspace_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  created_by: { type: String, required: true },
  creator_name: { type: String, required: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  starts_at: { type: Date, required: true },
  duration_minutes: { type: Number, default: 30, min: 15, max: 480 },
  zoom_url: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

teamMeetingSchema.index({ workspace_id: 1, starts_at: 1 });

export default mongoose.model('TeamMeeting', teamMeetingSchema);
