const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

async function updateBracketPlaceholders() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db("tundra");
    
    console.log("🔍 Finding matches with old placeholder format...");
    
    // Find all matches with old placeholder names
    const oldPlaceholderPatterns = [
      'Winner of QF',
      'Winner of SF'
    ];
    
    const matches = await db.collection("matches").find({
      $or: [
        { "team1.name": { $regex: "^Winner of", $options: "i" } },
        { "team2.name": { $regex: "^Winner of", $options: "i" } }
      ]
    }).toArray();
    
    console.log(`📋 Found ${matches.length} matches with old placeholder format`);
    
    let updatedCount = 0;
    
    for (const match of matches) {
      let updateData = {};
      let needsUpdate = false;
      
      // Update team1 if it's a placeholder
      if (match.team1?.name && match.team1.name.startsWith('Winner of')) {
        const newName = match.team1.name
          .replace('Winner of QF', '🏆 QF')
          .replace('Winner of SF', '🏆 SF') + ' Winner';
        
        updateData.team1 = { ...match.team1, name: newName };
        needsUpdate = true;
      }
      
      // Update team2 if it's a placeholder
      if (match.team2?.name && match.team2.name.startsWith('Winner of')) {
        const newName = match.team2.name
          .replace('Winner of QF', '🏆 QF')
          .replace('Winner of SF', '🏆 SF') + ' Winner';
        
        updateData.team2 = { ...match.team2, name: newName };
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await db.collection("matches").updateOne(
          { _id: match._id },
          { $set: updateData }
        );
        
        console.log(`✅ Updated match ${match._id}:`);
        if (updateData.team1) {
          console.log(`   Team1: "${match.team1.name}" → "${updateData.team1.name}"`);
        }
        if (updateData.team2) {
          console.log(`   Team2: "${match.team2.name}" → "${updateData.team2.name}"`);
        }
        
        updatedCount++;
      }
    }
    
    console.log(`\n🎯 Updated ${updatedCount} matches with new placeholder format`);
    console.log("✅ Bracket placeholders now clearly indicate they are awaiting winners!");
    console.log("\n📝 Changes made:");
    console.log("• 'Winner of QF1' → '🏆 QF1 Winner'");
    console.log("• 'Winner of SF1' → '🏆 SF1 Winner'");
    console.log("• Added trophy emoji to make it clear these are advancement placeholders");
    
  } catch (error) {
    console.error("❌ Error updating bracket placeholders:", error);
  } finally {
    await client.close();
  }
}

updateBracketPlaceholders();