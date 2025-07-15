import mongoose from 'mongoose';

interface Team {
  _id: string;
  name: string;
  region: string;
  [key: string]: any;
}

interface MatchTemplate {
  team1: Team | { name: string };
  team2: Team | { name: string };
  round: string;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function generateBracketMatches(teams: Team[]): MatchTemplate[] {
  if (teams.length < 2) {
    throw new Error('Need at least 2 teams for a bracket');
  }
  
  // Shuffle teams for random matchups
  const shuffledTeams = shuffleArray(teams);
  const matches: MatchTemplate[] = [];
  
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

export async function autoGenerateMatches(tournamentId: string, game: string) {
  try {
    // Import models
    const Tournament = mongoose.models.Tournament;
    const Team = mongoose.models.Team;
    
    // Get teams for this tournament
    const teams = await Team.find({ tournamentId }).lean();
    
    if (teams.length < 2) {
      return false;
    }
    
    // Check if bracket already exists
    const Bracket = mongoose.models.Bracket || mongoose.model('Bracket', new mongoose.Schema({
      tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
      teams: [{ type: Object }],
      status: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    }));
    
    const existingBracket = await Bracket.findOne({ tournamentId });
    
    // Create bracket if it doesn't exist
    let bracket = existingBracket;
    if (!bracket) {
      bracket = new Bracket({
        tournamentId,
        teams,
        status: "active",
        createdAt: new Date()
      });
      await bracket.save();
    }
    
    // Check if matches already exist
    const Match = mongoose.models.Match || mongoose.model('Match', new mongoose.Schema({
      bracketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bracket', required: true },
      team1: { type: Object, required: true },
      team2: { type: Object, required: true },
      round: { type: String, required: true },
      status: { type: String, required: true },
      scheduledTime: { type: Date },
      confirmedDate: { type: Date },
      winner: { type: Object },
      hostRegions: [String],
      needsConfirmation: Boolean,
      resultsSubmitted: [{
        hostWalletAddress: String,
        hostRegion: String,
        winnerTeamId: String,
        winnerTeamName: String,
        submittedAt: { type: Date, default: Date.now },
        notes: String
      }],
      createdAt: { type: Date, default: Date.now },
      completedAt: Date
    }));
    
    const existingMatches = await Match.find({ bracketId: bracket._id });
    if (existingMatches.length > 0) {
      return false; // Matches already exist
    }
    
    // Generate matches
    const matchTemplates = generateBracketMatches(teams);
    
    const matches = matchTemplates.map((template, index) => {
      // For CS2 tournament, add dual-host confirmation to actual team matches
      const isCS2 = game === "CS2";
      const hasActualTeams = template.team1._id && template.team2._id;
      
      const match = {
        bracketId: bracket._id,
        team1: template.team1,
        team2: template.team2,
        round: template.round,
        status: hasActualTeams ? "scheduled" : "pending",
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
      
      return new Match(match);
    });
    
    await Match.insertMany(matches);
    
    // Update tournament status to active
    await Tournament.findByIdAndUpdate(tournamentId, { status: "active" });
    
    return true;
  } catch (error) {
    console.error('Error auto-generating matches:', error);
    return false;
  }
}