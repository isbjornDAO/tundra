const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

async function seedCS2ResultsScenario() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db("tundra");
    
    // Clear existing data
    await db.collection("tournaments").deleteMany({});
    await db.collection("teams").deleteMany({});
    await db.collection("brackets").deleteMany({});
    await db.collection("matches").deleteMany({});
    
    console.log("Cleared existing data");
    
    // Create CS2 tournament
    const cs2TournamentId = new ObjectId();
    const cs2Tournament = {
      _id: cs2TournamentId,
      game: "CS2",
      maxTeams: 4,
      registeredTeams: 4,
      status: "active",
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    };
    
    await db.collection("tournaments").insertOne(cs2Tournament);
    
    // Create teams from different regions
    const cs2Teams = [
      { 
        _id: new ObjectId(), 
        name: "NA Eagles", 
        region: "North America", 
        country: "US",
        organizer: "0x1111111111111111111111111111111111111111", 
        tournamentId: cs2TournamentId, 
        registeredAt: new Date(), 
        players: [
          { id: "1", name: "Eagle1", walletAddress: "0x1111111111111111111111111111111111111111" },
          { id: "2", name: "Eagle2", walletAddress: "0x1111111111111111111111111111111111111112" }
        ]
      },
      { 
        _id: new ObjectId(), 
        name: "EU Lions", 
        region: "Europe West", 
        country: "DE",
        organizer: "0x2222222222222222222222222222222222222222", 
        tournamentId: cs2TournamentId, 
        registeredAt: new Date(), 
        players: [
          { id: "3", name: "Lion1", walletAddress: "0x2222222222222222222222222222222222222222" },
          { id: "4", name: "Lion2", walletAddress: "0x2222222222222222222222222222222222222223" }
        ]
      },
      { 
        _id: new ObjectId(), 
        name: "APAC Dragons", 
        region: "Asia Pacific", 
        country: "JP",
        organizer: "0x3333333333333333333333333333333333333333", 
        tournamentId: cs2TournamentId, 
        registeredAt: new Date(), 
        players: [
          { id: "5", name: "Dragon1", walletAddress: "0x3333333333333333333333333333333333333333" },
          { id: "6", name: "Dragon2", walletAddress: "0x3333333333333333333333333333333333333334" }
        ]
      },
      { 
        _id: new ObjectId(), 
        name: "SA Jaguars", 
        region: "South America", 
        country: "BR",
        organizer: "0x4444444444444444444444444444444444444444", 
        tournamentId: cs2TournamentId, 
        registeredAt: new Date(), 
        players: [
          { id: "7", name: "Jaguar1", walletAddress: "0x4444444444444444444444444444444444444444" },
          { id: "8", name: "Jaguar2", walletAddress: "0x4444444444444444444444444444444444444445" }
        ]
      }
    ];
    
    await db.collection("teams").insertMany(cs2Teams);
    
    // Create bracket
    const cs2BracketId = new ObjectId();
    const cs2Bracket = {
      _id: cs2BracketId,
      tournamentId: cs2TournamentId,
      teams: cs2Teams,
      status: "active",
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    };
    
    await db.collection("brackets").insertOne(cs2Bracket);
    
    // Create matches - Semi-finals with dates that have PASSED (Jan 23rd has passed)
    const pastMatchDate = new Date('2024-01-23T18:00:00Z'); // January 23rd, 2024 - PAST DATE
    const cs2Matches = [
      // Semi-final 1: NA Eagles vs EU Lions (NEEDS RESULTS)
      {
        _id: new ObjectId(),
        bracketId: cs2BracketId,
        team1: cs2Teams[0], // NA Eagles
        team2: cs2Teams[1], // EU Lions
        round: "semi",
        status: "awaiting_results", // New status for matches needing confirmation
        scheduledTime: pastMatchDate,
        confirmedDate: pastMatchDate,
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        resultsSubmitted: [], // Array to track host submissions
        needsConfirmation: true,
        hostRegions: ["North America", "Europe West"] // Regions that need to confirm
      },
      // Semi-final 2: APAC Dragons vs SA Jaguars (NEEDS RESULTS)  
      {
        _id: new ObjectId(),
        bracketId: cs2BracketId,
        team1: cs2Teams[2], // APAC Dragons
        team2: cs2Teams[3], // SA Jaguars
        round: "semi",
        status: "awaiting_results",
        scheduledTime: pastMatchDate,
        confirmedDate: pastMatchDate,
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        resultsSubmitted: [],
        needsConfirmation: true,
        hostRegions: ["Asia Pacific", "South America"]
      }
    ];
    
    await db.collection("matches").insertMany(cs2Matches);
    
    // Create regional hosts for result confirmation
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
    
    console.log("Successfully seeded CS2 tournament scenario!");
    console.log("- CS2 tournament: ACTIVE with 4 teams");
    console.log("- 2 Semi-final matches: AWAITING RESULTS (date has passed)");
    console.log("- 4 Regional hosts created for result confirmation");
    console.log("- Match date: January 23rd, 2024 (PAST DATE)");
    console.log("");
    console.log("Regional Hosts:");
    regionalHosts.forEach(host => {
      console.log(`- ${host.displayName} (${host.region}): ${host.walletAddress}`);
    });
    console.log("");
    console.log("Matches needing results:");
    console.log("1. NA Eagles vs EU Lions (hosts: NA + EU)");
    console.log("2. APAC Dragons vs SA Jaguars (hosts: APAC + SA)");
    
  } catch (error) {
    console.error("Error seeding data:", error);
  } finally {
    await client.close();
  }
}

seedCS2ResultsScenario();