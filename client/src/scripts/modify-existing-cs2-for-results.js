const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

async function modifyExistingCS2ForResults() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db("tundra");
    
    console.log("🔄 Modifying existing CS2 tournament for dual-host confirmation...\n");
    
    // Find the existing CS2 tournament
    const cs2Tournament = await db.collection("tournaments").findOne({ game: "CS2" });
    if (!cs2Tournament) {
      console.log("❌ No CS2 tournament found");
      return;
    }
    
    console.log(`Found CS2 tournament: ${cs2Tournament.status}`);
    
    // Find existing matches for this tournament
    const bracket = await db.collection("brackets").findOne({ tournamentId: cs2Tournament._id });
    if (!bracket) {
      console.log("❌ No bracket found for CS2 tournament");
      return;
    }
    
    const existingMatches = await db.collection("matches").find({ bracketId: bracket._id }).toArray();
    console.log(`Found ${existingMatches.length} existing matches`);
    
    // Set the date to January 23rd (past date as requested) and change status
    const pastMatchDate = new Date('2024-01-23T18:00:00Z');
    
    // Update the tournament status to active (since we're simulating matches need results)
    await db.collection("tournaments").updateOne(
      { _id: cs2Tournament._id },
      { 
        $set: { 
          status: "active",
        },
        $unset: {
          winner: "",
          runnerUp: "",
          completedAt: ""
        }
      }
    );
    
    // Update bracket status to active
    await db.collection("brackets").updateOne(
      { _id: bracket._id },
      { 
        $set: { 
          status: "active"
        },
        $unset: {
          winner: ""
        }
      }
    );
    
    // Modify existing matches to need dual-host confirmation
    for (const match of existingMatches) {
      // Determine host regions based on the teams
      const team1Region = match.team1.region || "North America";
      const team2Region = match.team2.region || "Europe West";
      
      const updateData = {
        status: "awaiting_results",
        scheduledTime: pastMatchDate,
        confirmedDate: pastMatchDate,
        needsConfirmation: true,
        hostRegions: [team1Region, team2Region],
        resultsSubmitted: []
      };
      
      // Remove completed match data
      const unsetData = {
        winner: "",
        completedAt: "",
        organizer1Approved: "",
        organizer2Approved: ""
      };
      
      await db.collection("matches").updateOne(
        { _id: match._id },
        { 
          $set: updateData,
          $unset: unsetData
        }
      );
      
      console.log(`✅ Updated match: ${match.team1.name} vs ${match.team2.name}`);
      console.log(`   Host regions: ${team1Region} + ${team2Region}`);
    }
    
    // Create regional hosts if they don't exist
    const existingHosts = await db.collection("users").find({
      adminRegions: { $exists: true, $ne: [] }
    }).toArray();
    
    if (existingHosts.length === 0) {
      const regionalHosts = [
        {
          _id: new ObjectId(),
          walletAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          username: "nahost",
          displayName: "NA Regional Host",
          email: "na@tundra.com",
          country: "US",
          region: "North America",
          isAdmin: true,
          isTeam1Host: true,
          adminRegions: ["North America"],
          createdAt: new Date()
        },
        {
          _id: new ObjectId(),
          walletAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          username: "euhost",
          displayName: "EU Regional Host",
          email: "eu@tundra.com",
          country: "DE",
          region: "Europe West",
          isAdmin: true,
          isTeam1Host: true,
          adminRegions: ["Europe West"],
          createdAt: new Date()
        },
        {
          _id: new ObjectId(),
          walletAddress: "0xcccccccccccccccccccccccccccccccccccccccc",
          username: "apachost",
          displayName: "APAC Regional Host",
          email: "apac@tundra.com",
          country: "JP",
          region: "Asia Pacific",
          isAdmin: true,
          isTeam1Host: true,
          adminRegions: ["Asia Pacific"],
          createdAt: new Date()
        },
        {
          _id: new ObjectId(),
          walletAddress: "0xdddddddddddddddddddddddddddddddddddddddd",
          username: "sahost",
          displayName: "SA Regional Host",
          email: "sa@tundra.com",
          country: "BR",
          region: "South America",
          isAdmin: true,
          isTeam1Host: true,
          adminRegions: ["South America"],
          createdAt: new Date()
        }
      ];
      
      await db.collection("users").insertMany(regionalHosts);
      console.log("\n✅ Created regional hosts");
    } else {
      console.log("\nℹ️  Regional hosts already exist");
    }
    
    // Show updated matches
    const updatedMatches = await db.collection("matches").find({ bracketId: bracket._id }).toArray();
    
    console.log("\n🎯 CS2 Tournament matches now awaiting dual-host confirmation:");
    updatedMatches.forEach((match, index) => {
      console.log(`${index + 1}. ${match.team1.name} vs ${match.team2.name}`);
      console.log(`   Round: ${match.round}`);
      console.log(`   Host regions: ${match.hostRegions.join(' + ')}`);
      console.log(`   Status: ${match.status}`);
      console.log(`   Date: ${new Date(match.scheduledTime).toLocaleDateString()}`);
      console.log();
    });
    
    console.log("✅ Successfully modified existing CS2 tournament for dual-host confirmation!");
    console.log("🎮 Now the original CS2 tournament matches need regional host results!");
    
  } catch (error) {
    console.error("Error modifying CS2 tournament:", error);
  } finally {
    await client.close();
  }
}

modifyExistingCS2ForResults();