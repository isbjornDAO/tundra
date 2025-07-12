const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tundra';
const WALLET_ADDRESS = '0x67b1C78938b66337d8461FD03C4884E7AA0ee222';

// Define the User schema here since we can't import ES modules
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
  isTeam1Host: {
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

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function makeAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find user by wallet address (case-insensitive)
    const user = await User.findOne({ 
      walletAddress: WALLET_ADDRESS.toLowerCase() 
    });

    if (!user) {
      console.log(`User with wallet address ${WALLET_ADDRESS} not found`);
      console.log('Make sure the user has connected their wallet and created an account first.');
      process.exit(1);
    }

    // Update user to admin
    user.isAdmin = true;
    await user.save();

    console.log(`✅ Successfully made user ${user.username} (${WALLET_ADDRESS}) an admin`);
    console.log('User details:', {
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      isAdmin: user.isAdmin,
      walletAddress: user.walletAddress
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
makeAdmin();