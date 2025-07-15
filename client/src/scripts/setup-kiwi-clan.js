const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

// @neo's wallet address for testing - you can update this with the actual address
const NEO_WALLET_ADDRESS = "0x742d35cc6634c0532925a3b8d19d6f7de9e18b";

async function setupKiwiClan() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db("tundra");
    
    console.log("🔍 Finding current active Valorant tournament...");
    
    // Find the active Valorant tournament
    const valorantTournament = await db.collection("tournaments").findOne({
      game: "Valorant",
      status: "active"
    });
    
    if (!valorantTournament) {
      console.log("❌ No active Valorant tournament found. Please run seed-tournaments.js first.");
      return;
    }
    
    console.log(`✅ Found Valorant tournament: ${valorantTournament._id}`);
    
    // Find teams for this tournament
    const teams = await db.collection("teams").find({
      tournamentId: valorantTournament._id
    }).toArray();
    
    if (teams.length === 0) {
      console.log("❌ No teams found for the Valorant tournament.");
      return;
    }
    
    console.log(`📋 Found ${teams.length} teams in the tournament:`);
    teams.forEach((team, index) => {
      console.log(`${index + 1}. ${team.name} (organizer: ${team.organizer})`);
    });
    
    // Update the first team to be KIWI clan with @neo as organizer
    const teamToUpdate = teams[0];
    const updatedTeam = {
      ...teamToUpdate,
      name: "KIWI",
      organizer: NEO_WALLET_ADDRESS,
      players: [
        { id: "neo1", name: "Neo" },
        { id: "neo2", name: "Kiwi_Player_2" },
        { id: "neo3", name: "Kiwi_Player_3" }
      ]
    };
    
    // Update the team in the database
    await db.collection("teams").replaceOne(
      { _id: teamToUpdate._id },
      updatedTeam
    );
    
    console.log(`✅ Updated team "${teamToUpdate.name}" to "KIWI" clan`);
    console.log(`✅ Set organizer to: ${NEO_WALLET_ADDRESS}`);
    
    // Update the bracket data as well
    const bracket = await db.collection("brackets").findOne({
      tournamentId: valorantTournament._id
    });
    
    if (bracket) {
      // Update the team in the bracket's teams array
      const updatedTeams = bracket.teams.map(team => 
        team._id.toString() === teamToUpdate._id.toString() ? updatedTeam : team
      );
      
      await db.collection("brackets").updateOne(
        { _id: bracket._id },
        { $set: { teams: updatedTeams } }
      );
      
      console.log("✅ Updated bracket with KIWI team data");
    }
    
    // Update any matches that involve this team
    const matches = await db.collection("matches").find({
      bracketId: bracket._id,
      $or: [
        { "team1._id": teamToUpdate._id },
        { "team2._id": teamToUpdate._id }
      ]
    }).toArray();
    
    for (const match of matches) {
      let updateData = {};
      
      if (match.team1._id.toString() === teamToUpdate._id.toString()) {
        updateData.team1 = updatedTeam;
      }
      
      if (match.team2._id.toString() === teamToUpdate._id.toString()) {
        updateData.team2 = updatedTeam;
      }
      
      if (Object.keys(updateData).length > 0) {
        await db.collection("matches").updateOne(
          { _id: match._id },
          { $set: updateData }
        );
        console.log(`✅ Updated match ${match._id} with KIWI team data`);
      }
    }
    
    console.log("\n🎮 KIWI Clan Setup Complete!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`🏆 Tournament: ${valorantTournament.game} (${valorantTournament.status})`);
    console.log(`👥 Team: KIWI`);
    console.log(`🏠 Organizer: ${NEO_WALLET_ADDRESS}`);
    console.log(`⚡ Status: Ready for time coordination testing`);
    console.log("\n📝 Testing Instructions:");
    console.log("1. Login with the wallet address above");
    console.log("2. Navigate to the Valorant tournament bracket");
    console.log("3. You should be able to propose and approve match times as KIWI clan leader");
    console.log("4. Test the time coordination module functionality");
    
  } catch (error) {
    console.error("❌ Error setting up KIWI clan:", error);
  } finally {
    await client.close();
  }
}

setupKiwiClan();