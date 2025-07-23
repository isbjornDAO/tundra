import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { validateObjectId, validateWalletAddress, sanitizeInput } from '@/lib/security-utils';
import { Match } from '@/lib/models/Match';
import { User } from '@/lib/models/User';
import { Clan } from '@/lib/models/Clan';
import { advanceWinnerToNextRound } from '@/lib/tournament-utils';

function calculateXPFromPerformance(score: number, kills: number, deaths: number, assists: number, isWinner: boolean, isMVP: boolean): number {
  let baseXP = Math.floor(score / 10);
  baseXP += kills * 5;
  baseXP += assists * 3;
  baseXP -= deaths * 2;
  
  if (isWinner) baseXP += 50;
  if (isMVP) baseXP += 25;
  
  return Math.max(baseXP, 10);
}

export async function POST(request: Request) {
  console.log('=== RESULTS ENDPOINT CALLED ===');
  try {
    console.log('1. Connecting to database...');
    await connectToDatabase();
    
    console.log('2. Parsing request body...');
    const requestBody = await request.json();
    console.log('Raw request body:', requestBody);
    
    console.log('3. Sanitizing input...');
    const sanitizedData = sanitizeInput(requestBody);
    const { matchId, clan1Score, clan2Score, playerPerformances, submittedBy } = sanitizedData;
    
    console.log('Sanitized data:', { matchId, clan1Score, clan2Score, submittedBy, playerPerformancesCount: playerPerformances?.length });
    
    if (!matchId || clan1Score === undefined || clan2Score === undefined || !submittedBy || !playerPerformances) {
      console.log('Missing required fields:', { matchId: !!matchId, clan1Score, clan2Score, submittedBy: !!submittedBy, playerPerformances: !!playerPerformances });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    console.log('4. Validating match ID...');
    const { isValid: matchIdValid, objectId: validatedMatchId, error: matchIdError } = validateObjectId(matchId);
    if (!matchIdValid) {
      return NextResponse.json({ error: `Invalid match ID: ${matchIdError}` }, { status: 400 });
    }
    
    console.log('5. Validating wallet address...');
    const { isValid: walletValid, address: validatedAddress, error: walletError } = validateWalletAddress(submittedBy);
    if (!walletValid) {
      return NextResponse.json({ error: `Invalid wallet address: ${walletError}` }, { status: 400 });
    }
    
    console.log('6. Finding match...');
    const match = await Match.findById(validatedMatchId).populate('clan1 clan2');
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }
    
    console.log('7. Finding user...');
    const user = await User.findOne({ walletAddress: validatedAddress });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    console.log('8. Finding user clan...');
    const userClan = await Clan.findById(user.clan);
    if (!userClan) {
      return NextResponse.json({ error: 'User must be in a clan to submit results' }, { status: 400 });
    }
    
    console.log('9. Checking if match is already completed...');
    if (match.status === 'completed') {
      return NextResponse.json({ error: 'Match has already been completed' }, { status: 400 });
    }
    
    console.log('10. Determining which clan is submitting...');
    const isUserClan1 = match.clan1._id.toString() === userClan._id.toString();
    const isUserClan2 = match.clan2._id.toString() === userClan._id.toString();
    
    if (!isUserClan1 && !isUserClan2) {
      return NextResponse.json({ error: 'You can only submit results for your own clan' }, { status: 403 });
    }
    
    // Initialize resultsSubmissions if it doesn't exist
    if (!match.resultsSubmissions) {
      match.resultsSubmissions = { clan1: {}, clan2: {} };
    }
    
    const submissionData = {
      submitted: true,
      submittedBy: user._id,
      submittedAt: new Date(),
      score: { clan1Score, clan2Score },
      playerPerformances
    };
    
    // Check if this clan has already submitted
    const hasAlreadySubmitted = isUserClan1 
      ? match.resultsSubmissions.clan1?.submitted 
      : match.resultsSubmissions.clan2?.submitted;
    
    if (hasAlreadySubmitted) {
      return NextResponse.json({ error: 'Your clan has already submitted results for this match' }, { status: 400 });
    }
    
    console.log('11. Recording submission...');
    if (isUserClan1) {
      match.resultsSubmissions.clan1 = submissionData;
    } else {
      match.resultsSubmissions.clan2 = submissionData;
    }
    
    const clan1Submitted = match.resultsSubmissions.clan1?.submitted || false;
    const clan2Submitted = match.resultsSubmissions.clan2?.submitted || false;
    
    console.log(`Submission status - Clan1: ${clan1Submitted}, Clan2: ${clan2Submitted}`);
    
    // Check if both clans have submitted
    if (clan1Submitted && clan2Submitted) {
      console.log('12. Both clans submitted - checking for conflicts...');
      
      const clan1Results = match.resultsSubmissions.clan1;
      const clan2Results = match.resultsSubmissions.clan2;
      
      const clan1ScoresMatch = clan1Results.score.clan1Score === clan2Results.score.clan1Score;
      const clan2ScoresMatch = clan1Results.score.clan2Score === clan2Results.score.clan2Score;
      
      if (clan1ScoresMatch && clan2ScoresMatch) {
        console.log('13. Results match - completing match...');
        
        // Results match - complete the match
        const winningClanId = clan1Score > clan2Score ? match.clan1._id : clan2Score > clan1Score ? match.clan2._id : null;
        
        match.score = { clan1Score, clan2Score };
        match.status = 'completed';
        match.completedAt = new Date();
        if (winningClanId) {
          match.winner = winningClanId;
        }
        
        // Combine player performances from both submissions
        const allPlayerPerformances = [];
        if (clan1Results.playerPerformances) {
          allPlayerPerformances.push(...clan1Results.playerPerformances);
        }
        if (clan2Results.playerPerformances) {
          allPlayerPerformances.push(...clan2Results.playerPerformances);
        }
        match.playerPerformances = allPlayerPerformances;
        
        await match.save();
        console.log('Match completed successfully');
        
        // Update user tournament stats
        console.log('15. Updating user stats...');
        try {
          const { User } = await import('@/lib/models/User');
          
          for (const perf of allPlayerPerformances) {
            const userId = perf.userId;
            const user = await User.findById(userId);
            
            if (user) {
              // Initialize stats if they don't exist
              if (!user.stats) {
                user.stats = {
                  totalTournaments: 0,
                  wins: 0,
                  totalPrizeMoney: 0,
                  level: 1,
                  xp: 0
                };
              }
              
              // Update tournament count
              user.stats.totalTournaments = (user.stats.totalTournaments || 0) + 1;
              
              // Add wins if this player's clan won
              if (perf.clanId === winningClanId) {
                user.stats.wins = (user.stats.wins || 0) + 1;
              }
              
              // Add XP based on performance
              const xpGain = calculateXPFromPerformance(
                perf.score || 0, 
                perf.kills || 0, 
                perf.deaths || 0, 
                perf.assists || 0, 
                perf.clanId === winningClanId, 
                perf.mvp || false
              );
              
              user.stats.xp = (user.stats.xp || 0) + xpGain;
              
              // Update level based on XP (simple level calculation)
              user.stats.level = Math.floor((user.stats.xp || 0) / 1000) + 1;
              
              await user.save();
              console.log(`Updated stats for user ${user.username}: +${xpGain} XP`);
            }
          }
        } catch (error) {
          console.error('Error updating user stats:', error);
        }
        
        // Advance winner to next round
        if (winningClanId) {
          console.log('14. Advancing winner to next round...');
          try {
            await advanceWinnerToNextRound(match._id.toString(), winningClanId.toString());
            console.log('Winner advanced successfully');
          } catch (error) {
            console.error('Error advancing winner:', error);
          }
        }

        // Check if this was a finals match - if so, mark tournament as completed
        if (match.round === 'final') {
          console.log('15. Finals match completed - updating tournament status...');
          try {
            const { Tournament } = await import('@/lib/models/Tournament');
            const { Bracket } = await import('@/lib/models/Bracket');
            
            // Find the bracket for this match
            const bracket = await Bracket.findById(match.bracketId);
            if (bracket) {
              // Update tournament status to completed
              await Tournament.findByIdAndUpdate(bracket.tournamentId, {
                status: 'completed',
                completedAt: new Date(),
                updatedAt: new Date()
              });
              console.log(`Tournament ${bracket.tournamentId} marked as completed`);
            }
          } catch (error) {
            console.error('Error updating tournament status:', error);
          }
        }
        
        return NextResponse.json({ 
          success: true, 
          message: 'Results confirmed! Match completed.',
          status: 'completed'
        });
        
      } else {
        console.log('13. Results conflict detected...');
        
        // Results don't match - mark as conflict
        match.status = 'results_conflict';
        match.conflictData = {
          submission1: {
            clanId: match.clan1._id,
            score: clan1Results.score,
            submittedAt: clan1Results.submittedAt
          },
          submission2: {
            clanId: match.clan2._id,
            score: clan2Results.score,
            submittedAt: clan2Results.submittedAt
          }
        };
        
        await match.save();
        console.log('Match marked as conflict');
        
        return NextResponse.json({ 
          success: true, 
          message: 'Results conflict detected. Admin review required.',
          status: 'results_conflict'
        });
      }
      
    } else {
      console.log('12. Waiting for other clan submission...');
      
      // Only one clan has submitted - mark as pending
      match.status = 'results_pending';
      await match.save();
      console.log('Match marked as results pending');
      
      return NextResponse.json({ 
        success: true, 
        message: 'Results submitted. Waiting for opponent confirmation.',
        status: 'results_pending'
      });
    }
    
  } catch (error: any) {
    console.error('Error submitting match results:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Request data:', { matchId, clan1Score, clan2Score, submittedBy, playerPerformancesCount: playerPerformances?.length });
    
    // Return more specific error message for debugging
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message,
      // Include validation errors if they exist
      validationErrors: error.errors 
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId');
    
    if (!matchId) {
      return NextResponse.json({ error: 'Match ID is required' }, { status: 400 });
    }
    
    const { isValid: matchIdValid, objectId: validatedMatchId, error: matchIdError } = validateObjectId(matchId);
    if (!matchIdValid) {
      return NextResponse.json({ error: `Invalid match ID: ${matchIdError}` }, { status: 400 });
    }
    
    const match = await Match.findById(validatedMatchId)
      .populate('clan1 clan2')
      .populate('playerPerformances.userId', 'username displayName')
      .populate('playerPerformances.clanId', 'name tag');
      
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      match: {
        _id: match._id,
        round: match.round,
        clan1: match.clan1,
        clan2: match.clan2,
        scheduledAt: match.scheduledAt,
        completedAt: match.completedAt,
        status: match.status,
        score: match.score,
        playerPerformances: match.playerPerformances,
        winner: match.winner
      }
    });
    
  } catch (error) {
    console.error('Error fetching match results:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
