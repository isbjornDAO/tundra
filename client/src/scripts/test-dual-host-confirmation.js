const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

async function testDualHostConfirmation() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db("tundra");
    
    console.log("🧪 Testing Dual Host Confirmation System\n");
    
    // Find matches awaiting results
    const matches = await db.collection("matches").find({
      status: "awaiting_results",
      needsConfirmation: true
    }).toArray();
    
    if (matches.length === 0) {
      console.log("❌ No matches found that need confirmation");
      return;
    }
    
    console.log(`Found ${matches.length} matches awaiting results:\n`);
    
    for (const match of matches) {
      console.log(`📊 Match: ${match.team1.name} vs ${match.team2.name}`);
      console.log(`   Round: ${match.round}`);
      console.log(`   Host Regions: ${match.hostRegions.join(', ')}`);
      console.log(`   Current Status: ${match.status}`);
      console.log(`   Submissions: ${match.resultsSubmitted.length}`);
      
      // Simulate first host submission (NA/APAC host chooses team1 as winner)
      const firstHostRegion = match.hostRegions[0];
      const firstHostSubmission = {
        hostWalletAddress: firstHostRegion === "North America" ? "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" :
                          firstHostRegion === "Europe West" ? "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" :
                          firstHostRegion === "Asia Pacific" ? "0xcccccccccccccccccccccccccccccccccccccccc" :
                          "0xdddddddddddddddddddddddddddddddddddddddd",
        hostRegion: firstHostRegion,
        winnerTeamId: match.team1._id.toString(),
        winnerTeamName: match.team1.name,
        submittedAt: new Date(),
        notes: `${firstHostRegion} host confirms ${match.team1.name} victory`
      };
      
      // Simulate second host submission (EU/SA host also chooses team1 as winner - they agree)
      const secondHostRegion = match.hostRegions[1];
      const secondHostSubmission = {
        hostWalletAddress: secondHostRegion === "North America" ? "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" :
                          secondHostRegion === "Europe West" ? "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" :
                          secondHostRegion === "Asia Pacific" ? "0xcccccccccccccccccccccccccccccccccccccccc" :
                          "0xdddddddddddddddddddddddddddddddddddddddd",
        hostRegion: secondHostRegion,
        winnerTeamId: match.team1._id.toString(), // Same winner - they agree
        winnerTeamName: match.team1.name,
        submittedAt: new Date(),
        notes: `${secondHostRegion} host confirms ${match.team1.name} victory`
      };
      
      // Update match with both submissions
      const updatedMatch = await db.collection("matches").findOneAndUpdate(
        { _id: match._id },
        {
          $set: {
            resultsSubmitted: [firstHostSubmission, secondHostSubmission],
            status: "completed",
            winner: match.team1,
            completedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      );
      
      console.log(`   ✅ Both hosts submitted results:`);
      console.log(`      ${firstHostRegion} → ${match.team1.name}`);
      console.log(`      ${secondHostRegion} → ${match.team1.name}`);
      console.log(`   🏆 Match confirmed: ${match.team1.name} wins!`);
      console.log(`   📝 Status: ${updatedMatch.status}`);
      console.log();
    }
    
    console.log("🎉 Dual host confirmation test completed!");
    console.log("\nTo test the system:");
    console.log("1. Visit http://localhost:3001/tournaments/results");
    console.log("2. Connect with one of the regional host wallets:");
    console.log("   - NA Host: 0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    console.log("   - EU Host: 0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
    console.log("   - APAC Host: 0xcccccccccccccccccccccccccccccccccccccccc");
    console.log("   - SA Host: 0xdddddddddddddddddddddddddddddddddddddddd");
    console.log("3. Submit match results and see the confirmation system in action!");
    
  } catch (error) {
    console.error("Error testing dual host confirmation:", error);
  } finally {
    await client.close();
  }
}

testDualHostConfirmation();