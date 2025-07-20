import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { User } from '@/lib/models/User';
import { requireAdmin } from '@/lib/auth-middleware';

export async function POST(request: NextRequest) {
  // CRITICAL: Only admins can grant/revoke admin privileges
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) {
    return auth; // Return error response
  }

  try {
    await connectToDatabase();
    
    const data = await request.json();
    const { targetWalletAddress, isAdmin, regions } = data;
    
    if (!targetWalletAddress) {
      return NextResponse.json(
        { error: 'Target wallet address is required' },
        { status: 400 }
      );
    }
    
    // Prevent self-modification for security
    if (targetWalletAddress.toLowerCase() === auth.user.walletAddress.toLowerCase()) {
      return NextResponse.json(
        { error: 'Cannot modify your own admin privileges' },
        { status: 400 }
      );
    }
    
    const user = await User.findOneAndUpdate(
      { walletAddress: targetWalletAddress.toLowerCase() },
      {
        isAdmin,
        adminRegions: regions || [],
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Log admin action for audit trail
    console.log(`Admin privilege ${isAdmin ? 'granted' : 'revoked'} for ${targetWalletAddress} by admin ${auth.user.walletAddress}`);
    
    return NextResponse.json({
      success: true,
      user: {
        _id: user._id,
        walletAddress: user.walletAddress,
        username: user.username,
        displayName: user.displayName,
        isAdmin: user.isAdmin,
        adminRegions: user.adminRegions,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating admin status:', error);
    return NextResponse.json({ error: 'Failed to update admin status' }, { status: 500 });
  }
}