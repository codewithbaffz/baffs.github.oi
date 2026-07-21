// backend/src/models/Event.js
import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    default: 'Focus Session',
  },
  description: {
    type: String,
    default: '',
  },
  duration_minutes: {
    type: Number,
    default: 25,
  },
  type: {
    type: String,
    enum: ['focus', 'meeting', 'break', 'other'],
    default: 'focus',
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  created_date: {
    type: Date,
    default: Date.now,
  },
  start_time: {
    type: Date,
  },
  end_time: {
    type: Date,
  },
});

// Add indexes for better query performance
eventSchema.index({ user_id: 1, created_date: -1 });
eventSchema.index({ user_id: 1, start_time: 1 });

const Event = mongoose.model('Event', eventSchema);
export default Event;