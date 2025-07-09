import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { Clan } from '@/lib/models/Clan';
import { User } from '@/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const clanId = searchParams.get('id');
    const leaderAddress = searchParams.get('leaderAddress');
    
    if (clanId) {
      const clan = await Clan.findById(clanId)
        .populate('leader')
        .populate('members');
      return NextResponse.json(clan);
    }
    
    if (leaderAddress) {
      // Find user by wallet address
      const leader = await User.findOne({ walletAddress: leaderAddress.toLowerCase() });
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
    
    const data = await request.json();
    const { name, tag, description, logo, leaderWallet, region } = data;
    
    if (!name || !tag || !leaderWallet || !region) {
      return NextResponse.json(
        { error: 'Name, tag, leader wallet, and region are required' },
        { status: 400 }
      );
    }
    
    // Find the leader user
    const leader = await User.findOne({ walletAddress: leaderWallet.toLowerCase() });
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
      $or: [{ name }, { tag }]
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
      region,
      country: leader.country || region // Use leader's country or region as fallback
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