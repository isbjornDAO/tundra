import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    minlength: 3,
    maxlength: 20,
    match: /^[a-zA-Z0-9_]+$/
  },
  displayName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    sparse: true,
    index: true
  },
  avatar: String,
  bio: String,
  country: {
    type: String,
    required: true
  },
  region: {
    type: String,
    default: 'Unknown'
  },
  clan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clan'
  },
  isClanLeader: {
    type: Boolean,
    default: false
  },
  isHost: {
    type: Boolean,
    default: false
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  adminRegions: [{
    type: String
  }],
  stats: {
    totalTournaments: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    totalPrizeMoney: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes are already created by unique: true in schema fields
// UserSchema.index({ walletAddress: 1 }); // Already unique in schema
// UserSchema.index({ username: 1 }); // Already unique in schema
UserSchema.index({ clan: 1 });

export const User = mongoose.models.User || mongoose.model('User', UserSchema);