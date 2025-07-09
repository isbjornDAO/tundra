import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import connectToDatabase from '@/lib/mongoose';
import { User } from '@/lib/models/User';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const game = searchParams.get("game");
    const status = searchParams.get("status"); // 'completed', 'active', 'all'
    
    const client = await clientPromise;
    const db = client.db("tundra");
    const tournamentsCol = db.collection("tournaments");
    const bracketsCol = db.collection("brackets");
    const matchesCol = db.collection("matches");
    const teamsCol = db.collection("teams");

    // Build query
    let query: any = {};
    if (game) query.game = game;
    if (status && status !== 'all') query.status = status;

    // Get tournaments
    const tournaments = await tournamentsCol.find(query).sort({ createdAt: -1 }).toArray();
    
    // For each tournament, get detailed results
    const results = await Promise.all(tournaments.map(async (tournament) => {
      // Get bracket
      const bracket = await bracketsCol.findOne({ tournamentId: tournament._id });
      
      // Get all matches
      const matches = bracket ? await matchesCol.find({ bracketId: bracket._id }).toArray() : [];
      
      // Get all teams
      const teams = await teamsCol.find({ tournamentId: tournament._id }).toArray();
      
      // Calculate tournament stats
      const completedMatches = matches.filter(m => m.status === 'completed');
      const totalMatches = matches.length;
      const progressPercentage = totalMatches > 0 ? Math.round((completedMatches.length / totalMatches) * 100) : 0;
      
      // Determine winner and runner-up
      let winner = null;
      let runnerUp = null;
      
      if (tournament.status === 'completed' && bracket?.winner) {
        winner = bracket.winner;
        
        // Find runner-up (loser of final match)
        const finalMatch = matches.find(m => m.round === 'final' && m.status === 'completed');
        if (finalMatch) {
          runnerUp = finalMatch.team1.id === winner.id ? finalMatch.team2 : finalMatch.team1;
        }
      }
      
      // Get recent matches for activity
      const recentMatches = completedMatches
        .sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime())
        .slice(0, 5);

      return {
        _id: tournament._id,
        game: tournament.game,
        status: tournament.status,
        createdAt: tournament.createdAt,
        completedAt: tournament.status === 'completed' ? (tournament.completedAt || tournament.updatedAt) : null,
        
        // Team info
        totalTeams: teams.length,
        maxTeams: tournament.maxTeams,
        
        // Match info
        totalMatches,
        completedMatches: completedMatches.length,
        progressPercentage,
        
        // Results
        winner,
        runnerUp,
        
        // Bracket info
        bracketId: bracket?._id,
        
        // Recent activity
        recentMatches: recentMatches.map(match => ({
          id: match._id,
          team1: match.team1,
          team2: match.team2,
          winner: match.winner,
          round: match.round,
          completedAt: match.completedAt || match.createdAt
        })),
        
        // All participating teams
        teams: teams.map(team => ({
          id: team._id,
          name: team.name,
          region: team.region,
          organizer: team.organizer,
          players: team.players
        }))
      };
    }));

    // Sort results by completion date (most recent first) then by creation date
    results.sort((a, b) => {
      if (a.status === 'completed' && b.status === 'completed') {
        return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
      }
      if (a.status === 'completed') return -1;
      if (b.status === 'completed') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error fetching tournament results:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { tournamentId, winnerId, runnerUpId, completedAt, walletAddress } = await request.json();
    
    if (!tournamentId || !winnerId || !walletAddress) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Authenticate Team1 host
    await connectToDatabase();
    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    if (!user || !user.isTeam1Host) {
      return NextResponse.json({ error: "Unauthorized: Team1 host access required" }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db("tundra");
    const tournamentsCol = db.collection("tournaments");
    const resultsCol = db.collection("results");
    const teamsCol = db.collection("teams");

    // Get tournament
    const tournament = await tournamentsCol.findOne({ _id: new ObjectId(tournamentId) });
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    // Check if Team1 host can enter results for this tournament's region
    // For now, allow all Team1 hosts to enter results globally
    // TODO: Implement region-based restrictions if needed
    // if (user.region && tournament.region !== user.region) {
    //   return NextResponse.json({ error: "Unauthorized: Cannot enter results for tournaments outside your region" }, { status: 403 });
    // }

    // Get winner and runner-up teams
    const winner = await teamsCol.findOne({ _id: new ObjectId(winnerId) });
    const runnerUp = runnerUpId ? await teamsCol.findOne({ _id: new ObjectId(runnerUpId) }) : null;
    
    if (!winner) {
      return NextResponse.json({ error: "Winner team not found" }, { status: 404 });
    }

    // Create result record with audit trail
    const resultDoc = {
      tournamentId: new ObjectId(tournamentId),
      game: tournament.game,
      region: tournament.region,
      winner,
      runnerUp,
      totalTeams: tournament.maxTeams,
      completedAt: new Date(completedAt || Date.now()),
      createdAt: new Date(),
      enteredBy: {
        walletAddress: user.walletAddress,
        displayName: user.displayName,
        isTeam1Host: true,
        region: user.region
      }
    };

    const result = await resultsCol.insertOne(resultDoc);

    // Update tournament status
    await tournamentsCol.updateOne(
      { _id: new ObjectId(tournamentId) },
      { 
        $set: { 
          status: "completed",
          winner,
          runnerUp,
          completedAt: new Date(completedAt || Date.now())
        } 
      }
    );

    return NextResponse.json({ 
      success: true, 
      resultId: result.insertedId,
      message: "Tournament result recorded successfully" 
    });
  } catch (error) {
    console.error("Error recording tournament result:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}