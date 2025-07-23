const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

async function createExactTournaments() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db("tundra");
    
    console.log("🧹 Removing all current tournaments...\n");
    
    // Clear all tournament data
    await db.collection("tournaments").deleteMany({});
    await db.collection("teams").deleteMany({});
    await db.collection("brackets").deleteMany({});
    await db.collection("matches").deleteMany({});
    
    console.log("✅ Cleared all existing tournament data\n");
    
    // 1. Create CS2 Tournament with 8 teams
    const cs2TournamentId = new ObjectId();
    const cs2Tournament = {
      _id: cs2TournamentId,
      game: "CS2",
      maxTeams: 8,
      registeredTeams: 8, // Full tournament
      status: "full",
      createdAt: new Date()
    };
    
    await db.collection("tournaments").insertOne(cs2Tournament);
    
    // Create 8 teams for CS2
    const cs2Teams = [
      { 
        _id: new ObjectId(), 
        name: "Avalanche Peaks", 
        region: "North America", 
        country: "US",
        organizer: "0x1111111111111111111111111111111111111111", 
        tournamentId: cs2TournamentId, 
        registeredAt: new Date()
      },
      { 
        _id: new ObjectId(), 
        name: "AVAX Titans", 
        region: "Europe West", 
        country: "DE",
        organizer: "0x2222222222222222222222222222222222222222", 
        tournamentId: cs2TournamentId, 
        registeredAt: new Date()
      },
      { 
        _id: new ObjectId(), 
        name: "Red Subnet", 
        region: "Asia Pacific", 
        country: "JP",
        organizer: "0x3333333333333333333333333333333333333333", 
        tournamentId: cs2TournamentId, 
        registeredAt: new Date()
      },
      { 
        _id: new ObjectId(), 
        name: "Validator Squad", 
        region: "South America", 
        country: "BR",
        organizer: "0x4444444444444444444444444444444444444444", 
        tournamentId: cs2TournamentId, 
        registeredAt: new Date()
      },
      { 
        _id: new ObjectId(), 
        name: "Fuji Warriors", 
        region: "Europe West", 
        country: "FR",
        organizer: "0x5555555555555555555555555555555555555555", 
        tournamentId: cs2TournamentId, 
        registeredAt: new Date()
      },
      { 
        _id: new ObjectId(), 
        name: "C-Chain Elite", 
        region: "Asia Pacific", 
        country: "KR",
        organizer: "0x6666666666666666666666666666666666666666", 
        tournamentId: cs2TournamentId, 
        registeredAt: new Date()
      },
      { 
        _id: new ObjectId(), 
        name: "Snowfall Guild", 
        region: "North America", 
        country: "CA",
        organizer: "0x7777777777777777777777777777777777777777", 
        tournamentId: cs2TournamentId, 
        registeredAt: new Date()
      },
      { 
        _id: new ObjectId(), 
        name: "JOE Traders", 
        region: "South America", 
        country: "AR",
        organizer: "0x8888888888888888888888888888888888888888", 
        tournamentId: cs2TournamentId, 
        registeredAt: new Date()
      }
    ];
    
    await db.collection("teams").insertMany(cs2Teams);
    
    console.log("✅ Created CS2 Tournament (8/8 teams)");
    cs2Teams.forEach((team, i) => {
      console.log(`   ${i+1}. ${team.name} (${team.country}) - ${team.region}`);
    });
    
    // 2. Create Dota Tournament with only 2 teams (NZ and Germany)
    const dotaTournamentId = new ObjectId();
    const dotaTournament = {
      _id: dotaTournamentId,
      game: "Dota",
      maxTeams: 8,
      registeredTeams: 2, // Only 2 teams
      status: "open",
      createdAt: new Date()
    };
    
    await db.collection("tournaments").insertOne(dotaTournament);
    
    // Create 2 teams: New Zealand vs Germany
    const dotaTeams = [
      { 
        _id: new ObjectId(), 
        name: "Kiwi Heroes", 
        region: "Oceania", 
        country: "NZ",
        organizer: "0x9999999999999999999999999999999999999999", 
        tournamentId: dotaTournamentId, 
        registeredAt: new Date()
      },
      { 
        _id: new ObjectId(), 
        name: "Pangolin Protocol", 
        region: "Europe West", 
        country: "DE",
        organizer: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", 
        tournamentId: dotaTournamentId, 
        registeredAt: new Date()
      }
    ];
    
    await db.collection("teams").insertMany(dotaTeams);
    
    console.log("\n✅ Created Dota Tournament (2/8 teams)");
    dotaTeams.forEach((team, i) => {
      console.log(`   ${i+1}. ${team.name} (${team.country}) - ${team.region}`);
    });
    
    console.log("\n🎯 Setup Complete!");
    console.log("1. CS2 Tournament: 8/8 teams (full, ready for match generation)");
    console.log("2. Dota Tournament: 2/8 teams (New Zealand vs Germany, needs 6 more teams)");
    
  } catch (error) {
    console.error("Error creating tournaments:", error);
  } finally {
    await client.close();
  }
}

createExactTournaments();