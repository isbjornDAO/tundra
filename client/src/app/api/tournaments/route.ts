import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("tundra");

    const tournaments = await db
      .collection("tournaments")
      .find(
        {},
        {
          projection: { registeredTeams: 1, maxTeams: 1, status: 1, game: 1, createdAt: 1 },
        }
      )
      .toArray();

    return NextResponse.json({ tournaments });
  } catch (error) {
    console.error("Error fetching tournaments:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { game, maxTeams = 16 } = await request.json();
    
    if (!game) {
      return NextResponse.json({ error: "Game is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("tundra");
    const tournamentsCol = db.collection("tournaments");

    // Check if tournament already exists for this game
    const existingTournament = await tournamentsCol.findOne({ 
      game, 
      status: { $in: ["open", "full", "active"] } 
    });
    
    if (existingTournament) {
      return NextResponse.json({ error: "Active tournament already exists for this game" }, { status: 400 });
    }

    const tournamentDoc = {
      game,
      maxTeams,
      registeredTeams: 0,
      status: "open",
      createdAt: new Date(),
    };

    const result = await tournamentsCol.insertOne(tournamentDoc);

    return NextResponse.json({ 
      success: true, 
      tournamentId: result.insertedId,
      message: "Tournament created successfully" 
    });
  } catch (error) {
    console.error("Error creating tournament:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}