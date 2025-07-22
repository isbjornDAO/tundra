import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { validateObjectId, validateWalletAddress, sanitizeInput } from '@/lib/security-utils';
import { Tournament } from '@/lib/models/Tournament';
import { TournamentRegistration } from '@/lib/models/TournamentRegistration';
import { User } from '@/lib/models/User';
import { Clan } from '@/lib/models/Clan';

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const requestBody = await request.json();
    const sanitizedData = sanitizeInput(requestBody);
    const { tournamentId, clanId, organizer, selectedPlayers } = sanitizedData;
    
    if (!tournamentId || !clanId || !organizer || !selectedPlayers) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Validate IDs
    const { isValid: tournamentIdValid, objectId: validatedTournamentId, error: tournamentIdError } = validateObjectId(tournamentId);
    if (!tournamentIdValid) {
      return NextResponse.json({ error: `Invalid tournament ID: ${tournamentIdError}` }, { status: 400 });
    }
    
    const { isValid: clanIdValid, objectId: validatedClanId, error: clanIdError } = validateObjectId(clanId);
    if (!clanIdValid) {
      return NextResponse.json({ error: `Invalid clan ID: ${clanIdError}` }, { status: 400 });
    }
    
    const { isValid: walletValid, address: validatedAddress, error: walletError } = validateWalletAddress(organizer);
    if (!walletValid) {
      return NextResponse.json({ error: `Invalid wallet address: ${walletError}` }, { status: 400 });
    }
    
    // Validate tournament exists and is open for registration
    const tournament = await Tournament.findById(validatedTournamentId);
    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }
    
    if (tournament.status !== 'open') {
      return NextResponse.json({ error: 'Tournament is not open for registration' }, { status: 400 });
    }
    
    // Validate user and clan
    const user = await User.findOne({ walletAddress: validatedAddress });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const clan = await Clan.findById(validatedClanId);
    if (!clan) {
      return NextResponse.json({ error: 'Clan not found' }, { status: 404 });
    }
    
    // Verify user is clan leader
    if (!user.isClanLeader && clan.leader.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Only clan leaders can register for tournaments' }, { status: 403 });
    }
    
    // Verify user is in the clan they're registering
    if (user.clan?.toString() !== validatedClanId.toString()) {
      return NextResponse.json({ error: 'You can only register your own clan' }, { status: 403 });
    }
    
    // Check if clan is already registered
    const existingRegistration = await TournamentRegistration.findOne({
      tournamentId: validatedTournamentId,
      clanId: validatedClanId
    });
    
    if (existingRegistration) {
      return NextResponse.json({ error: 'Clan is already registered for this tournament' }, { status: 400 });
    }
    
    // Validate selected players
    if (!Array.isArray(selectedPlayers) || selectedPlayers.length < 2) {
      return NextResponse.json({ error: 'At least 2 players must be selected' }, { status: 400 });
    }
    
    // Verify all selected players are actual clan members
    const playerIds = selectedPlayers.map(p => p.userId);
    const clanMembers = await User.find({ 
      _id: { $in: playerIds },
      clan: validatedClanId 
    });
    
    if (clanMembers.length !== playerIds.length) {
      return NextResponse.json({ error: 'All selected players must be clan members' }, { status: 400 });
    }
    
    // Create tournament registration
    const registration = new TournamentRegistration({
      tournamentId: validatedTournamentId,
      clanId: validatedClanId,
      organizer: validatedAddress,
      selectedPlayers: selectedPlayers.map(player => ({
        userId: player.userId,
        username: player.username,
        displayName: player.displayName,
        walletAddress: player.walletAddress,
        registeredAt: new Date()
      })),
      status: 'registered'
    });
    
    await registration.save();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Clan registered successfully',
      registrationId: registration._id,
      selectedPlayers: registration.selectedPlayers.length
    });
    
  } catch (error) {
    console.error('Error registering clan for tournament:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get('tournamentId');
    const clanId = searchParams.get('clanId');
    
    if (!tournamentId) {
      return NextResponse.json({ error: 'Tournament ID is required' }, { status: 400 });
    }
    
    const { isValid: tournamentIdValid, objectId: validatedTournamentId, error: tournamentIdError } = validateObjectId(tournamentId);
    if (!tournamentIdValid) {
      return NextResponse.json({ error: `Invalid tournament ID: ${tournamentIdError}` }, { status: 400 });
    }
    
    let query: any = { tournamentId: validatedTournamentId };
    
    if (clanId) {
      const { isValid: clanIdValid, objectId: validatedClanId, error: clanIdError } = validateObjectId(clanId);
      if (!clanIdValid) {
        return NextResponse.json({ error: `Invalid clan ID: ${clanIdError}` }, { status: 400 });
      }
      query.clanId = validatedClanId;
    }
    
    const registrations = await TournamentRegistration.find(query)
      .populate('clanId', 'name tag')
      .populate('selectedPlayers.userId', 'username displayName')
      .lean();
    
    return NextResponse.json({ registrations });
    
  } catch (error) {
    console.error('Error fetching tournament registrations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}