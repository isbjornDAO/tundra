import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { validateObjectId, validateWalletAddress, sanitizeInput } from '@/lib/security-utils';
import { Match } from '@/lib/models/Match';
import { User } from '@/lib/models/User';
import { Clan } from '@/lib/models/Clan';

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
  try {
    await connectToDatabase();
    const requestBody = await request.json();
    const sanitizedData = sanitizeInput(requestBody);
    const { matchId, clan1Score, clan2Score, playerPerformances, submittedBy } = sanitizedData;
    
    if (!matchId || clan1Score === undefined || clan2Score === undefined || !submittedBy || !playerPerformances) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const { isValid: matchIdValid, objectId: validatedMatchId, error: matchIdError } = validateObjectId(matchId);
    if (!matchIdValid) {
      return NextResponse.json({ error: `Invalid match ID: ${matchIdError}` }, { status: 400 });
    }
    
    const { isValid: walletValid, address: validatedAddress, error: walletError } = validateWalletAddress(submittedBy);
    if (!walletValid) {
      return NextResponse.json({ error: `Invalid wallet address: ${walletError}` }, { status: 400 });
    }
    
    if (typeof clan1Score !== 'number' || typeof clan2Score !== 'number' || clan1Score < 0 || clan2Score < 0) {
      return NextResponse.json({ error: 'Invalid scores provided' }, { status: 400 });
    }
    
    const match = await Match.findById(validatedMatchId).populate('clan1 clan2');
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }
    
    const user = await User.findOne({ walletAddress: validatedAddress });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const userClan = await Clan.findById(user.clan);
    if (!userClan) {
      return NextResponse.json({ error: 'User must be in a clan to submit results' }, { status: 400 });
    }
    
    if (!user.isClanLeader && userClan.leader.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Only clan leaders can submit results' }, { status: 403 });
    }
    
    // Check if match rosters are set
    if (!match.rosters || (!match.rosters.clan1?.length && !match.rosters.clan2?.length)) {
      return NextResponse.json({ error: 'Match rosters must be set before submitting results' }, { status: 400 });
    }
    
    // Validate that all submitted players are on the match roster
    const clan1RosterIds = match.rosters.clan1?.map(p => p.userId.toString()) || [];
    const clan2RosterIds = match.rosters.clan2?.map(p => p.userId.toString()) || [];
    const allRosterIds = [...clan1RosterIds, ...clan2RosterIds];
    
    for (const perf of playerPerformances) {
      if (!allRosterIds.includes(perf.userId)) {
        const invalidPlayer = await User.findById(perf.userId);
        return NextResponse.json({ 
          error: `Player ${invalidPlayer?.username || perf.userId} is not on the match roster` 
        }, { status: 400 });
      }
    }
    
    if (match.status !== 'ready' && match.status !== 'active' && match.status !== 'results_pending') {
      return NextResponse.json({ error: 'Match is not ready for results submission' }, { status: 400 });
    }
    
    const winningClanId = clan1Score > clan2Score ? match.clan1._id : clan2Score > clan1Score ? match.clan2._id : null;
    
    // Determine which clan is submitting
    const isSubmittingClan1 = userClan._id.toString() === match.clan1._id.toString();
    const submittingClanKey = isSubmittingClan1 ? 'clan1' : 'clan2';
    
    // Check if this clan has already submitted results
    if (match.resultsSubmissions?.[submittingClanKey]?.submitted) {
      return NextResponse.json({ error: 'Your clan has already submitted results for this match' }, { status: 400 });
    }
    
    // Store existing score BEFORE overwriting for conflict detection
    const existingScore = match.score;
    match.score = { clan1Score, clan2Score };
    match.playerPerformances = playerPerformances.map((perf: any) => ({
      userId: perf.userId,
      clanId: perf.clanId,
      score: perf.score,
      kills: perf.kills || 0,
      deaths: perf.deaths || 0,
      assists: perf.assists || 0,
      mvp: perf.mvp || false
    }));
    
    if (winningClanId) {
      match.winner = winningClanId;
    }
    
    // Initialize resultsSubmissions if not exists
    if (!match.resultsSubmissions) {
      match.resultsSubmissions = {
        clan1: { submitted: false },
        clan2: { submitted: false }
      };
    }
    
    // Mark this clan's submission
    match.resultsSubmissions[submittingClanKey] = {
      submitted: true,
      submittedBy: user._id,
      submittedAt: new Date()
    };
    
    // Check if both clans have submitted
    const bothSubmitted = match.resultsSubmissions.clan1?.submitted && match.resultsSubmissions.clan2?.submitted;
    
    if (bothSubmitted) {
      // Check for conflicting results using the stored existing score
      const hasConflict = existingScore && (
        existingScore.clan1Score !== clan1Score || 
        existingScore.clan2Score !== clan2Score
      );
      
      if (hasConflict) {
        match.status = 'results_conflict';
        match.conflictData = {
          submission1: {
            clanId: isSubmittingClan1 ? match.clan2._id : match.clan1._id,
            score: existingScore,
            submittedAt: isSubmittingClan1 ? match.resultsSubmissions.clan2.submittedAt : match.resultsSubmissions.clan1.submittedAt
          },
          submission2: {
            clanId: isSubmittingClan1 ? match.clan1._id : match.clan2._id,
            score: { clan1Score, clan2Score },
            submittedAt: new Date()
          }
        };
      } else {
        match.status = 'completed';
        match.completedAt = new Date();
      }
    } else {
      match.status = 'results_pending';
    }
    
    await match.save();
    
    // Only award XP and update player stats when match is actually completed (not conflicted)
    if (match.status === 'completed') {
      for (const perf of playerPerformances) {
      const player = await User.findById(perf.userId);
      if (player) {
        const isWinner = winningClanId && player.clan && player.clan.toString() === winningClanId.toString();
        const xpEarned = calculateXPFromPerformance(perf.score, perf.kills || 0, perf.deaths || 0, perf.assists || 0, isWinner, perf.mvp || false);
        
        player.matchPerformance.push({
          matchId: match._id,
          tournamentId: match.bracketId,
          clanId: perf.clanId,
          score: perf.score,
          kills: perf.kills || 0,
          deaths: perf.deaths || 0,
          assists: perf.assists || 0,
          xpEarned,
          matchResult: isWinner ? 'win' : 'loss',
          playedAt: new Date()
        });
        
        player.stats.xp += xpEarned;
        player.stats.matchesPlayed += 1;
        if (isWinner) player.stats.matchesWon += 1;
        
        player.stats.totalKills += perf.kills || 0;
        player.stats.totalDeaths += perf.deaths || 0;
        player.stats.totalAssists += perf.assists || 0;
        player.stats.kd = player.stats.totalDeaths > 0 ? 
          Math.round((player.stats.totalKills / player.stats.totalDeaths) * 100) / 100 : 
          player.stats.totalKills;
        
        const totalScore = player.matchPerformance.reduce((sum, match) => sum + match.score, 0);
        player.stats.averageScore = Math.round(totalScore / player.matchPerformance.length);
        
        const newLevel = Math.floor(player.stats.xp / 1000) + 1;
        if (newLevel > player.stats.level) {
          player.stats.level = newLevel;
        }
        
        await player.save();
      }
    }
    }
    
    const finalStatus = match.status;
    let message, xpAwarded;
    
    if (finalStatus === 'results_conflict') {
      message = 'Results conflict detected! Both teams submitted different scores. An admin will need to resolve this dispute.';
      xpAwarded = false;
    } else if (finalStatus === 'completed') {
      message = 'Match results confirmed! Both teams submitted matching scores and the match is now complete.';
      xpAwarded = true;
    } else {
      message = 'Results submitted successfully! Waiting for opponent team to submit their results.';
      xpAwarded = false;
    }
    
    return NextResponse.json({ 
      success: true, 
      message,
      xpAwarded,
      status: finalStatus,
      hasConflict: finalStatus === 'results_conflict'
    });
    
  } catch (error) {
    console.error('Error submitting match results:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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