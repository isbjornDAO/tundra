import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import { Tournament } from "@/lib/models/Tournament";
// import { Team } from "@/lib/models/Team"; // Deprecated - using clans directly
import { TournamentRegistration } from "@/lib/models/TournamentRegistration";
import { Clan } from "@/lib/models/Clan";
import { User } from "@/lib/models/User";
import { validateObjectId, validateWalletAddress, validateCountryCode, sanitizeInput } from "@/lib/security-utils";
import { autoGenerateMatches } from "@/lib/tournament-utils";

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const requestBody = await request.json();
    const sanitizedData = sanitizeInput(requestBody);
    const { tournamentId, clanId } = sanitizedData;
    
    if (!tournamentId || !clanId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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
    
    // Check if clan exists
    const clan = await Clan.findById(validatedClanId);
    if (!clan) {
      return NextResponse.json({ error: "Clan not found" }, { status: 404 });
    }

    // Check if tournament exists and has space
    const tournament = await Tournament.findById(validatedTournamentId);
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    if (tournament.registeredTeams >= tournament.maxTeams) {
      return NextResponse.json({ error: "Tournament is full" }, { status: 400 });
    }

    // Check for duplicate registration by clan
    const existingRegistration = await TournamentRegistration.findOne({ 
      tournamentId: validatedTournamentId,
      clanId: validatedClanId 
    });
    
    if (existingRegistration) {
      return NextResponse.json({ error: "This clan has already registered for this tournament" }, { status: 400 });
    }

    // Register clan for tournament
    const registrationDoc = new TournamentRegistration({
      tournamentId: validatedTournamentId,
      clanId: validatedClanId,
      registeredAt: new Date(),
      status: 'registered'
    });
    
    const savedRegistration = await registrationDoc.save();

    // Update tournament registered clans count
    await Tournament.findByIdAndUpdate(validatedTournamentId, {
      $inc: { registeredTeams: 1 },
      $push: { registeredClans: validatedClanId }
    });

    // Update status to full and auto-generate matches if needed
    const updatedTournament = await Tournament.findById(validatedTournamentId);
    if (updatedTournament && updatedTournament.registeredTeams >= updatedTournament.maxTeams) {
      await Tournament.findByIdAndUpdate(validatedTournamentId, { status: 'full' });
      
      // Auto-generate matches when tournament becomes full
      console.log(`Tournament ${updatedTournament.game} is now full, generating matches...`);
      const matchesGenerated = await autoGenerateMatches(
        validatedTournamentId.toString(), 
        updatedTournament.game
      );
      
      if (matchesGenerated) {
        console.log(`Successfully generated matches for ${updatedTournament.game} tournament`);
      } else {
        console.log(`Matches already exist or failed to generate for ${updatedTournament.game} tournament`);
      }
    }

    return NextResponse.json({ 
      success: true, 
      registrationId: savedRegistration._id,
      message: "Clan registered successfully" 
    });
  } catch (error) {
    console.error("Error registering team:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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

    const registrations = await TournamentRegistration.find({ tournamentId: objectId }).populate('clanId');

    return NextResponse.json({ clans: registrations.map(reg => reg.clanId) });
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}