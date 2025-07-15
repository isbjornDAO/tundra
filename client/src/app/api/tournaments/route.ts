import { NextResponse } from "next/server";
import { inMemoryDB } from "@/lib/in-memory-db";
import { validateGame, sanitizeInput } from "@/lib/security-utils";
// import clientPromise from "@/lib/mongodb";
// import { ObjectId } from "mongodb";

export async function GET() {
  try {
    console.log("GET /api/tournaments called");
    const tournaments = await inMemoryDB.findTournaments();
    console.log("Found tournaments:", tournaments.length);
    return NextResponse.json({ tournaments });
  } catch (error) {
    console.error("Error fetching tournaments:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    console.log("POST /api/tournaments called");
    const requestBody = await request.json();
    const sanitizedData = sanitizeInput(requestBody);
    const { game, maxTeams = 16 } = sanitizedData;
    console.log("Request data:", { game, maxTeams });
    
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
    const existingTournament = await inMemoryDB.findOneTournament({ 
      game: validatedGame, 
      status: { $in: ["open", "full", "active"] } 
    });
    
    if (existingTournament) {
      return NextResponse.json({ error: "Active tournament already exists for this game" }, { status: 400 });
    }

    const tournamentDoc = {
      game: validatedGame,
      maxTeams: validatedMaxTeams,
      registeredTeams: 0,
      status: "open" as const,
      createdAt: new Date(),
    };

    console.log("Creating tournament:", tournamentDoc);
    const result = await inMemoryDB.insertTournament(tournamentDoc);
    console.log("Tournament created with ID:", result.insertedId);

    return NextResponse.json({ 
      success: true, 
      tournamentId: result.insertedId,
      message: "Tournament created successfully" 
    });
  } catch (error) {
    console.error("Error creating tournament:", error);
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}