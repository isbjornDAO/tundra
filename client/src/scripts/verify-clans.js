const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

// Define schemas
const ClanSchema = new mongoose.Schema({
  name: String,
  tag: String,
  description: String,
  leader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  country: String,
  region: String,
  isVerified: Boolean,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: Date,
  createdAt: Date,
  updatedAt: Date
});

const UserSchema = new mongoose.Schema({
  walletAddress: String,
  username: String,
  displayName: String,
  email: String,
  country: String,
  region: String,
  clan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clan'
  },
  isClanLeader: Boolean,
  isAdmin: Boolean,
  createdAt: Date,
  updatedAt: Date
});

const Clan = mongoose.models.Clan || mongoose.model('Clan', ClanSchema);
const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function verifyClans() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all clans
    const allClans = await Clan.find({})
      .populate('leader', 'username displayName walletAddress')
      .sort({ createdAt: -1 });

    console.log(`\n📊 Total clans in database: ${allClans.length}`);
    
    // Separate verified and pending clans
    const verifiedClans = allClans.filter(clan => clan.isVerified);
    const pendingClans = allClans.filter(clan => !clan.isVerified);

    console.log(`✅ Verified clans: ${verifiedClans.length}`);
    console.log(`⏳ Pending clans: ${pendingClans.length}`);

    if (pendingClans.length > 0) {
      console.log('\n🔄 Pending Clans (awaiting approval):');
      pendingClans.forEach((clan, index) => {
        console.log(`${index + 1}. ${clan.name} [${clan.tag}]`);
        console.log(`   Leader: ${clan.leader.displayName} (@${clan.leader.username})`);
        console.log(`   Wallet: ${clan.leader.walletAddress}`);
        console.log(`   Location: ${clan.country}, ${clan.region}`);
        console.log(`   Description: ${clan.description || 'No description'}`);
        console.log(`   Created: ${clan.createdAt.toISOString()}`);
        console.log(`   Members: ${clan.members.length}`);
        console.log('');
      });
    }

    if (verifiedClans.length > 0) {
      console.log('\n✅ Verified Clans:');
      verifiedClans.forEach((clan, index) => {
        console.log(`${index + 1}. ${clan.name} [${clan.tag}]`);
        console.log(`   Leader: ${clan.leader.displayName} (@${clan.leader.username})`);
        console.log(`   Verified: ${clan.verifiedAt ? clan.verifiedAt.toISOString() : 'Unknown'}`);
        console.log('');
      });
    }

    console.log('💡 Admin Panel Status:');
    console.log(`   - Should show ${pendingClans.length} pending approval(s)`);
    console.log(`   - Should show ${verifiedClans.length} verified clan(s)`);
    console.log('\n🌐 To view the admin panel, visit: http://localhost:3001/admin');

  } catch (error) {
    console.error('❌ Error verifying clans:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
}

// Run the script
verifyClans();