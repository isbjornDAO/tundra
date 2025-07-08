import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Clan } from '@/lib/models/Clan';
import { User } from '@/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');
    const userCountry = searchParams.get('country');
    
    let userLocation = userCountry;
    
    // If wallet address provided, get user's country
    if (walletAddress && !userCountry) {
      const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
      userLocation = user?.country;
    }
    
    // Get all verified public clans
    const allClans = await Clan.find({
      isVerified: true,
      isPublic: true
    })
    .populate('leader', 'displayName username')
    .populate('members', 'displayName username')
    .sort({ createdAt: -1 });
    
    // Separate local and global clans
    const localClans = userLocation 
      ? allClans.filter(clan => clan.country === userLocation)
      : [];
    
    const globalClans = allClans.filter(clan => clan.country !== userLocation);
    
    // Get clan statistics
    const clanStats = allClans.map(clan => ({
      ...clan.toObject(),
      memberCount: clan.members.length,
      canJoin: userLocation ? clan.country === userLocation : false
    }));
    
    const localClanStats = clanStats.filter(clan => clan.country === userLocation);
    const globalClanStats = clanStats.filter(clan => clan.country !== userLocation);
    
    return NextResponse.json({
      localClans: localClanStats,
      globalClans: globalClanStats,
      userCountry: userLocation,
      stats: {
        totalClans: allClans.length,
        localClans: localClans.length,
        globalClans: globalClans.length
      }
    });
  } catch (error) {
    console.error('Error fetching clan discovery data:', error);
    return NextResponse.json({ error: 'Failed to fetch clans' }, { status: 500 });
  }
}