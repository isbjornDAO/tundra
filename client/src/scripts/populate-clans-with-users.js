const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

// AVAX influencer names and their personas
const avaxInfluencers = [
  { username: "EminGunSirer", displayName: "Emin Gün Sirer", bio: "Founder of Avalanche" },
  { username: "kevinsekniqi", displayName: "Kevin Sekniqi", bio: "Co-founder of Avalanche" },
  { username: "StephenButtolph", displayName: "Stephen Buttolph", bio: "Co-founder of Avalanche" },
  { username: "avalancheavax", displayName: "Avalanche Official", bio: "Official Avalanche account" },
  { username: "ted_yin", displayName: "Ted Yin", bio: "VP of Engineering at Avalanche" },
  { username: "lydia_hylton", displayName: "Lydia Hylton", bio: "Head of Growth at Avalanche" },
  { username: "johnwu_ave", displayName: "John Wu", bio: "President of Avalanche" },
  { username: "patrickosullivan", displayName: "Patrick O'Sullivan", bio: "COO of Avalanche" },
  { username: "ryanberckmans", displayName: "Ryan Berckmans", bio: "Avalanche Ecosystem Lead" },
  { username: "chris_lavigne", displayName: "Chris Lavigne", bio: "VP of Marketing at Avalanche" },
  { username: "avalabs_team", displayName: "Ava Labs Team", bio: "Building the future of Web3" },
  { username: "snowtrace_io", displayName: "Snowtrace Explorer", bio: "Avalanche blockchain explorer" },
  { username: "joepegs_nft", displayName: "Joepegs NFT", bio: "Premier NFT marketplace on Avalanche" },
  { username: "traderjoe_xyz", displayName: "Trader Joe DeFi", bio: "Leading DEX on Avalanche" },
  { username: "pangolin_dex", displayName: "Pangolin DEX", bio: "Community-driven DEX on Avalanche" },
  { username: "benqi_finance", displayName: "BENQI Finance", bio: "Liquidity market protocol on Avalanche" },
  { username: "vector_fi", displayName: "Vector Finance", bio: "Yield optimization on Avalanche" },
  { username: "platypus_fi", displayName: "Platypus Finance", bio: "Stablecoin DEX on Avalanche" },
  { username: "gmx_io", displayName: "GMX Trading", bio: "Decentralized perpetual exchange" },
  { username: "colony_lab", displayName: "Colony Lab", bio: "Building next-gen DeFi tools" },
  { username: "avalanche_hub", displayName: "Avalanche Hub", bio: "Community hub for AVAX ecosystem" },
  { username: "subnet_builder", displayName: "Subnet Builder", bio: "Creating custom blockchain solutions" },
  { username: "avax_whale", displayName: "AVAX Whale", bio: "Large-scale AVAX investor and validator" },
  { username: "degen_ape_avax", displayName: "Degen Ape AVAX", bio: "NFT collector and DeFi enthusiast" },
  { username: "avalanche_dev", displayName: "Avalanche Developer", bio: "Building dApps on Avalanche" }
];

async function populateClansWithUsers() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db("tundra");
    
    console.log("🔍 Checking clan member counts...\n");
    
    // Get all clans with member counts
    const clans = await db.collection("clans").find({}).toArray();
    const clansNeedingMembers = [];
    
    for (const clan of clans) {
      const memberCount = clan.members ? clan.members.length : 0;
      console.log(`${clan.name} [${clan.tag}]: ${memberCount} members`);
      
      if (memberCount < 3) {
        const needed = 3 - memberCount;
        clansNeedingMembers.push({ clan, needed });
        console.log(`  ⚠️  Needs ${needed} more members`);
      }
    }
    
    console.log(`\n📊 Found ${clansNeedingMembers.length} clans needing members\n`);
    
    if (clansNeedingMembers.length === 0) {
      console.log("✅ All clans have at least 3 members!");
      return;
    }
    
    // Calculate total users needed
    const totalUsersNeeded = clansNeedingMembers.reduce((sum, item) => sum + item.needed, 0);
    console.log(`👥 Need to create ${totalUsersNeeded} AVAX influencer users\n`);
    
    // Create influencer users
    const createdUsers = [];
    let influencerIndex = 0;
    
    for (const { clan, needed } of clansNeedingMembers) {
      console.log(`🏛️  Processing ${clan.name} [${clan.tag}]...`);
      
      for (let i = 0; i < needed; i++) {
        if (influencerIndex >= avaxInfluencers.length) {
          console.log("⚠️  Ran out of influencer names, recycling with numbers...");
          influencerIndex = 0; // Start over with number suffixes
        }
        
        const influencer = avaxInfluencers[influencerIndex];
        const suffix = createdUsers.filter(u => u.username.startsWith(influencer.username)).length;
        const username = suffix > 0 ? `${influencer.username}_${suffix + 1}` : influencer.username;
        
        // Check if user already exists
        const existingUser = await db.collection("users").findOne({ username });
        let userId;
        
        if (existingUser) {
          console.log(`   👤 User ${username} already exists, using existing`);
          userId = existingUser._id;
        } else {
          // Create new user
          const newUser = {
            username: username,
            displayName: influencer.displayName + (suffix > 0 ? ` ${suffix + 1}` : ''),
            walletAddress: `${username.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            country: clan.country || "US",
            region: clan.region || "North America",
            clan: clan._id,
            isClanLeader: false,
            bio: influencer.bio,
            xp: Math.floor(Math.random() * 5000) + 1000, // Random XP between 1000-6000
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          const userResult = await db.collection("users").insertOne(newUser);
          userId = userResult.insertedId;
          createdUsers.push({ ...newUser, _id: userId });
          console.log(`   ✅ Created user: ${username} (${userId})`);
        }
        
        // Add user to clan if not already a member
        const isAlreadyMember = clan.members && clan.members.some(memberId => 
          memberId.toString() === userId.toString()
        );
        
        if (!isAlreadyMember) {
          await db.collection("clans").updateOne(
            { _id: clan._id },
            { 
              $addToSet: { members: userId },
              $set: { updatedAt: new Date() }
            }
          );
          console.log(`   🏛️  Added ${username} to ${clan.name}`);
        } else {
          console.log(`   ℹ️  ${username} already in ${clan.name}`);
        }
        
        influencerIndex++;
      }
    }
    
    console.log("\n🎉 Clan population complete!\n");
    
    // Verify results
    console.log("📊 Final clan member counts:");
    const updatedClans = await db.collection("clans").find({}).toArray();
    
    for (const clan of updatedClans) {
      const memberCount = clan.members ? clan.members.length : 0;
      const status = memberCount >= 3 ? '✅' : '❌';
      console.log(`${status} ${clan.name} [${clan.tag}]: ${memberCount} members`);
    }
    
    console.log(`\n👥 Created ${createdUsers.length} new AVAX influencer users`);
    console.log("🏛️  All clans now have adequate membership!");
    
  } catch (error) {
    console.error("❌ Error populating clans:", error);
  } finally {
    await client.close();
  }
}

populateClansWithUsers();