import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { Clan } from '@/lib/models/Clan';
import { User } from '@/lib/models/User';

export async function PATCH(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { clanId, action, walletAddress } = await request.json();
    
    if (!clanId || !action || !walletAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: clanId, action, walletAddress' },
        { status: 400 }
      );
    }

    // Verify admin permissions
    const admin = await User.findOne({ 
      walletAddress: walletAddress.toLowerCase(),
      isAdmin: true 
    });
    
    if (!admin) {
      return NextResponse.json(
        { error: 'Access denied. Admin permissions required.' },
        { status: 403 }
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
      clan.verifiedBy = admin._id;
      clan.verifiedAt = new Date();
      clan.updatedAt = new Date();
      
      await clan.save();
      
      console.log(`Clan ${clan.name} approved by admin ${admin.username}`);
      
      return NextResponse.json({ 
        success: true, 
        message: `Clan "${clan.name}" has been approved`,
        clan 
      });
      
    } else if (action === 'reject') {
      // For now, we'll just delete the clan. You could also add a "rejected" status
      await Clan.findByIdAndDelete(clanId);
      
      console.log(`Clan ${clan.name} rejected and deleted by admin ${admin.username}`);
      
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