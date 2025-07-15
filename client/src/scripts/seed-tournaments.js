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
      { _id: new ObjectId(), name: "Summit Legends", region: "North America", organizer: "0x123...abc", tournamentId: cs2TournamentId, registeredAt: new Date(), players: [
        { id: "1", name: "Player1" }, { id: "2", name: "Player2" }, { id: "3", name: "Player3" }
      ]},
      { _id: new ObjectId(), name: "Arctic Wolves", region: "Europe West", organizer: "0x456...def", tournamentId: cs2TournamentId, registeredAt: new Date(), players: [
        { id: "4", name: "Player4" }, { id: "5", name: "Player5" }, { id: "6", name: "Player6" }
      ]},
      { _id: new ObjectId(), name: "Cyber Tigers", region: "Asia Pacific", organizer: "0x789...ghi", tournamentId: cs2TournamentId, registeredAt: new Date(), players: [
        { id: "7", name: "Player7" }, { id: "8", name: "Player8" }, { id: "9", name: "Player9" }
      ]},
      { _id: new ObjectId(), name: "Storm Raiders", region: "South America", organizer: "0xabc...jkl", tournamentId: cs2TournamentId, registeredAt: new Date(), players: [
        { id: "10", name: "Player10" }, { id: "11", name: "Player11" }, { id: "12", name: "Player12" }
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
      winner: cs2Teams[0], // Summit Legends wins
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
        winner: cs2Teams[0], // Summit Legends wins
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
        winner: cs2Teams[0], // Summit Legends wins championship
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
      { _id: new ObjectId(), name: "Phoenix Squad", region: "North America", organizer: "0x111...222", tournamentId: valorantTournamentId, registeredAt: new Date(), players: [
        { id: "13", name: "PlayerA" }, { id: "14", name: "PlayerB" }, { id: "15", name: "PlayerC" }
      ]},
      { _id: new ObjectId(), name: "Viper Elite", region: "Europe West", organizer: "0x333...444", tournamentId: valorantTournamentId, registeredAt: new Date(), players: [
        { id: "16", name: "PlayerD" }, { id: "17", name: "PlayerE" }, { id: "18", name: "PlayerF" }
      ]},
      { _id: new ObjectId(), name: "Sage Masters", region: "Asia Pacific", organizer: "0x555...666", tournamentId: valorantTournamentId, registeredAt: new Date(), players: [
        { id: "19", name: "PlayerG" }, { id: "20", name: "PlayerH" }, { id: "21", name: "PlayerI" }
      ]},
      { _id: new ObjectId(), name: "Jett Force", region: "South America", organizer: "0x777...888", tournamentId: valorantTournamentId, registeredAt: new Date(), players: [
        { id: "22", name: "PlayerJ" }, { id: "23", name: "PlayerK" }, { id: "24", name: "PlayerL" }
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
        winner: valorantTeams[0], // Phoenix Squad wins
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
      { _id: new ObjectId(), name: "Rift Guardians", region: "North America", organizer: "0xaaa...bbb", tournamentId: lolTournamentId, registeredAt: new Date(), players: [
        { id: "25", name: "PlayerM" }, { id: "26", name: "PlayerN" }, { id: "27", name: "PlayerO" }
      ]},
      { _id: new ObjectId(), name: "Nexus Destroyers", region: "Europe West", organizer: "0xccc...ddd", tournamentId: lolTournamentId, registeredAt: new Date(), players: [
        { id: "28", name: "PlayerP" }, { id: "29", name: "PlayerQ" }, { id: "30", name: "PlayerR" }
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