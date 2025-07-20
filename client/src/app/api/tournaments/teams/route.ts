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
    const { tournamentId, team } = sanitizedData;
    
    if (!tournamentId || !team) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    // Validate tournament ID
    const { isValid: tournamentIdValid, objectId: validatedTournamentId, error: tournamentIdError } = validateObjectId(tournamentId);
    if (!tournamentIdValid) {
      return NextResponse.json({ error: `Invalid tournament ID: ${tournamentIdError}` }, { status: 400 });
    }
    
    // Validate team data
    if (!team.name || !team.organizer || !team.country) {
      return NextResponse.json({ error: "Team name, organizer, and country are required" }, { status: 400 });
    }
    
    // Validate organizer wallet address
    const { isValid: organizerValid, address: validatedOrganizer, error: organizerError } = validateWalletAddress(team.organizer);
    if (!organizerValid) {
      return NextResponse.json({ error: `Invalid organizer address: ${organizerError}` }, { status: 400 });
    }
    
    // Validate country
    const { isValid: countryValid, country: validatedCountry, error: countryError } = validateCountryCode(team.country);
    if (!countryValid) {
      return NextResponse.json({ error: `Invalid country: ${countryError}` }, { status: 400 });
    }
    
    // Validate team name
    if (team.name.length < 3 || team.name.length > 50) {
      return NextResponse.json({ error: 'Team name must be 3-50 characters' }, { status: 400 });
    }
    
    if (!/^[a-zA-Z0-9\s_-]+$/.test(team.name)) {
      return NextResponse.json({ error: 'Team name contains invalid characters' }, { status: 400 });
    }
    
    // Validate players if provided
    if (team.players) {
      for (const player of team.players) {
        if (player.walletAddress) {
          const { isValid: playerWalletValid, error: playerWalletError } = validateWalletAddress(player.walletAddress);
          if (!playerWalletValid) {
            return NextResponse.json({ error: `Invalid player wallet address: ${playerWalletError}` }, { status: 400 });
          }
        }
      }
    }

    // Check if tournament exists and has space
    const tournament = await Tournament.findById(validatedTournamentId);
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    if (tournament.registeredTeams >= tournament.maxTeams) {
      return NextResponse.json({ error: "Tournament is full" }, { status: 400 });
    }

    // Check for duplicate registration by organizer
    const existingTeam = await Team.findOne({ 
      tournamentId: validatedTournamentId,
      organizer: validatedOrganizer 
    });
    
    if (existingTeam) {
      return NextResponse.json({ error: "You have already registered a team for this tournament" }, { status: 400 });
    }

    // Insert team
    const teamDoc = new Team({
      name: team.name,
      tournamentId: validatedTournamentId,
      organizer: validatedOrganizer,
      country: validatedCountry,
      clanId: team.clanId || null,
      players: team.players || [],
      registeredAt: new Date(),
    });
    
    const savedTeam = await teamDoc.save();

    // Update tournament registered teams count
    await Tournament.findByIdAndUpdate(validatedTournamentId, {
      $inc: { registeredTeams: 1 },
      $push: { teams: savedTeam._id }
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
      teamId: savedTeam._id,
      message: "Team registered successfully" 
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

    const teams = await Team.find({ tournamentId: objectId });

    return NextResponse.json({ teams });
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}