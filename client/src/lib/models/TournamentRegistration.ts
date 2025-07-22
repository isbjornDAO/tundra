import mongoose from 'mongoose';

const TournamentRegistrationSchema = new mongoose.Schema({
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true
  },
  clanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clan',
    required: true
  },
  organizer: {
    type: String, // wallet address of the organizer
    required: true
  },
  selectedPlayers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: {
      type: String,
      required: true
    },
    displayName: String,
    walletAddress: String,
    registeredAt: {
      type: Date,
      default: Date.now
    }
  }],
  registeredAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['registered', 'playing', 'eliminated', 'winner'],
    default: 'registered'
  }
});

// Ensure a clan can only register once per tournament
TournamentRegistrationSchema.index({ tournamentId: 1, clanId: 1 }, { unique: true });

export const TournamentRegistration = mongoose.models.TournamentRegistration || 
  mongoose.model('TournamentRegistration', TournamentRegistrationSchema);