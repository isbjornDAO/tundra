const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

async function addCS2ResultsScenario() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db("tundra");
    
    console.log("Adding CS2 results confirmation scenario...\n");
    
    // Create a NEW CS2 tournament for results confirmation (separate from existing completed one)
    const cs2ResultsTournamentId = new ObjectId();
    const cs2ResultsTournament = {
      _id: cs2ResultsTournamentId,
      game: "CS2",
      name: "CS2 Semi-Finals (Results Pending)",
      maxTeams: 4,
      registeredTeams: 4,
      status: "active",
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    };
    
    await db.collection("tournaments").insertOne(cs2ResultsTournament);
    
    // Create teams from different regions for the results scenario
    const cs2ResultsTeams = [
      { 
        _id: new ObjectId(), 
        name: "NA Eagles", 
        region: "North America", 
        country: "US",
        organizer: "0x1111111111111111111111111111111111111111", 
        tournamentId: cs2ResultsTournamentId, 
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
        tournamentId: cs2ResultsTournamentId, 
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
        tournamentId: cs2ResultsTournamentId, 
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
        tournamentId: cs2ResultsTournamentId, 
        registeredAt: new Date(), 
        players: [
          { id: "7", name: "Jaguar1", walletAddress: "0x4444444444444444444444444444444444444444" },
          { id: "8", name: "Jaguar2", walletAddress: "0x4444444444444444444444444444444444444445" }
        ]
      }
    ];
    
    await db.collection("teams").insertMany(cs2ResultsTeams);
    
    // Create bracket for results scenario
    const cs2ResultsBracketId = new ObjectId();
    const cs2ResultsBracket = {
      _id: cs2ResultsBracketId,
      tournamentId: cs2ResultsTournamentId,
      teams: cs2ResultsTeams,
      status: "active",
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    };
    
    await db.collection("brackets").insertOne(cs2ResultsBracket);
    
    // Create matches - Semi-finals with dates that have PASSED (Jan 23rd has passed)
    const pastMatchDate = new Date('2024-01-23T18:00:00Z'); // January 23rd, 2024 - PAST DATE
    const cs2ResultsMatches = [
      // Semi-final 1: NA Eagles vs EU Lions (NEEDS RESULTS)
      {
        _id: new ObjectId(),
        bracketId: cs2ResultsBracketId,
        team1: cs2ResultsTeams[0], // NA Eagles
        team2: cs2ResultsTeams[1], // EU Lions
        round: "semi",
        status: "awaiting_results", // Status for matches needing confirmation
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
        bracketId: cs2ResultsBracketId,
        team1: cs2ResultsTeams[2], // APAC Dragons
        team2: cs2ResultsTeams[3], // SA Jaguars
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
    
    await db.collection("matches").insertMany(cs2ResultsMatches);
    
    // Create regional hosts for result confirmation (only if they don't exist)
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
      console.log("✅ Created regional hosts");
    } else {
      console.log("ℹ️  Regional hosts already exist");
    }
    
    console.log("✅ Successfully added CS2 results confirmation scenario!");
    console.log("\nNow you have:");
    console.log("- Original CS2 tournament: COMPLETED with winner");
    console.log("- Valorant tournament: ACTIVE with ongoing matches");
    console.log("- League of Legends tournament: OPEN for registration");
    console.log("- NEW CS2 Semi-Finals: AWAITING RESULTS (date has passed)");
    console.log("");
    console.log("📊 CS2 Semi-Finals matches needing host confirmation:");
    console.log("1. NA Eagles vs EU Lions (hosts: NA + EU)");
    console.log("2. APAC Dragons vs SA Jaguars (hosts: APAC + SA)");
    console.log("");
    console.log("🎮 Visit /tournaments/results to see the results confirmation interface!");
    
  } catch (error) {
    console.error("Error adding CS2 results scenario:", error);
  } finally {
    await client.close();
  }
}

addCS2ResultsScenario();