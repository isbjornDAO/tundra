import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { User } from '@/lib/models/User';
import { Clan } from '@/lib/models/Clan';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { walletAddress, clanId } = await request.json();
    
    if (!walletAddress || !clanId) {
      return NextResponse.json(
        { error: 'Wallet address and clan ID are required' },
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
    
    // Check if user is in the clan
    if (!user.clan || user.clan.toString() !== clanId) {
      return NextResponse.json(
        { error: 'User is not in this clan' },
        { status: 400 }
      );
    }
    
    // Find the clan
    const clan = await Clan.findById(clanId);
    if (!clan) {
      return NextResponse.json(
        { error: 'Clan not found' },
        { status: 404 }
      );
    }
    
    // Check if user is the leader - leaders cannot leave directly
    if (user.isClanLeader) {
      return NextResponse.json(
        { error: 'Clan leaders cannot leave. Please transfer leadership first or disband the clan.' },
        { status: 400 }
      );
    }
    
    // Remove user from clan
    await User.findByIdAndUpdate(user._id, {
      $unset: { clan: 1 },
      $set: { isClanLeader: false }
    });
    
    // Remove user from clan members list and update member count
    await Clan.findByIdAndUpdate(clanId, {
      $pull: { members: user._id }
    });
    
    // Update member count by counting actual members
    const updatedClan = await Clan.findById(clanId);
    if (updatedClan) {
      updatedClan.memberCount = updatedClan.members.length;
      await updatedClan.save();
    }
    
    return NextResponse.json({ message: 'Successfully left clan' });
    
  } catch (error) {
    console.error('Error leaving clan:', error);
    return NextResponse.json(
      { error: 'Failed to leave clan' },
      { status: 500 }
    );
  }
}