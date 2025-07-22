import mongoose from 'mongoose';

interface Clan {
  _id: string;
  name: string;
  tag: string;
  region: string;
  [key: string]: any;
}

interface MatchTemplate {
  clan1: Clan | { name: string };
  clan2: Clan | { name: string };
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

export function generateBracketMatches(clans: Clan[]): MatchTemplate[] {
  if (clans.length < 2) {
    throw new Error('Need at least 2 clans for a bracket');
  }
  
  // Shuffle clans for random matchups
  const shuffledClans = shuffleArray(clans);
  const matches: MatchTemplate[] = [];
  
  // Generate first round matches
  for (let i = 0; i < shuffledClans.length; i += 2) {
    if (i + 1 < shuffledClans.length) {
      matches.push({
        clan1: shuffledClans[i],
        clan2: shuffledClans[i + 1],
        round: shuffledClans.length > 4 ? 'quarterfinal' : 'semifinal'
      });
    }
  }
  
  // If we have 8 clans, we need quarterfinals -> semifinals -> final
  if (shuffledClans.length === 8) {
    // Add semifinal placeholders
    for (let i = 0; i < 2; i++) {
      matches.push({
        clan1: { name: `🏆 QF${i*2 + 1} Winner` },
        clan2: { name: `🏆 QF${i*2 + 2} Winner` },
        round: 'semifinal'
      });
    }
    
    // Add final placeholder
    matches.push({
      clan1: { name: '🏆 SF1 Winner' },
      clan2: { name: '🏆 SF2 Winner' },
      round: 'final'
    });
  } else if (shuffledClans.length === 4) {
    // 2 semifinal matches -> 1 final
    matches.push({
      clan1: { name: '🏆 SF1 Winner' },
      clan2: { name: '🏆 SF2 Winner' },
      round: 'final'
    });
  }
  
  return matches;
}

export async function autoGenerateMatches(tournamentId: string, game: string) {
  try {
    // Import actual models with proper schemas
    const { Tournament } = await import('./models/Tournament');
    const { Clan } = await import('./models/Clan');
    const { TournamentRegistration } = await import('./models/TournamentRegistration');
    const { Bracket } = await import('./models/Bracket');
    const { Match } = await import('./models/Match');
    
    // Get registered clans for this tournament
    const registrations = await TournamentRegistration.find({ 
      tournamentId,
      status: 'registered' 
    }).populate('clanId').lean();
    
    const clans = registrations.map(reg => reg.clanId).filter(Boolean);
    
    if (clans.length < 2) {
      console.log(`Not enough clans (${clans.length}) to generate bracket`);
      return false;
    }
    
    // Check if bracket already exists
    const existingBracket = await Bracket.findOne({ tournamentId });
    
    // Create bracket if it doesn't exist
    let bracket = existingBracket;
    if (!bracket) {
      bracket = new Bracket({
        tournamentId,
        clans: clans.map(clan => clan._id), // Store clan IDs, not full objects
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date()
      });
      await bracket.save();
      console.log(`Created bracket for tournament ${tournamentId}`);
    }
    
    // Check if matches already exist
    const existingMatches = await Match.find({ bracketId: bracket._id });
    if (existingMatches.length > 0) {
      console.log(`Matches already exist for bracket ${bracket._id}`);
      return false; // Matches already exist
    }
    
    // Generate matches with proper clan IDs
    const shuffledClans = shuffleArray(clans);
    const matches = [];
    
    // Create first round matches with actual clan IDs and registered player rosters
    for (let i = 0; i < shuffledClans.length; i += 2) {
      if (i + 1 < shuffledClans.length) {
        const roundName = shuffledClans.length > 4 ? 'quarter' : 'semi';
        
        // Get registered players for each clan from tournament registrations
        const clan1Registration = registrations.find(reg => reg.clanId.toString() === shuffledClans[i]._id.toString());
        const clan2Registration = registrations.find(reg => reg.clanId.toString() === shuffledClans[i + 1]._id.toString());
        
        const match = new Match({
          bracketId: bracket._id,
          clan1: shuffledClans[i]._id,
          clan2: shuffledClans[i + 1]._id,
          rosters: {
            clan1: clan1Registration?.selectedPlayers?.map(player => ({
              userId: player.userId,
              username: player.username,
              confirmed: true
            })) || [],
            clan2: clan2Registration?.selectedPlayers?.map(player => ({
              userId: player.userId,
              username: player.username,
              confirmed: true
            })) || []
          },
          round: roundName,
          status: 'scheduling',
          // scheduledAt will be set when clans coordinate match time
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        matches.push(match);
      }
    }
    
    // For 4 clans, add final match (will be populated when semis complete)
    if (shuffledClans.length === 4) {
      const finalMatch = new Match({
        bracketId: bracket._id,
        // These will be populated when semifinals complete
        clan1: null,
        clan2: null,
        round: 'final',
        status: 'scheduling',
        // scheduledAt will be set when clans coordinate match time
        createdAt: new Date(),
        updatedAt: new Date()
      });
      matches.push(finalMatch);
    }
    
    await Match.insertMany(matches);
    console.log(`Created ${matches.length} matches for tournament ${tournamentId}`);
    
    // Update tournament status to active
    await Tournament.findByIdAndUpdate(tournamentId, { 
      status: "active",
      updatedAt: new Date()
    });
    
    return true;
  } catch (error) {
    console.error('Error auto-generating matches:', error);
    console.error('Stack trace:', error.stack);
    return false;
  }
}