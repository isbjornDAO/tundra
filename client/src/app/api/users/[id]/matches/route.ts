import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { validateObjectId } from '@/lib/security-utils';
import { User } from '@/lib/models/User';
import { Match } from '@/lib/models/Match';
import { Tournament } from '@/lib/models/Tournament';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    
    const { isValid: userIdValid, objectId: validatedUserId, error: userIdError } = validateObjectId(params.id);
    if (!userIdValid) {
      return NextResponse.json({ error: `Invalid user ID: ${userIdError}` }, { status: 400 });
    }
    
    const user = await User.findById(validatedUserId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Find all matches where this user participated
    const matches = await Match.find({ 
      'playerPerformances.userId': validatedUserId,
      status: 'completed'
    })
    .populate('tournament', 'game prizePool createdAt')
    .populate('team1.clan', 'name tag')
    .populate('team2.clan', 'name tag')
    .populate('winner', 'name tag')
    .sort({ completedAt: -1 })
    .limit(50); // Limit to last 50 matches

    const matchHistory = matches.map(match => {
      // Find this user's performance in the match
      const userPerformance = match.playerPerformances.find(
        p => p.userId.toString() === validatedUserId.toString()
      );

      if (!userPerformance) return null;

      // Determine if user won
      const userClan = userPerformance.clanId;
      const isWin = match.winner && match.winner._id.toString() === userClan.toString();

      // Get opponent clan info
      const userTeam = match.team1.clan._id.toString() === userClan.toString() ? 'team1' : 'team2';
      const opponentTeam = userTeam === 'team1' ? 'team2' : 'team1';
      const opponentClan = match[opponentTeam].clan;

      return {
        matchId: match._id,
        date: match.completedAt || match.createdAt,
        tournament: {
          game: match.tournament?.game || 'Unknown Game',
          prizePool: match.tournament?.prizePool || 0
        },
        opponent: {
          name: opponentClan.name,
          tag: opponentClan.tag
        },
        result: isWin ? 'win' : 'loss',
        performance: {
          kills: userPerformance.kills || 0,
          deaths: userPerformance.deaths || 0,
          assists: userPerformance.assists || 0,
          score: userPerformance.score || 0,
          kd: userPerformance.deaths > 0 ? (userPerformance.kills / userPerformance.deaths) : userPerformance.kills,
          mvp: userPerformance.mvp || false
        },
        teamScore: match[userTeam].score || 0,
        opponentScore: match[opponentTeam].score || 0
      };
    }).filter(match => match !== null);

    // Calculate some summary stats
    const totalMatches = matchHistory.length;
    const wins = matchHistory.filter(match => match.result === 'win').length;
    const totalKills = matchHistory.reduce((sum, match) => sum + match.performance.kills, 0);
    const totalDeaths = matchHistory.reduce((sum, match) => sum + match.performance.deaths, 0);
    const totalAssists = matchHistory.reduce((sum, match) => sum + match.performance.assists, 0);
    const mvpCount = matchHistory.filter(match => match.performance.mvp).length;

    const stats = {
      totalMatches,
      wins,
      losses: totalMatches - wins,
      winRate: totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0,
      totalKills,
      totalDeaths,
      totalAssists,
      overallKD: totalDeaths > 0 ? Math.round((totalKills / totalDeaths) * 100) / 100 : totalKills,
      avgKills: totalMatches > 0 ? Math.round((totalKills / totalMatches) * 10) / 10 : 0,
      avgDeaths: totalMatches > 0 ? Math.round((totalDeaths / totalMatches) * 10) / 10 : 0,
      mvpCount
    };

    return NextResponse.json({ 
      matches: matchHistory,
      stats
    });
    
  } catch (error) {
    console.error('Error fetching user match history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}