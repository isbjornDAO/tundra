const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tundra';

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

async function testClanApproval() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find a pending clan to approve
    const pendingClan = await Clan.findOne({ isVerified: false })
      .populate('leader', 'username displayName');

    if (!pendingClan) {
      console.log('❌ No pending clans found to approve');
      return;
    }

    console.log(`\n🔄 Found pending clan: ${pendingClan.name} [${pendingClan.tag}]`);
    console.log(`   Leader: ${pendingClan.leader.displayName} (@${pendingClan.leader.username})`);

    // Create a test admin user if none exists
    let admin = await User.findOne({ isAdmin: true });
    if (!admin) {
      admin = new User({
        walletAddress: '0x0000000000000000000000000000000000000000',
        username: 'testadmin',
        displayName: 'Test Admin',
        email: 'admin@test.com',
        country: 'Test Country',
        region: 'Test Region',
        isAdmin: true
      });
      await admin.save();
      console.log('👤 Created test admin user');
    }

    // Approve the clan
    pendingClan.isVerified = true;
    pendingClan.verifiedBy = admin._id;
    pendingClan.verifiedAt = new Date();
    pendingClan.updatedAt = new Date();
    await pendingClan.save();

    console.log(`✅ Successfully approved clan: ${pendingClan.name}`);
    console.log(`   Verified by: ${admin.displayName} (@${admin.username})`);
    console.log(`   Verified at: ${pendingClan.verifiedAt.toISOString()}`);

    // Verify the changes
    const updatedClan = await Clan.findById(pendingClan._id)
      .populate('leader', 'username displayName')
      .populate('verifiedBy', 'username displayName');

    console.log('\n📊 Updated clan details:');
    console.log(`   Name: ${updatedClan.name} [${updatedClan.tag}]`);
    console.log(`   Leader: ${updatedClan.leader.displayName} (@${updatedClan.leader.username})`);
    console.log(`   Verified: ${updatedClan.isVerified ? 'Yes' : 'No'}`);
    console.log(`   Verified By: ${updatedClan.verifiedBy ? updatedClan.verifiedBy.displayName : 'N/A'}`);
    console.log(`   Verified At: ${updatedClan.verifiedAt ? updatedClan.verifiedAt.toISOString() : 'N/A'}`);

    // Show updated counts
    const totalClans = await Clan.countDocuments();
    const verifiedClans = await Clan.countDocuments({ isVerified: true });
    const pendingClans = await Clan.countDocuments({ isVerified: false });

    console.log('\n📈 Updated Statistics:');
    console.log(`   Total clans: ${totalClans}`);
    console.log(`   Verified clans: ${verifiedClans}`);
    console.log(`   Pending clans: ${pendingClans}`);

    console.log('\n💡 The admin panel should now show the updated counts!');

  } catch (error) {
    console.error('❌ Error testing clan approval:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
}

// Run the script
testClanApproval();