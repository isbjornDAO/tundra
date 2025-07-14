import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { Clan } from '@/lib/models/Clan';
import { User } from '@/lib/models/User';

// GET - Get all join requests for a clan (clan leaders only)
export async function GET(
  request: NextRequest,
  { params }: { params: { clanId: string } }
) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
    }

    // Find the user
    const user = await User.findOne({ walletAddress });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find the clan and check if user is the leader
    const clan = await Clan.findById(params.clanId).populate('joinRequests.user', 'username walletAddress country');
    if (!clan) {
      return NextResponse.json({ error: 'Clan not found' }, { status: 404 });
    }

    // Check if user is the clan leader
    if (clan.leader.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Only clan leaders can view join requests' }, { status: 403 });
    }

    // Return pending join requests
    const pendingRequests = clan.joinRequests.filter(req => req.status === 'pending');

    return NextResponse.json({ joinRequests: pendingRequests });
  } catch (error) {
    console.error('Error fetching join requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Approve or reject a join request
export async function PUT(
  request: NextRequest,
  { params }: { params: { clanId: string } }
) {
  try {
    await connectToDatabase();

    const { requestId, action, walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
    }

    if (!requestId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    // Find the user
    const user = await User.findOne({ walletAddress });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find the clan and check if user is the leader
    const clan = await Clan.findById(params.clanId);
    if (!clan) {
      return NextResponse.json({ error: 'Clan not found' }, { status: 404 });
    }

    // Check if user is the clan leader
    if (clan.leader.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Only clan leaders can manage join requests' }, { status: 403 });
    }

    // Find the join request
    const joinRequest = clan.joinRequests.find(req => req._id.toString() === requestId);
    if (!joinRequest) {
      return NextResponse.json({ error: 'Join request not found' }, { status: 404 });
    }

    if (joinRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Join request already processed' }, { status: 400 });
    }

    if (action === 'approve') {
      // Add user to clan members
      if (!clan.members.includes(joinRequest.user)) {
        clan.members.push(joinRequest.user);
      }

      // Update user's clan
      await User.findByIdAndUpdate(joinRequest.user, { clan: clan._id });

      // Update join request status
      joinRequest.status = 'approved';
      joinRequest.respondedAt = new Date();
    } else {
      // Reject the request
      joinRequest.status = 'rejected';
      joinRequest.respondedAt = new Date();
    }

    await clan.save();

    return NextResponse.json({ 
      message: `Join request ${action}d successfully`,
      action,
      requestId 
    });
  } catch (error) {
    console.error('Error processing join request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}