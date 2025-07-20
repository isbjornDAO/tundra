import mongoose from 'mongoose';

const MatchSchema = new mongoose.Schema({
  bracketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bracket',
    required: true
  },
  team1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  team2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  round: {
    type: String,
    enum: ['first', 'quarter', 'semi', 'final'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed'],
    default: 'pending'
  },
  score: {
    team1Score: { type: Number, default: 0 },
    team2Score: { type: Number, default: 0 }
  },
  organizer1Approved: {
    type: Boolean,
    default: false
  },
  organizer2Approved: {
    type: Boolean,
    default: false
  },
  scheduledAt: Date,
  completedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

MatchSchema.index({ bracketId: 1 });
MatchSchema.index({ status: 1 });
MatchSchema.index({ round: 1 });

export const Match = mongoose.models.Match || mongoose.model('Match', MatchSchema);