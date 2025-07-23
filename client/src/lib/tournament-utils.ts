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

export async function advanceWinnerToNextRound(matchId: string, winnerClanId: string) {
  try {
    const { Match } = await import('./models/Match');
    
    // Get the completed match
    const completedMatch = await Match.findById(matchId);
    if (!completedMatch || completedMatch.status !== 'completed') {
      console.log('Match not found or not completed');
      return false;
    }
    
    // Determine the next round
    const roundOrder = ['quarter', 'semi', 'final'];
    const currentRoundIndex = roundOrder.indexOf(completedMatch.round);
    
    if (currentRoundIndex === -1 || currentRoundIndex === roundOrder.length - 1) {
      console.log('No next round for this match');
      return false; // Final match or invalid round
    }
    
    const nextRound = roundOrder[currentRoundIndex + 1];
    
    // Find all matches in the current round to determine position
    const currentRoundMatches = await Match.find({
      bracketId: completedMatch.bracketId,
      round: completedMatch.round
    }).sort('createdAt');
    
    // Find the position of this match in current round
    const matchPosition = currentRoundMatches.findIndex(m => m._id.toString() === matchId);
    const nextMatchPosition = Math.floor(matchPosition / 2);
    const isFirstTeam = matchPosition % 2 === 0;
    
    // Find the next round match that should receive this winner
    const nextRoundMatches = await Match.find({
      bracketId: completedMatch.bracketId,
      round: nextRound
    }).sort('createdAt');
    
    if (nextMatchPosition >= nextRoundMatches.length) {
      console.log('No next round match found at position', nextMatchPosition);
      return false;
    }
    
    const nextMatch = nextRoundMatches[nextMatchPosition];
    
    // Update the next match with the winner
    const updateField = isFirstTeam ? 'clan1' : 'clan2';
    
    await Match.findByIdAndUpdate(nextMatch._id, {
      [updateField]: winnerClanId,
      updatedAt: new Date()
    });
    
    console.log(`Advanced winner to ${nextRound} match at position ${nextMatchPosition} as ${updateField}`);
    
    // Check if both teams are set and update status
    const updatedNextMatch = await Match.findById(nextMatch._id);
    if (updatedNextMatch.clan1 && updatedNextMatch.clan2) {
      await Match.findByIdAndUpdate(nextMatch._id, {
        status: 'scheduling'
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error advancing winner to next round:', error);
    return false;
  }
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
    
    // Update tournament status to active and set bracketId
    await Tournament.findByIdAndUpdate(tournamentId, { 
      status: "active",
      bracketId: bracket._id,
      updatedAt: new Date()
    });
    
    console.log(`Tournament ${tournamentId} updated with bracket ${bracket._id}`);
    
    return true;
  } catch (error) {
    console.error('Error auto-generating matches:', error);
    console.error('Stack trace:', error.stack);
    return false;
  }
}