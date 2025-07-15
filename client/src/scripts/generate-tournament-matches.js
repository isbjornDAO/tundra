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
  
  // Shuffle teams for random matchups
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
  
  // If we have 8 teams, we need quarterfinals -> semifinals -> final
  if (shuffledTeams.length === 8) {
    // 4 quarterfinal matches -> 2 semifinal matches -> 1 final
    const rounds = ['quarterfinal', 'semifinal', 'final'];
    let currentMatches = matches.length;
    
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
    // 2 semifinal matches -> 1 final
    matches.push({
      team1: { name: '🏆 SF1 Winner' },
      team2: { name: '🏆 SF2 Winner' },
      round: 'final'
    });
  }
  
  return matches;
}

async function generateTournamentMatches() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db("tundra");
    
    console.log("🎯 Generating matches for full tournaments...\n");
    
    // Find tournaments that are full but don't have brackets/matches yet
    const fullTournaments = await db.collection("tournaments").find({
      $expr: { $gte: ["$registeredTeams", "$maxTeams"] },
      status: { $in: ["full", "active"] }
    }).toArray();
    
    for (const tournament of fullTournaments) {
      console.log(`\n🏆 Processing ${tournament.game} Tournament (${tournament.registeredTeams}/${tournament.maxTeams} teams)`);
      
      // Check if bracket already exists
      const existingBracket = await db.collection("brackets").findOne({ 
        tournamentId: tournament._id 
      });
      
      if (existingBracket) {
        console.log(`   ℹ️  Bracket already exists`);
        
        // Check if matches exist
        const existingMatches = await db.collection("matches").find({ 
          bracketId: existingBracket._id 
        }).toArray();
        
        if (existingMatches.length > 0) {
          console.log(`   ℹ️  ${existingMatches.length} matches already exist`);
          continue;
        }
      }
      
      // Get teams for this tournament
      const teams = await db.collection("teams").find({ 
        tournamentId: tournament._id 
      }).toArray();
      
      if (teams.length < 2) {
        console.log(`   ❌ Not enough teams (${teams.length})`);
        continue;
      }
      
      console.log(`   📋 Found ${teams.length} teams:`);
      teams.forEach(team => console.log(`      - ${team.name} (${team.region})`));
      
      // Create bracket if it doesn't exist
      let bracket = existingBracket;
      if (!bracket) {
        const bracketId = new ObjectId();
        bracket = {
          _id: bracketId,
          tournamentId: tournament._id,
          teams: teams,
          status: "active",
          createdAt: new Date()
        };
        
        await db.collection("brackets").insertOne(bracket);
        console.log(`   ✅ Created bracket`);
      }
      
      // Generate matches
      const matchTemplates = generateBracket(teams);
      console.log(`   🎮 Generating ${matchTemplates.length} matches...`);
      
      const matches = matchTemplates.map((template, index) => {
        // For CS2 tournament, add dual-host confirmation to actual team matches
        const isCS2 = tournament.game === "CS2";
        const hasActualTeams = template.team1._id && template.team2._id;
        
        const match = {
          _id: new ObjectId(),
          bracketId: bracket._id,
          team1: template.team1,
          team2: template.team2,
          round: template.round,
          status: hasActualTeams ? "scheduled" : "pending", // pending for placeholder matches
          scheduledTime: new Date(Date.now() + (index + 1) * 2 * 60 * 60 * 1000), // 2 hours apart
          createdAt: new Date()
        };
        
        // Add dual-host confirmation for CS2 matches with actual teams
        if (isCS2 && hasActualTeams) {
          const team1Region = template.team1.region || "North America";
          const team2Region = template.team2.region || "Europe West";
          
          // Set date to past for CS2 as requested (simulate date has passed)
          match.scheduledTime = new Date('2024-01-23T18:00:00Z');
          match.confirmedDate = match.scheduledTime;
          match.status = "awaiting_results";
          match.needsConfirmation = true;
          match.hostRegions = [team1Region, team2Region];
          match.resultsSubmitted = [];
        }
        
        return match;
      });
      
      await db.collection("matches").insertMany(matches);
      
      // Update tournament status to active
      await db.collection("tournaments").updateOne(
        { _id: tournament._id },
        { $set: { status: "active" } }
      );
      
      console.log(`   ✅ Created ${matches.length} matches`);
      
      // Show matches
      matches.forEach((match, index) => {
        const statusInfo = match.needsConfirmation ? 
          ` (needs ${match.hostRegions.join(' + ')} host confirmation)` : '';
        console.log(`      ${index + 1}. ${match.team1.name} vs ${match.team2.name} (${match.round})${statusInfo}`);
      });
    }
    
    console.log("\n✅ Tournament match generation complete!");
    
  } catch (error) {
    console.error("Error generating tournament matches:", error);
  } finally {
    await client.close();
  }
}

generateTournamentMatches();