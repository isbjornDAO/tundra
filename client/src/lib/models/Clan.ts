import mongoose from 'mongoose';

const ClanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  tag: {
    type: String,
    required: true,
    unique: true,
    maxLength: 5
  },
  description: String,
  logo: String,
  leader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  maxMembers: {
    type: Number,
    default: 50
  },
  country: {
    type: String,
    required: true
  },
  region: {
    type: String,
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: Date,
  isPublic: {
    type: Boolean,
    default: true
  },
  joinRequests: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  }],
  stats: {
    totalTournaments: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    totalPrizeMoney: { type: Number, default: 0 }
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

ClanSchema.index({ name: 1 });
ClanSchema.index({ tag: 1 });
ClanSchema.index({ leader: 1 });

export const Clan = mongoose.models.Clan || mongoose.model('Clan', ClanSchema);