import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { Clan } from '@/lib/models/Clan';
import { User } from '@/lib/models/User';

// POST - Transfer clan leadership
export async function POST(
  request: NextRequest,
  { params }: { params: { clanId: string } }
) {
  try {
    await connectToDatabase();

    const { walletAddress, newLeaderWalletAddress } = await request.json();

    if (!walletAddress || !newLeaderWalletAddress) {
      return NextResponse.json({ error: 'Wallet addresses required' }, { status: 400 });
    }

    // Find the current leader
    const currentLeader = await User.findOne({ walletAddress });
    if (!currentLeader) {
      return NextResponse.json({ error: 'Current leader not found' }, { status: 404 });
    }

    // Find the new leader
    const newLeader = await User.findOne({ walletAddress: newLeaderWalletAddress });
    if (!newLeader) {
      return NextResponse.json({ error: 'New leader not found' }, { status: 404 });
    }

    // Find the clan and check if user is the current leader
    const clan = await Clan.findById(params.clanId);
    if (!clan) {
      return NextResponse.json({ error: 'Clan not found' }, { status: 404 });
    }

    // Check if user is the current clan leader
    if (clan.leader.toString() !== currentLeader._id.toString()) {
      return NextResponse.json({ error: 'Only the current clan leader can transfer leadership' }, { status: 403 });
    }

    // Check if new leader is a member of the clan
    if (!clan.members.includes(newLeader._id) && clan.leader.toString() !== newLeader._id.toString()) {
      return NextResponse.json({ error: 'New leader must be a member of the clan' }, { status: 400 });
    }

    // Cannot transfer to self
    if (currentLeader._id.toString() === newLeader._id.toString()) {
      return NextResponse.json({ error: 'Cannot transfer leadership to yourself' }, { status: 400 });
    }

    // Update clan leadership
    clan.leader = newLeader._id;
    await clan.save();

    // Update user roles
    await User.findByIdAndUpdate(currentLeader._id, { isClanLeader: false });
    await User.findByIdAndUpdate(newLeader._id, { isClanLeader: true });

    // Ensure old leader is still a member (not removed when leadership transfers)
    if (!clan.members.includes(currentLeader._id)) {
      clan.members.push(currentLeader._id);
      await clan.save();
    }

    return NextResponse.json({ 
      message: 'Leadership transferred successfully',
      newLeader: {
        username: newLeader.username,
        walletAddress: newLeader.walletAddress
      },
      previousLeader: {
        username: currentLeader.username,
        walletAddress: currentLeader.walletAddress
      }
    });
  } catch (error) {
    console.error('Error transferring leadership:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}