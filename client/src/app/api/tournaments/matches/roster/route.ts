import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { validateObjectId, validateWalletAddress, sanitizeInput } from '@/lib/security-utils';
import { Match } from '@/lib/models/Match';
import { User } from '@/lib/models/User';
import { Clan } from '@/lib/models/Clan';

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const requestBody = await request.json();
    const sanitizedData = sanitizeInput(requestBody);
    const { matchId, roster, submittedBy } = sanitizedData;
    
    if (!matchId || !roster || !submittedBy) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const { isValid: matchIdValid, objectId: validatedMatchId, error: matchIdError } = validateObjectId(matchId);
    if (!matchIdValid) {
      return NextResponse.json({ error: `Invalid match ID: ${matchIdError}` }, { status: 400 });
    }
    
    const { isValid: walletValid, address: validatedAddress, error: walletError } = validateWalletAddress(submittedBy);
    if (!walletValid) {
      return NextResponse.json({ error: `Invalid wallet address: ${walletError}` }, { status: 400 });
    }
    
    const match = await Match.findById(validatedMatchId).populate('clan1 clan2');
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }
    
    const user = await User.findOne({ walletAddress: validatedAddress });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const userClan = await Clan.findById(user.clan);
    if (!userClan) {
      return NextResponse.json({ error: 'User must be in a clan to set roster' }, { status: 400 });
    }
    
    if (!user.isClanLeader && userClan.leader.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Only clan leaders can set match rosters' }, { status: 403 });
    }
    
    // Determine which clan this user represents
    const isUserClan1 = match.clan1._id.toString() === userClan._id.toString();
    const isUserClan2 = match.clan2._id.toString() === userClan._id.toString();
    
    if (!isUserClan1 && !isUserClan2) {
      return NextResponse.json({ error: 'You can only set rosters for your own clan' }, { status: 403 });
    }
    
    // Validate that all roster players are actual clan members
    const clanMembers = await User.find({ clan: userClan._id });
    const memberIds = clanMembers.map(member => member._id.toString());
    
    for (const playerId of roster) {
      if (!memberIds.includes(playerId)) {
        const invalidPlayer = await User.findById(playerId);
        return NextResponse.json({ 
          error: `Player ${invalidPlayer?.username || playerId} is not a member of your clan` 
        }, { status: 400 });
      }
    }
    
    // Get player details for the roster
    const rosterPlayers = await User.find({ _id: { $in: roster } });
    const rosterData = rosterPlayers.map(player => ({
      userId: player._id,
      username: player.username,
      confirmed: true
    }));
    
    // Update the appropriate clan roster
    if (!match.rosters) {
      match.rosters = { clan1: [], clan2: [] };
    }
    
    if (isUserClan1) {
      match.rosters.clan1 = rosterData;
    } else {
      match.rosters.clan2 = rosterData;
    }
    
    await match.save();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Match roster set successfully',
      roster: rosterData
    });
    
  } catch (error) {
    console.error('Error setting match roster:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId');
    
    if (!matchId) {
      return NextResponse.json({ error: 'Match ID is required' }, { status: 400 });
    }
    
    const { isValid: matchIdValid, objectId: validatedMatchId, error: matchIdError } = validateObjectId(matchId);
    if (!matchIdValid) {
      return NextResponse.json({ error: `Invalid match ID: ${matchIdError}` }, { status: 400 });
    }
    
    const match = await Match.findById(validatedMatchId)
      .populate('clan1 clan2')
      .populate('rosters.clan1.userId', 'username displayName')
      .populate('rosters.clan2.userId', 'username displayName');
      
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      rosters: match.rosters || { clan1: [], clan2: [] },
      clan1: match.clan1,
      clan2: match.clan2
    });
    
  } catch (error) {
    console.error('Error fetching match roster:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}