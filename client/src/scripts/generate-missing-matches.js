const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function generateBracket(teams) {
  if (teams.length < 2) {
    throw new Error('Need at least 2 teams for a bracket');
  }
  
  const shuffledTeams = shuffleArray(teams);
  const matches = [];
  
  // Generate first round matches
  for (let i = 0; i < shuffledTeams.length; i += 2) {
    if (i + 1 < shuffledTeams.length) {
      matches.push({
        team1: shuffledTeams[i],
        team2: shuffledTeams[i + 1],
        round: shuffledTeams.length > 4 ? 'quarterfinal' : 'semifinal'
      });
    }
  }
  
  // Add progression matches
  if (shuffledTeams.length === 8) {
    // Add semifinal placeholders
    for (let i = 0; i < 2; i++) {
      matches.push({
        team1: { name: `🏆 QF${i*2 + 1} Winner` },
        team2: { name: `🏆 QF${i*2 + 2} Winner` },
        round: 'semifinal'
      });
    }
    
    // Add final placeholder
    matches.push({
      team1: { name: '🏆 SF1 Winner' },
      team2: { name: '🏆 SF2 Winner' },
      round: 'final'
    });
  } else if (shuffledTeams.length === 4) {
    matches.push({
      team1: { name: '🏆 SF1 Winner' },
      team2: { name: '🏆 SF2 Winner' },
      round: 'final'
    });
  }
  
  return matches;
}

async function generateMissingMatches() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db("tundra");
    
    console.log("🎯 Checking tournaments for missing matches...\n");
    
    const tournaments = await db.collection("tournaments").find({
      status: { $in: ["active", "full"] },
      $expr: { $gte: ["$registeredTeams", 4] } // Only tournaments with enough teams
    }).toArray();
    
    for (const tournament of tournaments) {
      console.log(`\n🏆 ${tournament.game} Tournament (${tournament.registeredTeams}/${tournament.maxTeams} teams)`);
      
      // Get bracket
      const bracket = await db.collection("brackets").findOne({ 
        tournamentId: tournament._id 
      });
      
      if (!bracket) {
        console.log("   ❌ No bracket found, skipping");
        continue;
      }
      
      // Check existing matches
      const existingMatches = await db.collection("matches").find({ 
        bracketId: bracket._id 
      }).toArray();
      
      // Get teams
      const teams = await db.collection("teams").find({ 
        tournamentId: tournament._id 
      }).toArray();
      
      console.log(`   📋 ${teams.length} teams, ${existingMatches.length} existing matches`);
      
      // For tournaments that need more matches
      const expectedMatches = teams.length === 8 ? 7 : teams.length === 4 ? 3 : teams.length - 1;
      
      if (existingMatches.length >= expectedMatches) {
        console.log(`   ✅ Tournament has sufficient matches`);
        continue;
      }
      
      // Generate missing matches if this is Valorant (which should have normal tournament flow)
      if (tournament.game === "Valorant" && existingMatches.length < expectedMatches) {
        console.log(`   🎮 Generating missing matches for ${tournament.game}...`);
        
        // Clear existing matches and regenerate full bracket
        await db.collection("matches").deleteMany({ bracketId: bracket._id });
        
        const matchTemplates = generateBracket(teams);
        const matches = matchTemplates.map((template, index) => ({
          _id: new ObjectId(),
          bracketId: bracket._id,
          team1: template.team1,
          team2: template.team2,
          round: template.round,
          status: template.team1._id && template.team2._id ? "scheduled" : "pending",
          scheduledTime: new Date(Date.now() + (index + 1) * 3 * 60 * 60 * 1000), // 3 hours apart
          createdAt: new Date()
        }));
        
        await db.collection("matches").insertMany(matches);
        console.log(`   ✅ Generated ${matches.length} matches`);
        
        matches.forEach((match, i) => {
          console.log(`      ${i+1}. ${match.team1.name} vs ${match.team2.name} (${match.round})`);
        });
      }
    }
    
    console.log("\n✅ Missing match generation complete!");
    
  } catch (error) {
    console.error("Error generating missing matches:", error);
  } finally {
    await client.close();
  }
}

generateMissingMatches();