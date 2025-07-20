import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import { Tournament } from "@/lib/models/Tournament";
import { TournamentRegistration } from "@/lib/models/TournamentRegistration";
import { Clan } from "@/lib/models/Clan";
import { User } from "@/lib/models/User";
import { validateObjectId, validateWalletAddress, sanitizeInput } from "@/lib/security-utils";
import { autoGenerateMatches } from "@/lib/tournament-utils";

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const requestBody = await request.json();
    const sanitizedData = sanitizeInput(requestBody);
    const { tournamentId, clanId, organizer, selectedPlayers } = sanitizedData;
    
    if (!tournamentId || !clanId || !organizer || !selectedPlayers) {
      return NextResponse.json({ error: "Missing required fields: tournamentId, clanId, organizer, selectedPlayers" }, { status: 400 });
    }
    
    // Validate tournament ID
    const { isValid: tournamentIdValid, objectId: validatedTournamentId, error: tournamentIdError } = validateObjectId(tournamentId);
    if (!tournamentIdValid) {
      return NextResponse.json({ error: `Invalid tournament ID: ${tournamentIdError}` }, { status: 400 });
    }
    
    // Validate clan ID
    const { isValid: clanIdValid, objectId: validatedClanId, error: clanIdError } = validateObjectId(clanId);
    if (!clanIdValid) {
      return NextResponse.json({ error: `Invalid clan ID: ${clanIdError}` }, { status: 400 });
    }
    
    // Validate organizer wallet address
    const { isValid: organizerValid, address: validatedOrganizer, error: organizerError } = validateWalletAddress(organizer);
    if (!organizerValid) {
      return NextResponse.json({ error: `Invalid organizer address: ${organizerError}` }, { status: 400 });
    }
    
    // Validate selected players
    if (!Array.isArray(selectedPlayers) || selectedPlayers.length < 3) {
      return NextResponse.json({ error: "At least 3 players must be selected" }, { status: 400 });
    }

    // Check if tournament exists and has space
    const tournament = await Tournament.findById(validatedTournamentId);
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    if (tournament.registeredTeams >= tournament.maxTeams) {
      return NextResponse.json({ error: "Tournament is full" }, { status: 400 });
    }

    // Check if tournament is open for registration
    if (tournament.status !== 'open') {
      return NextResponse.json({ error: "Tournament is not open for registration" }, { status: 400 });
    }

    // Check if clan exists
    const clan = await Clan.findById(validatedClanId).populate('members', 'displayName walletAddress');
    if (!clan) {
      return NextResponse.json({ error: "Clan not found" }, { status: 404 });
    }

    // Verify organizer is the clan leader
    const organizerUser = await User.findOne({ walletAddress: validatedOrganizer });
    if (!organizerUser || clan.leader.toString() !== organizerUser._id.toString()) {
      return NextResponse.json({ error: "Only the clan leader can register for tournaments" }, { status: 403 });
    }

    // Check for duplicate registration
    const existingRegistration = await TournamentRegistration.findOne({ 
      tournamentId: validatedTournamentId,
      clanId: validatedClanId
    });
    
    if (existingRegistration) {
      return NextResponse.json({ error: "Clan has already registered for this tournament" }, { status: 400 });
    }

    // Validate that selected players are clan members
    const clanMemberIds = clan.members.map(member => member._id.toString());
    for (const player of selectedPlayers) {
      if (!clanMemberIds.includes(player.userId)) {
        return NextResponse.json({ error: `Player ${player.displayName} is not a member of this clan` }, { status: 400 });
      }
    }

    // Create tournament registration
    const registration = new TournamentRegistration({
      tournamentId: validatedTournamentId,
      clanId: validatedClanId,
      organizer: validatedOrganizer,
      selectedPlayers: selectedPlayers,
      registeredAt: new Date()
    });

    await registration.save();

    // Update tournament registered teams count
    await Tournament.findByIdAndUpdate(validatedTournamentId, {
      $inc: { registeredTeams: 1 }
    });

    // Auto-generate matches if tournament is now full
    if (tournament.registeredTeams + 1 >= tournament.maxTeams) {
      try {
        console.log(`Tournament ${tournament.name} is now full. Auto-generating matches...`);
        await autoGenerateMatches(validatedTournamentId);
        console.log(`Matches generated successfully for tournament ${tournament.name}`);
        
        // Update tournament status to 'active'
        await Tournament.findByIdAndUpdate(validatedTournamentId, {
          status: 'active'
        });
      } catch (matchError) {
        console.error('Error auto-generating matches:', matchError);
        // Don't fail the registration if match generation fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      registration: registration,
      clan: { name: clan.name, tag: clan.tag },
      message: "Clan registered successfully for tournament" 
    }, { status: 201 });

  } catch (error) {
    console.error("Tournament registration error:", error);
    return NextResponse.json({ error: "Failed to register clan for tournament" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const tournamentIdParam = searchParams.get("tournamentId");
    
    if (!tournamentIdParam) {
      return NextResponse.json({ error: "Tournament ID required" }, { status: 400 });
    }
    
    // Validate tournament ID
    const { isValid, objectId, error } = validateObjectId(tournamentIdParam);
    if (!isValid) {
      return NextResponse.json({ error: `Invalid tournament ID: ${error}` }, { status: 400 });
    }

    const registrations = await TournamentRegistration.find({ tournamentId: objectId })
      .populate('clanId', 'name tag country')
      .populate('selectedPlayers.userId', 'displayName walletAddress');

    return NextResponse.json({ clans: registrations });
  } catch (error) {
    console.error("Error fetching tournament clans:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}