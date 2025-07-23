import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { validateObjectId, sanitizeInput } from '@/lib/security-utils';
import { Tournament } from '@/lib/models/Tournament';
import { Match } from '@/lib/models/Match';
import { Clan } from '@/lib/models/Clan';
import { TournamentRegistration } from '@/lib/models/TournamentRegistration';

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const requestBody = await request.json();
    const sanitizedData = sanitizeInput(requestBody);
    const { tournamentId } = sanitizedData;
    
    if (!tournamentId) {
      return NextResponse.json({ error: 'Tournament ID is required' }, { status: 400 });
    }
    
    const { isValid, objectId, error } = validateObjectId(tournamentId);
    if (!isValid) {
      return NextResponse.json({ error: `Invalid tournament ID: ${error}` }, { status: 400 });
    }
    
    // Get tournament
    const tournament = await Tournament.findById(objectId);
    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }
    
    // Get all matches for this tournament
    const matches = await Match.find({ bracketId: tournament.bracketId });
    
    // Get all registrations for this tournament
    const registrations = await TournamentRegistration.find({ 
      tournamentId: objectId,
      status: 'registered' 
    }).populate('clanId').lean();
    
    let updatedMatches = 0;
    
    for (const match of matches) {
      // Skip if rosters already exist and have players
      if (match.rosters && 
          ((match.rosters.clan1 && match.rosters.clan1.length > 0) || 
           (match.rosters.clan2 && match.rosters.clan2.length > 0))) {
        continue;
      }
      
      // Find registrations for this match's clans
      const clan1Registration = registrations.find(reg => 
        reg.clanId && reg.clanId._id.toString() === match.clan1?.toString()
      );
      const clan2Registration = registrations.find(reg => 
        reg.clanId && reg.clanId._id.toString() === match.clan2?.toString()
      );
      
      // If no selected players in registration, get all clan members
      let clan1Players = [];
      let clan2Players = [];
      
      if (clan1Registration?.selectedPlayers?.length > 0) {
        clan1Players = clan1Registration.selectedPlayers.map(player => ({
          userId: player.userId,
          username: player.username || player.displayName,
          confirmed: true
        }));
      } else if (match.clan1) {
        // Fallback: get all clan members
        const clan1 = await Clan.findById(match.clan1).populate('members');
        if (clan1 && clan1.members) {
          clan1Players = clan1.members.slice(0, 5).map((member: any) => ({
            userId: member._id,
            username: member.username || member.displayName,
            confirmed: true
          }));
        }
      }
      
      if (clan2Registration?.selectedPlayers?.length > 0) {
        clan2Players = clan2Registration.selectedPlayers.map(player => ({
          userId: player.userId,
          username: player.username || player.displayName,
          confirmed: true
        }));
      } else if (match.clan2) {
        // Fallback: get all clan members
        const clan2 = await Clan.findById(match.clan2).populate('members');
        if (clan2 && clan2.members) {
          clan2Players = clan2.members.slice(0, 5).map((member: any) => ({
            userId: member._id,
            username: member.username || member.displayName,
            confirmed: true
          }));
        }
      }
      
      // Update match with rosters
      if (clan1Players.length > 0 || clan2Players.length > 0) {
        await Match.findByIdAndUpdate(match._id, {
          rosters: {
            clan1: clan1Players,
            clan2: clan2Players
          }
        });
        updatedMatches++;
        console.log(`Updated rosters for match ${match._id}`);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Populated rosters for ${updatedMatches} matches`,
      updatedMatches
    });
    
  } catch (error) {
    console.error('Error populating rosters:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}