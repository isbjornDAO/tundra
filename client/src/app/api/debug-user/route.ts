import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { User } from '@/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');
    
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }
    
    console.log('Debug: Looking for wallet:', walletAddress);
    
    const user = await User.findOne({ 
      walletAddress: walletAddress.toLowerCase()
    });
    
    console.log('Debug: Found user:', user ? {
      id: user._id,
      walletAddress: user.walletAddress,
      username: user.username,
      displayName: user.displayName,
      country: user.country,
      hasUsername: !!user.username,
      usernameType: typeof user.username,
      usernameLength: user.username ? user.username.length : 0
    } : 'No user found');
    
    return NextResponse.json({
      found: !!user,
      user: user ? {
        id: user._id,
        walletAddress: user.walletAddress,
        username: user.username,
        displayName: user.displayName,
        country: user.country,
        hasUsername: !!user.username,
        usernameType: typeof user.username,
        usernameLength: user.username ? user.username.length : 0,
        createdAt: user.createdAt
      } : null
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: 'Debug failed' }, { status: 500 });
  }
}