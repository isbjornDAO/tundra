import mongoose from 'mongoose';

const TournamentSchema = new mongoose.Schema({
  game: {
    type: String,
    required: true
  },
  region: {
    type: String,
    required: true
  },
  maxTeams: {
    type: Number,
    default: 16
  },
  registeredTeams: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['open', 'full', 'active', 'completed'],
    default: 'open'
  },
  prizePool: {
    type: Number,
    default: 5000
  },
  bracketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bracket'
  },
  teams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

TournamentSchema.index({ game: 1, region: 1 });
TournamentSchema.index({ status: 1 });

export const Tournament = mongoose.models.Tournament || mongoose.model('Tournament', TournamentSchema);