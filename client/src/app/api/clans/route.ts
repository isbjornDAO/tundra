import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { Clan } from '@/lib/models/Clan';
import { User } from '@/lib/models/User';
import { validateObjectId, validateWalletAddress, sanitizeInput, escapeRegex, validateCountryCode } from '@/lib/security-utils';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const clanIdParam = searchParams.get('id');
    const leaderAddressParam = searchParams.get('leaderAddress');
    
    if (clanIdParam) {
      // Validate clanId parameter
      const { isValid, objectId, error } = validateObjectId(clanIdParam);
      if (!isValid) {
        return NextResponse.json({ error: `Invalid clanId: ${error}` }, { status: 400 });
      }
      
      const clan = await Clan.findById(objectId)
        .populate('leader')
        .populate('members');
      return NextResponse.json(clan);
    }
    
    if (leaderAddressParam) {
      // Validate wallet address
      const { isValid, address, error } = validateWalletAddress(leaderAddressParam);
      if (!isValid) {
        return NextResponse.json({ error: `Invalid wallet address: ${error}` }, { status: 400 });
      }
      
      // Find user by wallet address
      const leader = await User.findOne({ walletAddress: address });
      if (!leader) {
        return NextResponse.json({ clans: [] });
      }
      
      // Find clans where this user is the leader
      const clans = await Clan.find({ leader: leader._id })
        .populate('leader')
        .populate('members');
      
      return NextResponse.json({ clans });
    }
    
    const clans = await Clan.find({})
      .populate('leader')
      .populate('members');
    
    console.log('Clans API - Found clans:', clans.length);
    console.log('Clans API - First clan:', clans[0]);
    
    return NextResponse.json(clans);
  } catch (error) {
    console.error('Error fetching clans:', error);
    return NextResponse.json({ error: 'Failed to fetch clans' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const requestBody = await request.json();
    const sanitizedData = sanitizeInput(requestBody);
    const { name, tag, description, logo, leaderWallet, region } = sanitizedData;
    
    if (!name || !tag || !leaderWallet || !region) {
      return NextResponse.json(
        { error: 'Name, tag, leader wallet, and region are required' },
        { status: 400 }
      );
    }
    
    // Validate wallet address
    const { isValid: walletValid, address: validatedWallet, error: walletError } = validateWalletAddress(leaderWallet);
    if (!walletValid) {
      return NextResponse.json({ error: `Invalid wallet address: ${walletError}` }, { status: 400 });
    }
    
    // Validate region
    const { isValid: regionValid, country: validatedRegion, error: regionError } = validateCountryCode(region);
    if (!regionValid) {
      return NextResponse.json({ error: `Invalid region: ${regionError}` }, { status: 400 });
    }
    
    // Validate name and tag format
    if (name.length < 3 || name.length > 50) {
      return NextResponse.json({ error: 'Clan name must be 3-50 characters' }, { status: 400 });
    }
    
    if (tag.length < 2 || tag.length > 5) {
      return NextResponse.json({ error: 'Clan tag must be 2-5 characters' }, { status: 400 });
    }
    
    if (!/^[a-zA-Z0-9\s_-]+$/.test(name)) {
      return NextResponse.json({ error: 'Clan name contains invalid characters' }, { status: 400 });
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(tag)) {
      return NextResponse.json({ error: 'Clan tag contains invalid characters' }, { status: 400 });
    }
    
    // Find the leader user
    const leader = await User.findOne({ walletAddress: validatedWallet });
    if (!leader) {
      return NextResponse.json(
        { error: 'Leader user not found' },
        { status: 404 }
      );
    }
    
    // Check if user is already in a clan
    if (leader.clan) {
      return NextResponse.json(
        { error: 'User is already in a clan' },
        { status: 400 }
      );
    }
    
    // Check if clan name or tag already exists
    const existingClan = await Clan.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${escapeRegex(name)}$`, 'i') } },
        { tag: { $regex: new RegExp(`^${escapeRegex(tag)}$`, 'i') } }
      ]
    });
    
    if (existingClan) {
      return NextResponse.json(
        { error: 'Clan name or tag already exists' },
        { status: 409 }
      );
    }
    
    const clan = new Clan({
      name,
      tag,
      description,
      logo,
      leader: leader._id,
      members: [leader._id],
      region: validatedRegion,
      country: leader.country || validatedRegion // Use leader's country or region as fallback
    });
    
    await clan.save();
    
    // Update leader user
    leader.clan = clan._id;
    leader.isClanLeader = true;
    await leader.save();
    
    const populatedClan = await Clan.findById(clan._id)
      .populate('leader')
      .populate('members');
    
    return NextResponse.json(populatedClan, { status: 201 });
  } catch (error) {
    console.error('Error creating clan:', error);
    return NextResponse.json({ error: 'Failed to create clan' }, { status: 500 });
  }
}