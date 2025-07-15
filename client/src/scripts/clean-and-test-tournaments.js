const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

async function cleanAndTestTournaments() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db("tundra");
    
    console.log("🧹 Cleaning existing tournaments...\n");
    
    // Clear all tournament data
    await db.collection("tournaments").deleteMany({});
    await db.collection("teams").deleteMany({});
    await db.collection("brackets").deleteMany({});
    await db.collection("matches").deleteMany({});
    
    console.log("✅ Cleared all existing tournament data\n");
    
    // Create Test Tournament 1 - CS2 (4 teams to test auto-generation)
    const cs2TournamentId = new ObjectId();
    const cs2Tournament = {
      _id: cs2TournamentId,
      game: "CS2",
      maxTeams: 4,
      registeredTeams: 4, // Full tournament
      status: "full",
      createdAt: new Date()
    };
    
    await db.collection("tournaments").insertOne(cs2Tournament);
    
    // Create 4 teams for CS2
    const cs2Teams = [
      { 
        _id: new ObjectId(), 
        name: "Test Eagles", 
        region: "North America", 
        country: "US",
        organizer: "0x1111111111111111111111111111111111111111", 
        tournamentId: cs2TournamentId, 
        registeredAt: new Date()
      },
      { 
        _id: new ObjectId(), 
        name: "Test Lions", 
        region: "Europe West", 
        country: "DE",
        organizer: "0x2222222222222222222222222222222222222222", 
        tournamentId: cs2TournamentId, 
        registeredAt: new Date()
      },
      { 
        _id: new ObjectId(), 
        name: "Test Dragons", 
        region: "Asia Pacific", 
        country: "JP",
        organizer: "0x3333333333333333333333333333333333333333", 
        tournamentId: cs2TournamentId, 
        registeredAt: new Date()
      },
      { 
        _id: new ObjectId(), 
        name: "Test Jaguars", 
        region: "South America", 
        country: "BR",
        organizer: "0x4444444444444444444444444444444444444444", 
        tournamentId: cs2TournamentId, 
        registeredAt: new Date()
      }
    ];
    
    await db.collection("teams").insertMany(cs2Teams);
    
    console.log("✅ Created CS2 Tournament (4/4 teams) - ready to test auto-generation");
    
    // Create Test Tournament 2 - Valorant (only 2 teams: NZ vs Germany)
    const valorantTournamentId = new ObjectId();
    const valorantTournament = {
      _id: valorantTournamentId,
      game: "Valorant",
      maxTeams: 8,
      registeredTeams: 2, // Only 2 teams
      status: "open",
      createdAt: new Date()
    };
    
    await db.collection("tournaments").insertOne(valorantTournament);
    
    // Create 2 teams: New Zealand vs Germany
    const valorantTeams = [
      { 
        _id: new ObjectId(), 
        name: "Kiwi Warriors", 
        region: "Oceania", 
        country: "NZ",
        organizer: "0x5555555555555555555555555555555555555555", 
        tournamentId: valorantTournamentId, 
        registeredAt: new Date()
      },
      { 
        _id: new ObjectId(), 
        name: "Berlin Blitz", 
        region: "Europe West", 
        country: "DE",
        organizer: "0x6666666666666666666666666666666666666666", 
        tournamentId: valorantTournamentId, 
        registeredAt: new Date()
      }
    ];
    
    await db.collection("teams").insertMany(valorantTeams);
    
    console.log("✅ Created Valorant Tournament (2/8 teams) - New Zealand vs Germany");
    
    console.log("\n🎯 Test Setup Complete!");
    console.log("1. CS2 Tournament: 4/4 teams (should auto-generate matches)");
    console.log("2. Valorant Tournament: 2/8 teams (New Zealand vs Germany)");
    console.log("\nNext steps:");
    console.log("- Run auto-generation script to test CS2 match creation");
    console.log("- Register 6 more teams to Valorant to test auto-generation");
    
  } catch (error) {
    console.error("Error setting up test tournaments:", error);
  } finally {
    await client.close();
  }
}

cleanAndTestTournaments();