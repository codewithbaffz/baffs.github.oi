import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  password_reset_token_hash: {
    type: String,
    default: null,
  },
  password_reset_expires_at: {
    type: Date,
    default: null,
  },
  settings: {
    display_name: { type: String, default: '' },
    bio: { type: String, default: '' },
    avatar_url: { type: String, default: '' },
    timezone: { type: String, default: 'UTC' },
    peak_hours_start: { type: Number, default: 9 },
    peak_hours_end: { type: Number, default: 17 },
    reminder_1day_enabled: { type: Boolean, default: true },
    reminder_1hour_enabled: { type: Boolean, default: true },
    google_calendar_connected: { type: Boolean, default: false },
    zoom_connected: { type: Boolean, default: false },
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

export default mongoose.model('User', UserSchema);