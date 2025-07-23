import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { initializeModels, User, Match, Tournament, Bracket } from '@/lib/models';
import { validateObjectId, sanitizeInput } from '@/lib/security-utils';
import { getUserAchievements } from '@/lib/achievements';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    
    // Initialize all models to prevent MissingSchemaError
    initializeModels();
    
    const { id } = await params;
    
    // Validate user ID parameter
    const { isValid, objectId: userId, error } = validateObjectId(id);
    if (!isValid) {
      return NextResponse.json({ error: `Invalid user ID: ${error}` }, { status: 400 });
    }
    
    // Check if user exists
    const user = await User.findById(userId).select('username displayName stats');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Find all matches where this user participated
    const matches = await Match.find({
      'playerPerformances.userId': userId,
      status: 'completed'
    })
    .populate({
      path: 'bracketId',
      populate: {
        path: 'tournamentId',
        select: 'game prizePool status createdAt completedAt'
      }
    })
    .populate('clan1', 'name tag')
    .populate('clan2', 'name tag')
    .populate('winner', 'name tag')
    .sort({ completedAt: -1, createdAt: -1 });
    
    // Process tournament history
    const tournamentMap = new Map();
    let totalKills = 0;
    let totalDeaths = 0;
    let totalAssists = 0;
    let totalScore = 0;
    let matchesWon = 0;
    let mvpCount = 0;
    
    matches.forEach(match => {
      const tournament = match.bracketId?.tournamentId;
      if (!tournament) return;
      
      const tournamentId = tournament._id.toString();
      const userPerformance = match.playerPerformances.find(
        p => p.userId.toString() === userId.toString()
      );
      
      if (!userPerformance) return;
      
      // Aggregate user stats
      totalKills += userPerformance.kills || 0;
      totalDeaths += userPerformance.deaths || 0;
      totalAssists += userPerformance.assists || 0;
      totalScore += userPerformance.score || 0;
      if (userPerformance.mvp) mvpCount++;
      
      // Check if user's clan won the match
      const userClan = userPerformance.clanId;
      const isWin = match.winner && match.winner._id.toString() === userClan.toString();
      if (isWin) matchesWon++;
      
      // Group by tournament
      if (!tournamentMap.has(tournamentId)) {
        tournamentMap.set(tournamentId, {
          tournament: {
            id: tournament._id,
            game: tournament.game,
            prizePool: tournament.prizePool,
            status: tournament.status,
            createdAt: tournament.createdAt,
            completedAt: tournament.completedAt || null
          },
          matches: [],
          stats: {
            matchesPlayed: 0,
            matchesWon: 0,
            totalKills: 0,
            totalDeaths: 0,
            totalAssists: 0,
            totalScore: 0,
            mvpCount: 0
          }
        });
      }
      
      const tournamentData = tournamentMap.get(tournamentId);
      
      // Determine opponent clan
      const opponentClan = userClan.toString() === match.clan1._id.toString() ? match.clan2 : match.clan1;
      
      // Add match to tournament
      tournamentData.matches.push({
        id: match._id,
        round: match.round,
        clan1: match.clan1,
        clan2: match.clan2,
        winner: match.winner,
        score: match.score,
        opponentClan: opponentClan?.name || 'Unknown',
        userPerformance: {
          score: userPerformance.score,
          kills: userPerformance.kills,
          deaths: userPerformance.deaths,
          assists: userPerformance.assists,
          mvp: userPerformance.mvp,
          clanId: userPerformance.clanId
        },
        isWin,
        completedAt: match.completedAt,
        scheduledAt: match.scheduledAt
      });
      
      // Update tournament stats
      tournamentData.stats.matchesPlayed++;
      if (isWin) tournamentData.stats.matchesWon++;
      tournamentData.stats.totalKills += userPerformance.kills || 0;
      tournamentData.stats.totalDeaths += userPerformance.deaths || 0;
      tournamentData.stats.totalAssists += userPerformance.assists || 0;
      tournamentData.stats.totalScore += userPerformance.score || 0;
      if (userPerformance.mvp) tournamentData.stats.mvpCount++;
    });
    
    // Convert map to array and calculate additional stats
    const tournaments = Array.from(tournamentMap.values()).map(tournamentData => {
      const stats = tournamentData.stats;
      return {
        ...tournamentData,
        stats: {
          ...stats,
          winRate: stats.matchesPlayed > 0 ? 
            Math.round((stats.matchesWon / stats.matchesPlayed) * 100) : 0,
          kd: stats.totalDeaths > 0 ? 
            Math.round((stats.totalKills / stats.totalDeaths) * 100) / 100 : stats.totalKills,
          avgScore: stats.matchesPlayed > 0 ? 
            Math.round(stats.totalScore / stats.matchesPlayed) : 0
        }
      };
    });
    
    // Calculate overall user stats
    const totalMatches = matches.length;
    const overallStats = {
      totalTournaments: tournaments.length,
      totalMatches,
      matchesWon,
      winRate: totalMatches > 0 ? Math.round((matchesWon / totalMatches) * 100) : 0,
      totalKills,
      totalDeaths,
      totalAssists,
      kd: totalDeaths > 0 ? Math.round((totalKills / totalDeaths) * 100) / 100 : totalKills,
      totalScore,
      avgScore: totalMatches > 0 ? Math.round(totalScore / totalMatches) : 0,
      mvpCount,
      mvpRate: totalMatches > 0 ? Math.round((mvpCount / totalMatches) * 100) : 0
    };
    
    // Get recent form (last 10 matches)
    const recentMatches = matches.slice(0, 10);
    const recentForm = recentMatches.map(match => {
      const userPerformance = match.playerPerformances.find(
        p => p.userId.toString() === userId.toString()
      );
      if (!userPerformance) return 'L';
      
      const userClan = userPerformance.clanId;
      const isWin = match.winner && match.winner._id.toString() === userClan.toString();
      return isWin ? 'W' : 'L';
    });
    
    // Calculate achievements and badges
    const userStatsForAchievements = {
      ...overallStats,
      totalPrizeMoney: user.stats?.totalPrizeMoney || 0,
      wins: user.stats?.wins || 0,
      recentForm
    };
    
    const { achievements, badges } = getUserAchievements(userStatsForAchievements, tournaments);
    
    return NextResponse.json({
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        level: user.stats?.level || 1,
        xp: user.stats?.xp || 0
      },
      overallStats,
      recentForm,
      tournaments,
      achievements,
      badges,
      lastUpdated: new Date()
    });
    
  } catch (error) {
    console.error('Error fetching user tournament history:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ 
      error: 'Failed to fetch user tournament history',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}