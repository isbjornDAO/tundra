const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tundra';

// Define schemas here since we can't import ES modules in Node.js scripts
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

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Clan = mongoose.models.Clan || mongoose.model('Clan', ClanSchema);

// Test clan data
const testClans = [
  {
    name: "Shadow Wolves",
    tag: "SWLF",
    description: "Elite gaming clan focused on competitive tournaments and team strategy.",
    country: "United States",
    region: "North America",
    leader: {
      walletAddress: "0x1234567890123456789012345678901234567890",
      username: "shadowleader",
      displayName: "Shadow Leader",
      email: "leader@shadowwolves.com",
      country: "United States",
      region: "North America"
    }
  },
  {
    name: "Cyber Phoenix",
    tag: "CPHX",
    description: "Rising from the ashes of defeat, we soar to victory in esports.",
    country: "Canada",
    region: "North America",
    leader: {
      walletAddress: "0x2345678901234567890123456789012345678901",
      username: "phoenixcommander",
      displayName: "Phoenix Commander",
      email: "commander@cyberphoenix.com",
      country: "Canada",
      region: "North America"
    }
  },
  {
    name: "Digital Dragons",
    tag: "DGDN",
    description: "Breathing fire into the competitive gaming scene with our powerful roster.",
    country: "United Kingdom",
    region: "Europe",
    leader: {
      walletAddress: "0x3456789012345678901234567890123456789012",
      username: "dragonmaster",
      displayName: "Dragon Master",
      email: "master@digitaldragon.com",
      country: "United Kingdom",
      region: "Europe"
    }
  }
];

async function createTestPendingClans() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing test clans (optional)
    await Clan.deleteMany({ 
      name: { $in: testClans.map(c => c.name) } 
    });
    console.log('🗑️ Cleared existing test clans');

    // Create test users and clans
    for (const clanData of testClans) {
      // Create or find the leader user
      let leader = await User.findOne({ 
        walletAddress: clanData.leader.walletAddress.toLowerCase() 
      });
      
      if (!leader) {
        leader = new User({
          walletAddress: clanData.leader.walletAddress.toLowerCase(),
          username: clanData.leader.username,
          displayName: clanData.leader.displayName,
          email: clanData.leader.email,
          country: clanData.leader.country,
          region: clanData.leader.region
        });
        await leader.save();
        console.log(`👤 Created test user: ${leader.username}`);
      }

      // Create the clan (with isVerified: false for pending status)
      const clan = new Clan({
        name: clanData.name,
        tag: clanData.tag,
        description: clanData.description,
        leader: leader._id,
        members: [leader._id],
        country: clanData.country,
        region: clanData.region,
        isVerified: false  // This makes it pending
      });

      await clan.save();
      console.log(`🛡️ Created pending clan: ${clan.name} [${clan.tag}]`);

      // Update leader to be clan leader
      leader.clan = clan._id;
      leader.isClanLeader = true;
      await leader.save();
    }

    // Verify pending clans were created
    const pendingClans = await Clan.find({ isVerified: false })
      .populate('leader', 'username displayName');
    
    console.log(`\n📋 Created ${pendingClans.length} pending clans:`);
    pendingClans.forEach((clan, index) => {
      console.log(`${index + 1}. ${clan.name} [${clan.tag}] - Leader: ${clan.leader.displayName} (@${clan.leader.username})`);
      console.log(`   Country: ${clan.country}, Region: ${clan.region}`);
      console.log(`   Status: ${clan.isVerified ? 'Verified' : 'Pending Approval'}`);
      console.log('');
    });

    console.log('✅ Test pending clans created successfully!');
    console.log('💡 You can now check the admin panel to see these clans waiting for approval.');

  } catch (error) {
    console.error('❌ Error creating test clans:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
}

// Run the script
createTestPendingClans();