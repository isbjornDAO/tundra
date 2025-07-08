import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { User } from '@/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }
    
    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    
    if (!user) {
      return NextResponse.json({
        isAdmin: false,
        isClanLeader: false,
        isTeam1Host: false,
        role: null,
        regions: []
      });
    }
    
    // Determine role
    let role = null;
    if (user.isAdmin) {
      role = user.adminRegions.length === 0 ? 'super_admin' : 'regional_admin';
    } else if (user.isTeam1Host) {
      role = 'team1_host';
    }
    
    return NextResponse.json({
      isAdmin: user.isAdmin,
      isClanLeader: user.isClanLeader,
      isTeam1Host: user.isTeam1Host,
      role: role,
      regions: user.adminRegions || []
    });
  } catch (error) {
    console.error('Error checking admin status:', error);
    return NextResponse.json({ error: 'Failed to check admin status' }, { status: 500 });
  }
}