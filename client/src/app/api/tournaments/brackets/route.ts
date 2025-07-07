import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(request: Request) {
  try {
    const { tournamentId } = await request.json();
    
    if (!tournamentId) {
      return NextResponse.json({ error: "Tournament ID required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("tundra");
    const tournamentsCol = db.collection("tournaments");
    const teamsCol = db.collection("teams");
    const bracketsCol = db.collection("brackets");
    const matchesCol = db.collection("matches");

    // Get tournament and teams
    const tournament = await tournamentsCol.findOne({ _id: new ObjectId(tournamentId) });
    if (!tournament || tournament.status !== "full") {
      return NextResponse.json({ error: "Tournament not ready for bracket generation" }, { status: 400 });
    }

    const teams = await teamsCol.find({ tournamentId: new ObjectId(tournamentId) }).toArray();
    
    if (teams.length < 2) {
      return NextResponse.json({ error: "Not enough teams for bracket" }, { status: 400 });
    }

    // Generate bracket
    const shuffledTeams = teams.sort(() => Math.random() - 0.5);
    const bracketDoc = {
      tournamentId: new ObjectId(tournamentId),
      teams: shuffledTeams,
      status: "active",
      createdAt: new Date(),
    };

    const bracketResult = await bracketsCol.insertOne(bracketDoc);

    // Generate matches
    const matches = [];
    const rounds = Math.ceil(Math.log2(teams.length));
    
    // First round matches
    for (let i = 0; i < shuffledTeams.length; i += 2) {
      if (i + 1 < shuffledTeams.length) {
        matches.push({
          bracketId: bracketResult.insertedId,
          team1: shuffledTeams[i],
          team2: shuffledTeams[i + 1],
          round: "first",
          status: "pending",
          organizer1Approved: false,
          organizer2Approved: false,
          createdAt: new Date(),
        });
      }
    }

    if (matches.length > 0) {
      await matchesCol.insertMany(matches);
    }

    // Update tournament status
    await tournamentsCol.updateOne(
      { _id: new ObjectId(tournamentId) },
      { $set: { status: "active", bracketId: bracketResult.insertedId } }
    );

    return NextResponse.json({ 
      success: true, 
      bracketId: bracketResult.insertedId,
      matchesCount: matches.length 
    });
  } catch (error) {
    console.error("Error generating bracket:", error);
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
    const bracketsCol = db.collection("brackets");
    const matchesCol = db.collection("matches");

    const bracket = await bracketsCol.findOne({ 
      tournamentId: new ObjectId(tournamentId) 
    });

    if (!bracket) {
      return NextResponse.json({ error: "Bracket not found" }, { status: 404 });
    }

    const matches = await matchesCol.find({ 
      bracketId: bracket._id 
    }).toArray();

    return NextResponse.json({ bracket, matches });
  } catch (error) {
    console.error("Error fetching bracket:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}