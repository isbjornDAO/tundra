import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { Clan } from '@/lib/models/Clan';
import { User } from '@/lib/models/User';
import { validateObjectId, sanitizeInput, escapeRegex } from '@/lib/security-utils';

// GET - Get clan details by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { clanId: string } }
) {
  try {
    await connectToDatabase();

    // Validate clanId parameter
    const { isValid, objectId, error } = validateObjectId(params.clanId);
    if (!isValid) {
      return NextResponse.json({ error: `Invalid clanId: ${error}` }, { status: 400 });
    }

    const clan = await Clan.findById(objectId)
      .populate('leader', 'username walletAddress country')
      .populate('members', 'username walletAddress country')
      .populate('joinRequests.user', 'username walletAddress country');

    if (!clan) {
      return NextResponse.json({ error: 'Clan not found' }, { status: 404 });
    }

    return NextResponse.json({ clan });
  } catch (error) {
    console.error('Error fetching clan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update clan details (clan leaders only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { clanId: string } }
) {
  try {
    await connectToDatabase();

    // Validate clanId parameter
    const { isValid, objectId, error } = validateObjectId(params.clanId);
    if (!isValid) {
      return NextResponse.json({ error: `Invalid clanId: ${error}` }, { status: 400 });
    }

    const requestBody = await request.json();
    const { walletAddress, ...updateData } = sanitizeInput(requestBody);

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
    }

    // Find the user
    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find the clan and check if user is the leader
    const clan = await Clan.findById(objectId);
    if (!clan) {
      return NextResponse.json({ error: 'Clan not found' }, { status: 404 });
    }

    // Check if user is the clan leader
    if (clan.leader.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Only clan leaders can edit clan details' }, { status: 403 });
    }

    // Validate and sanitize update data
    const allowedFields = ['name', 'tag', 'description', 'logo'];
    const sanitizedData = {};
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        sanitizedData[field] = updateData[field];
      }
    }

    // Additional validation
    if (sanitizedData.name && sanitizedData.name.length < 3) {
      return NextResponse.json({ error: 'Clan name must be at least 3 characters' }, { status: 400 });
    }

    if (sanitizedData.tag && (sanitizedData.tag.length < 2 || sanitizedData.tag.length > 5)) {
      return NextResponse.json({ error: 'Clan tag must be 2-5 characters' }, { status: 400 });
    }

    // Check if clan name or tag already exists (if being changed)
    if (sanitizedData.name || sanitizedData.tag) {
      const existingClan = await Clan.findOne({
        $and: [
          { _id: { $ne: objectId } },
          {
            $or: [
              ...(sanitizedData.name ? [{ name: { $regex: new RegExp(`^${escapeRegex(sanitizedData.name)}$`, 'i') } }] : []),
              ...(sanitizedData.tag ? [{ tag: { $regex: new RegExp(`^${escapeRegex(sanitizedData.tag)}$`, 'i') } }] : [])
            ]
          }
        ]
      });

      if (existingClan) {
        return NextResponse.json({ 
          error: 'Clan name or tag already exists' 
        }, { status: 400 });
      }
    }

    // Update the clan
    const updatedClan = await Clan.findByIdAndUpdate(
      objectId,
      { ...sanitizedData, updatedAt: new Date() },
      { new: true }
    ).populate('leader', 'username walletAddress country')
     .populate('members', 'username walletAddress country');

    return NextResponse.json({ 
      message: 'Clan updated successfully',
      clan: updatedClan 
    });
  } catch (error) {
    console.error('Error updating clan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Disband clan (clan leaders only)
export async function DELETE(
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
    const clan = await Clan.findById(params.clanId);
    if (!clan) {
      return NextResponse.json({ error: 'Clan not found' }, { status: 404 });
    }

    // Check if user is the clan leader
    if (clan.leader.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Only clan leaders can disband clans' }, { status: 403 });
    }

    // Remove clan reference from all members
    await User.updateMany(
      { clan: clan._id },
      { $unset: { clan: 1, isClanLeader: 1 } }
    );

    // Delete the clan
    await Clan.findByIdAndDelete(params.clanId);

    return NextResponse.json({ message: 'Clan disbanded successfully' });
  } catch (error) {
    console.error('Error disbanding clan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}