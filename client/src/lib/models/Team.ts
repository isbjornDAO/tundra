import mongoose from 'mongoose';

const TeamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  players: [{
    username: String,
    walletAddress: String,
    role: String
  }],
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true
  },
  captain: {
    username: String,
    walletAddress: String
  },
  status: {
    type: String,
    enum: ['registered', 'active', 'eliminated'],
    default: 'registered'
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

TeamSchema.index({ tournamentId: 1 });
TeamSchema.index({ 'captain.walletAddress': 1 });

export const Team = mongoose.models.Team || mongoose.model('Team', TeamSchema);