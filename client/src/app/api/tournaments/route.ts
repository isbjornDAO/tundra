import { NextResponse } from "next/server";
import connectToDatabase from '@/lib/mongoose';
import { Tournament } from '@/lib/models/Tournament';
import { validateGame, sanitizeInput } from "@/lib/security-utils";

export async function GET() {
  try {
    await connectToDatabase();
    console.log("GET /api/tournaments called");
    
    const tournaments = await Tournament.find({}).sort({ createdAt: -1 });
    console.log("Found tournaments:", tournaments.length);
    
    return NextResponse.json({ tournaments });
  } catch (error) {
    console.error("Error fetching tournaments:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    console.log("POST /api/tournaments called");
    
    const requestBody = await request.json();
    const sanitizedData = sanitizeInput(requestBody);
    const { game, region = "Global", maxTeams = 16 } = sanitizedData;
    console.log("Request data:", { game, region, maxTeams });
    
    if (!game) {
      return NextResponse.json({ error: "Game is required" }, { status: 400 });
    }
    
    // Validate game
    const { isValid: gameValid, game: validatedGame, error: gameError } = validateGame(game);
    if (!gameValid) {
      return NextResponse.json({ error: `Invalid game: ${gameError}` }, { status: 400 });
    }
    
    // Validate maxTeams
    const validatedMaxTeams = Number(maxTeams) || 16;
    if (validatedMaxTeams < 4 || validatedMaxTeams > 64) {
      return NextResponse.json({ error: 'Max teams must be between 4 and 64' }, { status: 400 });
    }

    // Check if tournament already exists for this game
    const existingTournament = await Tournament.findOne({ 
      game: validatedGame, 
      status: { $in: ["open", "full", "active"] } 
    });
    
    if (existingTournament) {
      return NextResponse.json({ error: "Active tournament already exists for this game" }, { status: 400 });
    }

    const tournament = new Tournament({
      game: validatedGame,
      region,
      maxTeams: validatedMaxTeams,
      registeredTeams: 0,
      status: "open",
      prizePool: 5000
    });

    console.log("Creating tournament:", tournament);
    const savedTournament = await tournament.save();
    console.log("Tournament created with ID:", savedTournament._id);

    return NextResponse.json({ 
      success: true, 
      tournamentId: savedTournament._id,
      tournament: savedTournament,
      message: "Tournament created successfully" 
    });
  } catch (error) {
    console.error("Error creating tournament:", error);
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}