import { NextResponse } from "next/server";
import { inMemoryDB } from "@/lib/in-memory-db";
// import clientPromise from "@/lib/mongodb";
// import { ObjectId } from "mongodb";

export async function POST(request: Request) {
  try {
    const { tournamentId, team } = await request.json();
    
    if (!tournamentId || !team) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if tournament exists and has space
    const tournaments = await inMemoryDB.findTournaments();
    const tournament = tournaments.find(t => t._id === tournamentId);
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    if (tournament.registeredTeams >= tournament.maxTeams) {
      return NextResponse.json({ error: "Tournament is full" }, { status: 400 });
    }

    // Check for duplicate registration by organizer
    const existingTeams = await inMemoryDB.findTeams({ tournamentId });
    const existingTeam = existingTeams.find(t => t.organizer === team.organizer);
    if (existingTeam) {
      return NextResponse.json({ error: "You have already registered a team for this tournament" }, { status: 400 });
    }

    // Insert team
    const teamDoc = {
      ...team,
      tournamentId,
      registeredAt: new Date(),
    };
    
    const teamResult = await inMemoryDB.insertTeam(teamDoc);

    return NextResponse.json({ 
      success: true, 
      teamId: teamResult.insertedId,
      message: "Team registered successfully" 
    });
  } catch (error) {
    console.error("Error registering team:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get("tournamentId");
    
    if (!tournamentId) {
      return NextResponse.json({ error: "Tournament ID required" }, { status: 400 });
    }

    const teams = await inMemoryDB.findTeams({ tournamentId });

    return NextResponse.json({ teams });
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}