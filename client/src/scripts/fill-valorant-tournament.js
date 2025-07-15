const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

async function fillValorantTournament() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db("tundra");
    
    console.log("📈 Adding teams to Valorant tournament to test auto-generation...\n");
    
    // Find the Valorant tournament
    const valorantTournament = await db.collection("tournaments").findOne({ game: "Valorant" });
    
    if (!valorantTournament) {
      console.log("❌ No Valorant tournament found");
      return;
    }
    
    console.log(`Current Valorant tournament: ${valorantTournament.registeredTeams}/${valorantTournament.maxTeams} teams`);
    
    // Add 6 more teams to make it 8/8 (full)
    const additionalTeams = [
      { 
        _id: new ObjectId(), 
        name: "Tokyo Tigers", 
        region: "Asia Pacific", 
        country: "JP",
        organizer: "0x7777777777777777777777777777777777777777", 
        tournamentId: valorantTournament._id, 
        registeredAt: new Date()
      },
      { 
        _id: new ObjectId(), 
        name: "LA Legends", 
        region: "North America", 
        country: "US",
        organizer: "0x8888888888888888888888888888888888888888", 
        tournamentId: valorantTournament._id, 
        registeredAt: new Date()
      },
      { 
        _id: new ObjectId(), 
        name: "London Lions", 
        region: "Europe West", 
        country: "GB",
        organizer: "0x9999999999999999999999999999999999999999", 
        tournamentId: valorantTournament._id, 
        registeredAt: new Date()
      },
      { 
        _id: new ObjectId(), 
        name: "São Paulo Storm", 
        region: "South America", 
        country: "BR",
        organizer: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab", 
        tournamentId: valorantTournament._id, 
        registeredAt: new Date()
      },
      { 
        _id: new ObjectId(), 
        name: "Mumbai Masters", 
        region: "Asia Pacific", 
        country: "IN",
        organizer: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaac", 
        tournamentId: valorantTournament._id, 
        registeredAt: new Date()
      },
      { 
        _id: new ObjectId(), 
        name: "Toronto Titans", 
        region: "North America", 
        country: "CA",
        organizer: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaad", 
        tournamentId: valorantTournament._id, 
        registeredAt: new Date()
      }
    ];
    
    await db.collection("teams").insertMany(additionalTeams);
    
    // Update tournament to be full
    await db.collection("tournaments").updateOne(
      { _id: valorantTournament._id },
      { 
        $set: { 
          registeredTeams: 8,
          status: "full"
        }
      }
    );
    
    console.log("✅ Added 6 more teams to Valorant tournament");
    console.log("📊 Valorant tournament is now 8/8 teams (FULL)");
    
    // List all teams
    const allTeams = await db.collection("teams").find({ 
      tournamentId: valorantTournament._id 
    }).toArray();
    
    console.log("\n🎮 All Valorant Tournament Teams:");
    allTeams.forEach((team, i) => {
      console.log(`${i+1}. ${team.name} (${team.country}) - ${team.region}`);
    });
    
    console.log("\n🎯 Tournament is now full! Run the auto-generation script to create matches.");
    
  } catch (error) {
    console.error("Error filling Valorant tournament:", error);
  } finally {
    await client.close();
  }
}

fillValorantTournament();