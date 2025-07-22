import mongoose from 'mongoose';

const MatchSchema = new mongoose.Schema({
  bracketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bracket',
    required: true
  },
  clan1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clan',
    required: false
  },
  clan2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clan',
    required: false
  },
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clan'
  },
  round: {
    type: String,
    enum: ['first', 'quarter', 'semi', 'final'],
    required: true
  },
  status: {
    type: String,
    enum: ['scheduling', 'ready', 'active', 'completed'],
    default: 'scheduling'
  },
  score: {
    clan1Score: { type: Number, default: 0 },
    clan2Score: { type: Number, default: 0 }
  },
  rosters: {
    clan1: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      username: { type: String, required: true },
      confirmed: { type: Boolean, default: false }
    }],
    clan2: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      username: { type: String, required: true },
      confirmed: { type: Boolean, default: false }
    }]
  },
  playerPerformances: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    clanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clan',
      required: true
    },
    score: { type: Number, required: true },
    kills: { type: Number, default: 0 },
    deaths: { type: Number, default: 0 },
    assists: { type: Number, default: 0 },
    mvp: { type: Boolean, default: false }
  }],
  organizer1Approved: {
    type: Boolean,
    default: false
  },
  organizer2Approved: {
    type: Boolean,
    default: false
  },
  resultsSubmissions: {
    clan1: {
      submitted: { type: Boolean, default: false },
      submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      submittedAt: { type: Date }
    },
    clan2: {
      submitted: { type: Boolean, default: false },
      submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      submittedAt: { type: Date }
    }
  },
  conflictData: {
    submission1: {
      clanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clan' },
      score: {
        clan1Score: Number,
        clan2Score: Number
      },
      submittedAt: Date
    },
    submission2: {
      clanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clan' },
      score: {
        clan1Score: Number,
        clan2Score: Number
      },
      submittedAt: Date
    }
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