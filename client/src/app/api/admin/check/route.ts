import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  // Require authentication to check admin status
  const auth = await authenticateUser(request);
  
  if (!auth) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
  
  try {
    // Determine role
    let role = null;
    if (auth.user.isAdmin) {
      role = 'admin';
    } else if (auth.user.isHost) {
      role = 'host';
    }
    
    return NextResponse.json({
      walletAddress: auth.user.walletAddress,
      isAdmin: auth.user.isAdmin,
      isClanLeader: auth.user.isClanLeader,
      isHost: auth.user.isHost,
      role: role,
      regions: auth.user.adminRegions || []
    });
  } catch (error) {
    console.error('Error checking admin status:', error);
    return NextResponse.json({ error: 'Failed to check admin status' }, { status: 500 });
  }
}