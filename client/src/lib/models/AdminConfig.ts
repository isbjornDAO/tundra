import mongoose from 'mongoose';

const AdminConfigSchema = new mongoose.Schema({
  adminWallets: [{
    walletAddress: {
      type: String,
      lowercase: true
    },
    name: String,
    regions: [String],
    role: {
      type: String,
      enum: ['admin', 'host'],
      default: 'host'
    }
  }],
  regions: [{
    name: String,
    code: String
  }]
});

export const AdminConfig = mongoose.models.AdminConfig || mongoose.model('AdminConfig', AdminConfigSchema);