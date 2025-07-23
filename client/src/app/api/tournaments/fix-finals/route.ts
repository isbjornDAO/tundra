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

    // Get all completed semi-final matches
    const semiMatches = await matchesCol.find({
      bracketId: bracket._id,
      round: 'semi',
      status: 'completed'
    }).toArray();

    console.log(`Found ${semiMatches.length} completed semi-final matches`);

    if (semiMatches.length !== 2) {
      return NextResponse.json({ 
        error: `Expected 2 completed semi-final matches, found ${semiMatches.length}` 
      }, { status: 400 });
    }

    // Get finals match
    const finalsMatch = await matchesCol.findOne({
      bracketId: bracket._id,
      round: 'final'
    });

    if (!finalsMatch) {
      return NextResponse.json({ error: 'Finals match not found' }, { status: 404 });
    }

    // Extract winners from semi-finals
    const winner1 = semiMatches[0].winner;
    const winner2 = semiMatches[1].winner;

    if (!winner1 || !winner2) {
      return NextResponse.json({ 
        error: 'Semi-final matches missing winner data' 
      }, { status: 400 });
    }

    // Update finals match with the correct winners
    const updateResult = await matchesCol.updateOne(
      { _id: finalsMatch._id },
      { 
        $set: { 
          clan1: winner1,
          clan2: winner2,
          team1: {
            id: winner1.toString(),
            name: winner1.name || 'Unknown'
          },
          team2: {
            id: winner2.toString(), 
            name: winner2.name || 'Unknown'
          },
          status: 'scheduling',
          updatedAt: new Date()
        }
      }
    );

    console.log(`Updated finals match:`, {
      matchId: finalsMatch._id,
      clan1: winner1.name || winner1,
      clan2: winner2.name || winner2
    });

    return NextResponse.json({
      success: true,
      message: `Finals match updated with correct winners`,
      finalsMatch: {
        _id: finalsMatch._id,
        clan1: winner1.name || winner1,
        clan2: winner2.name || winner2
      },
      semiWinners: semiMatches.map(match => ({
        matchId: match._id,
        winner: match.winner.name || match.winner
      }))
    });

  } catch (error) {
    console.error('Error fixing finals:', error);
    return NextResponse.json({ 
      error: 'Failed to fix finals',
      details: error.message 
    }, { status: 500 });
  }
}