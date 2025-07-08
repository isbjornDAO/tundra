import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Clan } from '@/lib/models/Clan';
import { User } from '@/lib/models/User';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const data = await request.json();
    const { walletAddress, clanId, action } = data; // action: 'request' or 'leave'
    
    if (!walletAddress || !clanId || !action) {
      return NextResponse.json(
        { error: 'Wallet address, clan ID, and action are required' },
        { status: 400 }
      );
    }
    
    // Find the user
    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Find the clan
    const clan = await Clan.findById(clanId).populate('members');
    if (!clan) {
      return NextResponse.json(
        { error: 'Clan not found' },
        { status: 404 }
      );
    }
    
    if (action === 'request') {
      // Check if user is already in a clan
      if (user.clan) {
        return NextResponse.json(
          { error: 'You are already in a clan. Leave your current clan first.' },
          { status: 400 }
        );
      }
      
      // Check country restriction
      if (user.country !== clan.country) {
        return NextResponse.json(
          { error: `You can only join clans from your country (${user.country}). This clan is from ${clan.country}.` },
          { status: 403 }
        );
      }
      
      // Check if user has already requested to join
      const existingRequest = clan.joinRequests.find(
        req => req.user.toString() === user._id.toString() && req.status === 'pending'
      );
      
      if (existingRequest) {
        return NextResponse.json(
          { error: 'You have already requested to join this clan' },
          { status: 409 }
        );
      }
      
      // Add join request
      clan.joinRequests.push({
        user: user._id,
        requestedAt: new Date(),
        status: 'pending'
      });
      
      await clan.save();
      
      return NextResponse.json({
        message: 'Join request sent successfully',
        status: 'pending'
      });
      
    } else if (action === 'leave') {
      // Check if user is in this clan
      if (user.clan?.toString() !== clanId) {
        return NextResponse.json(
          { error: 'You are not a member of this clan' },
          { status: 400 }
        );
      }
      
      // Check if user is the clan leader
      if (clan.leader.toString() === user._id.toString()) {
        return NextResponse.json(
          { error: 'Clan leaders cannot leave. Transfer leadership or disband the clan.' },
          { status: 400 }
        );
      }
      
      // Remove user from clan
      clan.members = clan.members.filter(
        memberId => memberId.toString() !== user._id.toString()
      );
      
      await clan.save();
      
      // Update user
      await User.findByIdAndUpdate(user._id, {
        clan: null,
        isClanLeader: false,
        updatedAt: new Date()
      });
      
      return NextResponse.json({
        message: 'Successfully left the clan'
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Error processing clan join/leave request:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}