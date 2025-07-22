import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { validateObjectId } from '@/lib/security-utils';
import { User } from '@/lib/models/User';
import { Clan } from '@/lib/models/Clan';

export async function GET(request: Request, { params }: { params: { clanId: string } }) {
  try {
    await connectToDatabase();
    
    const { isValid: clanIdValid, objectId: validatedClanId, error: clanIdError } = validateObjectId(params.clanId);
    if (!clanIdValid) {
      return NextResponse.json({ error: `Invalid clan ID: ${clanIdError}` }, { status: 400 });
    }
    
    const clan = await Clan.findById(validatedClanId);
    if (!clan) {
      return NextResponse.json({ error: 'Clan not found' }, { status: 404 });
    }
    
    const members = await User.find({ clan: validatedClanId })
      .select('username displayName stats matchPerformance walletAddress')
      .lean();
    
    const membersWithPerformance = members.map(member => {
      const recentPerformance = member.matchPerformance?.slice(-10) || [];
      const totalMatches = member.matchPerformance?.length || 0;
      const winRate = totalMatches > 0 ? ((member.stats?.matchesWon || 0) / totalMatches * 100) : 0;
      
      const avgKills = recentPerformance.length > 0 
        ? recentPerformance.reduce((sum, match) => sum + (match.kills || 0), 0) / recentPerformance.length 
        : 0;
      
      const avgDeaths = recentPerformance.length > 0 
        ? recentPerformance.reduce((sum, match) => sum + (match.deaths || 0), 0) / recentPerformance.length 
        : 0;
      
      const recentKD = avgDeaths > 0 ? avgKills / avgDeaths : avgKills;
      
      const overallKD = member.stats?.kd || 0;
      const totalKills = member.stats?.totalKills || 0;
      const totalDeaths = member.stats?.totalDeaths || 0;
      const totalAssists = member.stats?.totalAssists || 0;
      
      return {
        _id: member._id,
        username: member.username,
        displayName: member.displayName,
        walletAddress: member.walletAddress,
        stats: {
          level: member.stats?.level || 1,
          xp: member.stats?.xp || 0,
          matchesPlayed: member.stats?.matchesPlayed || 0,
          matchesWon: member.stats?.matchesWon || 0,
          averageScore: member.stats?.averageScore || 0,
          winRate: Math.round(winRate),
          totalKills,
          totalDeaths,
          totalAssists,
          overallKD: Math.round(overallKD * 100) / 100,
          avgKills: Math.round(avgKills * 10) / 10,
          avgDeaths: Math.round(avgDeaths * 10) / 10,
          recentKD: Math.round(recentKD * 100) / 100
        },
        recentPerformance,
        rank: 0
      };
    });
    
    membersWithPerformance.sort((a, b) => (b.stats.xp || 0) - (a.stats.xp || 0));
    membersWithPerformance.forEach((member, index) => {
      member.rank = index + 1;
    });
    
    return NextResponse.json({ 
      members: membersWithPerformance,
      clanName: clan.name,
      clanTag: clan.tag 
    });
    
  } catch (error) {
    console.error('Error fetching clan member performance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}