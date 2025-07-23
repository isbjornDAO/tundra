const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

async function seedTournaments() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db("tundra");
    
    // Clear existing data
    await db.collection("tournaments").deleteMany({});
    await db.collection("teams").deleteMany({});
    await db.collection("brackets").deleteMany({});
    await db.collection("matches").deleteMany({});
    await db.collection("timeSlots").deleteMany({});
    
    console.log("Cleared existing data");
    
    // Create a completed CS2 tournament
    const cs2TournamentId = new ObjectId();
    const cs2Tournament = {
      _id: cs2TournamentId,
      game: "CS2",
      maxTeams: 8,
      registeredTeams: 8,
      status: "completed",
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    };
    
    await db.collection("tournaments").insertOne(cs2Tournament);
    
    // Create teams for CS2 tournament
    const cs2Teams = [
      { _id: new ObjectId(), name: "Avalanche Peaks", region: "North America", organizer: "0x123...abc", tournamentId: cs2TournamentId, registeredAt: new Date(), players: [
        { id: "1", name: "Bear" }, { id: "2", name: "JoeTheTrader" }, { id: "3", name: "Benqi" }
      ]},
      { _id: new ObjectId(), name: "AVAX Titans", region: "Europe West", organizer: "0x456...def", tournamentId: cs2TournamentId, registeredAt: new Date(), players: [
        { id: "4", name: "Penguin" }, { id: "5", name: "ColTrader" }, { id: "6", name: "GMX" }
      ]},
      { _id: new ObjectId(), name: "Red Subnet", region: "Asia Pacific", organizer: "0x789...ghi", tournamentId: cs2TournamentId, registeredAt: new Date(), players: [
        { id: "7", name: "Avalanche" }, { id: "8", name: "PangolinSwap" }, { id: "9", name: "VectorFinance" }
      ]},
      { _id: new ObjectId(), name: "Validator Squad", region: "South America", organizer: "0xabc...jkl", tournamentId: cs2TournamentId, registeredAt: new Date(), players: [
        { id: "10", name: "Lydia" }, { id: "11", name: "Yield_Yak" }, { id: "12", name: "Platypus" }
      ]},
    ];
    
    await db.collection("teams").insertMany(cs2Teams);
    
    // Create bracket for CS2 tournament
    const cs2BracketId = new ObjectId();
    const cs2Bracket = {
      _id: cs2BracketId,
      tournamentId: cs2TournamentId,
      teams: cs2Teams,
      status: "completed",
      winner: cs2Teams[0], // Avalanche Peaks wins
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    };
    
    await db.collection("brackets").insertOne(cs2Bracket);
    
    // Create completed matches for CS2 tournament
    const cs2Matches = [
      // Semi-finals
      {
        _id: new ObjectId(),
        bracketId: cs2BracketId,
        team1: cs2Teams[0],
        team2: cs2Teams[1],
        round: "semi",
        status: "completed",
        organizer1Approved: true,
        organizer2Approved: true,
        winner: cs2Teams[0], // Avalanche Peaks wins
        scheduledTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        _id: new ObjectId(),
        bracketId: cs2BracketId,
        team1: cs2Teams[2],
        team2: cs2Teams[3],
        round: "semi",
        status: "completed",
        organizer1Approved: true,
        organizer2Approved: true,
        winner: cs2Teams[2], // Cyber Tigers wins
        scheduledTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      // Final
      {
        _id: new ObjectId(),
        bracketId: cs2BracketId,
        team1: cs2Teams[0],
        team2: cs2Teams[2],
        round: "final",
        status: "completed",
        organizer1Approved: true,
        organizer2Approved: true,
        winner: cs2Teams[0], // Avalanche Peaks wins championship
        scheduledTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      }
    ];
    
    await db.collection("matches").insertMany(cs2Matches);
    
    // Update tournament with winner
    await db.collection("tournaments").updateOne(
      { _id: cs2TournamentId },
      { $set: { winner: cs2Teams[0], runnerUp: cs2Teams[2] } }
    );
    
    // Create an active Valorant tournament
    const valorantTournamentId = new ObjectId();
    const valorantTournament = {
      _id: valorantTournamentId,
      game: "Valorant", 
      maxTeams: 8,
      registeredTeams: 8,
      status: "active",
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    };
    
    await db.collection("tournaments").insertOne(valorantTournament);
    
    // Create teams for Valorant tournament
    const valorantTeams = [
      { _id: new ObjectId(), name: "Fuji Warriors", region: "North America", organizer: "0x111...222", tournamentId: valorantTournamentId, registeredAt: new Date(), players: [
        { id: "13", name: "Bear" }, { id: "14", name: "Penguin" }, { id: "15", name: "JoeTheTrader" }
      ]},
      { _id: new ObjectId(), name: "C-Chain Elite", region: "Europe West", organizer: "0x333...444", tournamentId: valorantTournamentId, registeredAt: new Date(), players: [
        { id: "16", name: "Benqi" }, { id: "17", name: "Avalanche" }, { id: "18", name: "ColTrader" }
      ]},
      { _id: new ObjectId(), name: "Snowfall Guild", region: "Asia Pacific", organizer: "0x555...666", tournamentId: valorantTournamentId, registeredAt: new Date(), players: [
        { id: "19", name: "PangolinSwap" }, { id: "20", name: "GMX" }, { id: "21", name: "VectorFinance" }
      ]},
      { _id: new ObjectId(), name: "JOE Traders", region: "South America", organizer: "0x777...888", tournamentId: valorantTournamentId, registeredAt: new Date(), players: [
        { id: "22", name: "Lydia" }, { id: "23", name: "Yield_Yak" }, { id: "24", name: "Platypus" }
      ]},
    ];
    
    await db.collection("teams").insertMany(valorantTeams);
    
    // Create bracket for Valorant tournament (active)
    const valorantBracketId = new ObjectId();
    const valorantBracket = {
      _id: valorantBracketId,
      tournamentId: valorantTournamentId,
      teams: valorantTeams,
      status: "active",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    };
    
    await db.collection("brackets").insertOne(valorantBracket);
    
    // Create some matches for Valorant tournament (mix of completed and pending)
    const valorantMatches = [
      // Semi-finals - one completed, one pending
      {
        _id: new ObjectId(),
        bracketId: valorantBracketId,
        team1: valorantTeams[0],
        team2: valorantTeams[1],
        round: "semi",
        status: "completed",
        organizer1Approved: true,
        organizer2Approved: true,
        winner: valorantTeams[0], // Fuji Warriors wins
        scheduledTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        _id: new ObjectId(),
        bracketId: valorantBracketId,
        team1: valorantTeams[2],
        team2: valorantTeams[3],
        round: "semi",
        status: "scheduled",
        organizer1Approved: true,
        organizer2Approved: true,
        scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      }
    ];
    
    await db.collection("matches").insertMany(valorantMatches);
    
    // Create an open League of Legends tournament
    const lolTournamentId = new ObjectId();
    const lolTournament = {
      _id: lolTournamentId,
      game: "League of Legends",
      maxTeams: 16,
      registeredTeams: 4,
      status: "open",
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    };
    
    await db.collection("tournaments").insertOne(lolTournament);
    
    // Create some teams for LoL tournament
    const lolTeams = [
      { _id: new ObjectId(), name: "Subnet Guardians", region: "North America", organizer: "0xaaa...bbb", tournamentId: lolTournamentId, registeredAt: new Date(), players: [
        { id: "25", name: "Bear" }, { id: "26", name: "Penguin" }, { id: "27", name: "JoeTheTrader" }
      ]},
      { _id: new ObjectId(), name: "DeFi Destroyers", region: "Europe West", organizer: "0xccc...ddd", tournamentId: lolTournamentId, registeredAt: new Date(), players: [
        { id: "28", name: "Benqi" }, { id: "29", name: "Avalanche" }, { id: "30", name: "ColTrader" }
      ]},
    ];
    
    await db.collection("teams").insertMany(lolTeams);
    
    console.log("Successfully seeded tournament data!");
    console.log("- CS2 tournament: COMPLETED with winner");
    console.log("- Valorant tournament: ACTIVE with ongoing matches");
    console.log("- League of Legends tournament: OPEN for registration");
    
  } catch (error) {
    console.error("Error seeding data:", error);
  } finally {
    await client.close();
  }
}

seedTournaments();