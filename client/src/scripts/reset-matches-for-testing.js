const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

async function resetMatchesForTesting() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db("tundra");
    
    console.log("🔄 Resetting matches to awaiting_results for testing...\n");
    
    // Find all matches that need to be reset
    const result = await db.collection("matches").updateMany(
      { needsConfirmation: true },
      {
        $set: {
          status: "awaiting_results",
          resultsSubmitted: []
        },
        $unset: {
          winner: "",
          completedAt: ""
        }
      }
    );
    
    console.log(`✅ Reset ${result.modifiedCount} matches to awaiting_results status`);
    
    // Show current matches
    const matches = await db.collection("matches").find({
      needsConfirmation: true
    }).toArray();
    
    console.log(`\n📊 Matches ready for dual-host confirmation:`);
    matches.forEach((match, index) => {
      console.log(`${index + 1}. ${match.team1.name} vs ${match.team2.name}`);
      console.log(`   Host Regions: ${match.hostRegions.join(' + ')}`);
      console.log(`   Status: ${match.status}`);
      console.log(`   Scheduled: ${new Date(match.scheduledTime).toLocaleDateString()}`);
      console.log();
    });
    
    console.log("🎮 Ready for testing! Regional hosts can now submit results.");
    
  } catch (error) {
    console.error("Error resetting matches:", error);
  } finally {
    await client.close();
  }
}

resetMatchesForTesting();