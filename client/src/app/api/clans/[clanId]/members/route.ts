import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { Clan } from '@/lib/models/Clan';
import { User } from '@/lib/models/User';

// DELETE - Remove a member from clan (clan leaders only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { clanId: string } }
) {
  try {
    await connectToDatabase();

    const { walletAddress, memberWalletAddress } = await request.json();

    if (!walletAddress || !memberWalletAddress) {
      return NextResponse.json({ error: 'Wallet addresses required' }, { status: 400 });
    }

    // Find the requesting user
    const user = await User.findOne({ walletAddress });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find the member to remove
    const memberToRemove = await User.findOne({ walletAddress: memberWalletAddress });
    if (!memberToRemove) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Find the clan and check if user is the leader
    const clan = await Clan.findById(params.clanId);
    if (!clan) {
      return NextResponse.json({ error: 'Clan not found' }, { status: 404 });
    }

    // Check if user is the clan leader
    if (clan.leader.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Only clan leaders can remove members' }, { status: 403 });
    }

    // Prevent leader from removing themselves
    if (memberToRemove._id.toString() === clan.leader.toString()) {
      return NextResponse.json({ error: 'Cannot remove clan leader. Transfer leadership first.' }, { status: 400 });
    }

    // Check if member is actually in the clan
    if (!clan.members.includes(memberToRemove._id)) {
      return NextResponse.json({ error: 'User is not a member of this clan' }, { status: 400 });
    }

    // Remove member from clan
    clan.members = clan.members.filter(memberId => memberId.toString() !== memberToRemove._id.toString());
    await clan.save();

    // Remove clan reference from user
    await User.findByIdAndUpdate(memberToRemove._id, { 
      $unset: { clan: 1 }
    });

    return NextResponse.json({ 
      message: 'Member removed successfully',
      removedMember: {
        username: memberToRemove.username,
        walletAddress: memberToRemove.walletAddress
      }
    });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Invite a member to clan (clan leaders only)
export async function POST(
  request: NextRequest,
  { params }: { params: { clanId: string } }
) {
  try {
    await connectToDatabase();

    const { walletAddress, inviteWalletAddress } = await request.json();

    if (!walletAddress || !inviteWalletAddress) {
      return NextResponse.json({ error: 'Wallet addresses required' }, { status: 400 });
    }

    // Find the requesting user
    const user = await User.findOne({ walletAddress });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find the user to invite
    const userToInvite = await User.findOne({ walletAddress: inviteWalletAddress });
    if (!userToInvite) {
      return NextResponse.json({ error: 'User to invite not found' }, { status: 404 });
    }

    // Find the clan and check if user is the leader
    const clan = await Clan.findById(params.clanId);
    if (!clan) {
      return NextResponse.json({ error: 'Clan not found' }, { status: 404 });
    }

    // Check if user is the clan leader
    if (clan.leader.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Only clan leaders can invite members' }, { status: 403 });
    }

    // Check if user is already in a clan
    if (userToInvite.clan) {
      return NextResponse.json({ error: 'User is already in a clan' }, { status: 400 });
    }

    // Check if user already has a pending join request
    const existingRequest = clan.joinRequests.find(
      req => req.user.toString() === userToInvite._id.toString() && req.status === 'pending'
    );
    if (existingRequest) {
      return NextResponse.json({ error: 'User already has a pending join request' }, { status: 400 });
    }

    // Add user directly to clan (since it's an invitation)
    if (!clan.members.includes(userToInvite._id)) {
      clan.members.push(userToInvite._id);
      await clan.save();

      // Update user's clan
      await User.findByIdAndUpdate(userToInvite._id, { clan: clan._id });

      return NextResponse.json({ 
        message: 'User invited and added to clan successfully',
        invitedMember: {
          username: userToInvite.username,
          walletAddress: userToInvite.walletAddress
        }
      });
    } else {
      return NextResponse.json({ error: 'User is already a member of this clan' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error inviting member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}