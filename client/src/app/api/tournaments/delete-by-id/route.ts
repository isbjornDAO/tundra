import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function DELETE(request: NextRequest) {
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
    const registrationsCol = db.collection("tournamentregistrations");

    // Get tournament details first
    const tournament = await tournamentsCol.findOne({ _id: new ObjectId(tournamentId) });
    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    console.log('Deleting tournament:', {
      id: tournament._id,
      game: tournament.game,
      status: tournament.status,
      registeredTeams: tournament.registeredTeams
    });

    // Delete related data
    const bracket = await bracketsCol.findOne({ tournamentId: new ObjectId(tournamentId) });
    let deletedMatches = 0;
    let deletedBrackets = 0;
    let deletedRegistrations = 0;

    if (bracket) {
      // Delete matches
      const matchDeleteResult = await matchesCol.deleteMany({ bracketId: bracket._id });
      deletedMatches = matchDeleteResult.deletedCount;

      // Delete bracket
      const bracketDeleteResult = await bracketsCol.deleteOne({ _id: bracket._id });
      deletedBrackets = bracketDeleteResult.deletedCount;
    }

    // Delete registrations
    const registrationDeleteResult = await registrationsCol.deleteMany({ tournamentId: new ObjectId(tournamentId) });
    deletedRegistrations = registrationDeleteResult.deletedCount;

    // Delete tournament
    const tournamentDeleteResult = await tournamentsCol.deleteOne({ _id: new ObjectId(tournamentId) });

    console.log('Deletion results:', {
      tournament: tournamentDeleteResult.deletedCount,
      bracket: deletedBrackets,
      matches: deletedMatches,
      registrations: deletedRegistrations
    });

    return NextResponse.json({
      success: true,
      message: `Tournament "${tournament.game}" deleted successfully`,
      deletedData: {
        tournament: tournamentDeleteResult.deletedCount,
        bracket: deletedBrackets,
        matches: deletedMatches,
        registrations: deletedRegistrations
      },
      tournamentInfo: {
        id: tournament._id,
        game: tournament.game,
        status: tournament.status,
        registeredTeams: tournament.registeredTeams
      }
    });

  } catch (error) {
    console.error('Error deleting tournament:', error);
    return NextResponse.json({ 
      error: 'Failed to delete tournament',
      details: error.message 
    }, { status: 500 });
  }
}