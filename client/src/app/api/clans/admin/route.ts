import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { Clan } from '@/lib/models/Clan';
import { requireAdmin } from '@/lib/auth-middleware';

export async function PATCH(request: NextRequest) {
  // Require admin authentication
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) {
    return auth; // Return error response
  }

  try {
    await connectToDatabase();
    
    const { clanId, action } = await request.json();
    
    if (!clanId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: clanId, action' },
        { status: 400 }
      );
    }

    // Find the clan
    const clan = await Clan.findById(clanId).populate('leader', 'username displayName');
    
    if (!clan) {
      return NextResponse.json(
        { error: 'Clan not found' },
        { status: 404 }
      );
    }

    if (action === 'approve') {
      // Approve the clan
      clan.isVerified = true;
      clan.verifiedBy = auth.user._id;
      clan.verifiedAt = new Date();
      clan.updatedAt = new Date();
      
      await clan.save();
      
      console.log(`Clan ${clan.name} approved by admin ${auth.user.walletAddress} (${auth.user.username || 'no username'})`);
      
      return NextResponse.json({ 
        success: true, 
        message: `Clan "${clan.name}" has been approved`,
        clan 
      });
      
    } else if (action === 'reject') {
      // For now, we'll just delete the clan. You could also add a "rejected" status
      await Clan.findByIdAndDelete(clanId);
      
      console.log(`Clan ${clan.name} rejected and deleted by admin ${auth.user.walletAddress} (${auth.user.username || 'no username'})`);
      
      return NextResponse.json({ 
        success: true, 
        message: `Clan "${clan.name}" has been rejected and removed` 
      });
      
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "approve" or "reject"' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error in clan admin action:', error);
    return NextResponse.json(
      { error: 'Failed to perform clan admin action' },
      { status: 500 }
    );
  }
}