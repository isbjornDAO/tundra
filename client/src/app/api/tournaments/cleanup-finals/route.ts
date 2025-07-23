import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const { tournamentId } = await request.json();
    
    if (!tournamentId) {
      return NextResponse.json({ error: 'Tournament ID required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("tundra");
    const tournamentsCol = db.collection("tournaments");
    const bracketsCol = db.collection("brackets");
    const matchesCol = db.collection("matches");

    // Get tournament and bracket
    const tournament = await tournamentsCol.findOne({ _id: new ObjectId(tournamentId) });
    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const bracket = await bracketsCol.findOne({ tournamentId: new ObjectId(tournamentId) });
    if (!bracket) {
      return NextResponse.json({ error: 'Bracket not found' }, { status: 404 });
    }

    // Find all finals matches
    const finalsMatches = await matchesCol.find({
      bracketId: bracket._id,
      round: 'final'
    }).toArray();

    console.log(`Found ${finalsMatches.length} finals matches`);

    if (finalsMatches.length <= 1) {
      return NextResponse.json({ 
        message: 'No duplicate finals found', 
        finalsCount: finalsMatches.length 
      });
    }

    // Keep the first finals match, remove the rest
    const matchesToKeep = finalsMatches[0];
    const matchesToRemove = finalsMatches.slice(1);

    // Remove duplicate finals matches
    const deleteResult = await matchesCol.deleteMany({
      _id: { $in: matchesToRemove.map(m => m._id) }
    });

    console.log(`Removed ${deleteResult.deletedCount} duplicate finals matches`);

    return NextResponse.json({
      success: true,
      message: `Removed ${deleteResult.deletedCount} duplicate finals matches`,
      keptMatch: matchesToKeep._id,
      removedMatches: matchesToRemove.map(m => m._id)
    });

  } catch (error) {
    console.error('Error cleaning up finals:', error);
    return NextResponse.json({ 
      error: 'Failed to cleanup finals',
      details: error.message 
    }, { status: 500 });
  }
}