import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(request: Request) {
  try {
    const { tournamentId, team } = await request.json();
    
    if (!tournamentId || !team) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("tundra");
    const tournamentsCol = db.collection("tournaments");
    const teamsCol = db.collection("teams");

    // Check if tournament exists and has space
    const tournament = await tournamentsCol.findOne({ _id: new ObjectId(tournamentId) });
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    if (tournament.registeredTeams >= tournament.maxTeams) {
      return NextResponse.json({ error: "Tournament is full" }, { status: 400 });
    }

    // Insert team
    const teamDoc = {
      ...team,
      tournamentId: new ObjectId(tournamentId),
      registeredAt: new Date(),
    };
    
    const teamResult = await teamsCol.insertOne(teamDoc);

    // Update tournament
    await tournamentsCol.updateOne(
      { _id: new ObjectId(tournamentId) },
      { 
        $inc: { registeredTeams: 1 },
        $set: { 
          status: tournament.registeredTeams + 1 >= tournament.maxTeams ? "full" : "open" 
        }
      }
    );

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

    const client = await clientPromise;
    const db = client.db("tundra");
    const teamsCol = db.collection("teams");

    const teams = await teamsCol.find({ 
      tournamentId: new ObjectId(tournamentId) 
    }).toArray();

    return NextResponse.json({ teams });
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}