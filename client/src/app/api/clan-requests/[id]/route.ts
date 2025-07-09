import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { ClanRequest } from '@/lib/models/ClanRequest';
import { Clan } from '@/lib/models/Clan';
import { User } from '@/lib/models/User';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    
    const data = await request.json();
    const { action, reviewerWallet, reviewNotes } = data;
    const requestId = params.id;
    
    if (!action || !reviewerWallet) {
      return NextResponse.json(
        { error: 'Action and reviewer wallet are required' },
        { status: 400 }
      );
    }
    
    // Find the reviewer
    const reviewer = await User.findOne({ 
      walletAddress: reviewerWallet.toLowerCase(),
      isAdmin: true 
    });
    
    if (!reviewer) {
      return NextResponse.json(
        { error: 'Unauthorized - admin access required' },
        { status: 403 }
      );
    }
    
    // Find the clan request
    const clanRequest = await ClanRequest.findById(requestId)
      .populate('requestedBy');
    
    if (!clanRequest) {
      return NextResponse.json(
        { error: 'Clan request not found' },
        { status: 404 }
      );
    }
    
    if (clanRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Clan request has already been reviewed' },
        { status: 400 }
      );
    }
    
    // Check if reviewer has authority for this region/country
    const canReview = reviewer.adminRegions.length === 0 || // Super admin
                      reviewer.adminRegions.includes(clanRequest.region) ||
                      reviewer.country === clanRequest.country;
    
    if (!canReview) {
      return NextResponse.json(
        { error: 'You do not have authority to review requests for this region' },
        { status: 403 }
      );
    }
    
    // Update the request
    clanRequest.status = action; // 'approved' or 'rejected'
    clanRequest.reviewedBy = reviewer._id;
    clanRequest.reviewedAt = new Date();
    clanRequest.reviewNotes = reviewNotes;
    clanRequest.updatedAt = new Date();
    
    await clanRequest.save();
    
    // If approved, create the actual clan
    if (action === 'approved') {
      const clan = new Clan({
        name: clanRequest.clanName,
        tag: clanRequest.clanTag,
        description: clanRequest.description,
        logo: clanRequest.logo,
        leader: clanRequest.requestedBy._id,
        members: [clanRequest.requestedBy._id],
        country: clanRequest.country,
        region: clanRequest.region,
        isVerified: true,
        verifiedBy: reviewer._id,
        verifiedAt: new Date()
      });
      
      await clan.save();
      
      // Update the user to be clan leader
      await User.findByIdAndUpdate(clanRequest.requestedBy._id, {
        clan: clan._id,
        isClanLeader: true,
        updatedAt: new Date()
      });
      
      const populatedRequest = await ClanRequest.findById(requestId)
        .populate('requestedBy', 'displayName username walletAddress')
        .populate('reviewedBy', 'displayName username');
      
      return NextResponse.json({
        request: populatedRequest,
        clan: clan,
        message: 'Clan request approved and clan created successfully'
      });
    }
    
    const populatedRequest = await ClanRequest.findById(requestId)
      .populate('requestedBy', 'displayName username walletAddress')
      .populate('reviewedBy', 'displayName username');
    
    return NextResponse.json({
      request: populatedRequest,
      message: 'Clan request rejected'
    });
    
  } catch (error) {
    console.error('Error reviewing clan request:', error);
    return NextResponse.json({ error: 'Failed to review clan request' }, { status: 500 });
  }
}