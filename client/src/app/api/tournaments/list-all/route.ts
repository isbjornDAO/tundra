import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db("tundra");
    const tournamentsCol = db.collection("tournaments");

    // Get all tournaments with relevant details
    const tournaments = await tournamentsCol.find({}).sort({ createdAt: -1 }).toArray();

    const tournamentList = tournaments.map(tournament => ({
      _id: tournament._id,
      game: tournament.game,
      status: tournament.status,
      maxTeams: tournament.maxTeams,
      registeredTeams: tournament.registeredTeams,
      region: tournament.region,
      createdAt: tournament.createdAt,
      updatedAt: tournament.updatedAt
    }));

    return NextResponse.json({
      tournaments: tournamentList,
      count: tournaments.length
    });

  } catch (error) {
    console.error('Error listing tournaments:', error);
    return NextResponse.json({ 
      error: 'Failed to list tournaments',
      details: error.message 
    }, { status: 500 });
  }
}