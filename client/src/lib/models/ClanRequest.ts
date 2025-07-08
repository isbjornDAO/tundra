import mongoose from 'mongoose';

const ClanRequestSchema = new mongoose.Schema({
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  clanName: {
    type: String,
    required: true
  },
  clanTag: {
    type: String,
    required: true,
    maxLength: 5
  },
  description: String,
  logo: String,
  country: {
    type: String,
    required: true
  },
  region: {
    type: String,
    required: true
  },
  // Documentation/proof of location
  locationProof: {
    type: String, // URL to uploaded document/image
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  reviewNotes: String,
  assignedHost: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

ClanRequestSchema.index({ requestedBy: 1 });
ClanRequestSchema.index({ country: 1, status: 1 });
ClanRequestSchema.index({ assignedHost: 1, status: 1 });

export const ClanRequest = mongoose.models.ClanRequest || mongoose.model('ClanRequest', ClanRequestSchema);