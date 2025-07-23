import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { validateObjectId, sanitizeInput } from '@/lib/security-utils';
import { Tournament } from '@/lib/models/Tournament';
import { Bracket } from '@/lib/models/Bracket';
import { Match } from '@/lib/models/Match';

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const requestBody = await request.json();
    const sanitizedData = sanitizeInput(requestBody);
    const { tournamentId } = sanitizedData;
    
    if (!tournamentId) {
      return NextResponse.json({ error: 'Tournament ID is required' }, { status: 400 });
    }
    
    const { isValid, objectId, error } = validateObjectId(tournamentId);
    if (!isValid) {
      return NextResponse.json({ error: `Invalid tournament ID: ${error}` }, { status: 400 });
    }
    
    // Get tournament and bracket
    const tournament = await Tournament.findById(objectId);
    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }
    
    const bracket = await Bracket.findOne({ tournamentId: objectId });
    if (!bracket) {
      return NextResponse.json({ error: 'Bracket not found' }, { status: 404 });
    }
    
    // Get all matches for this bracket
    const matches = await Match.find({ bracketId: bracket._id }).sort('createdAt');
    
    // Group by round
    const matchesByRound: Record<string, any[]> = {};
    matches.forEach(match => {
      if (!matchesByRound[match.round]) {
        matchesByRound[match.round] = [];
      }
      matchesByRound[match.round].push(match);
    });
    
    let deletedCount = 0;
    
    // For each round, keep only the expected number of matches
    const expectedMatches = {
      quarter: tournament.maxTeams === 8 ? 4 : 0,
      semi: tournament.maxTeams === 8 ? 2 : tournament.maxTeams === 4 ? 2 : 0,
      final: 1
    };
    
    for (const [round, roundMatches] of Object.entries(matchesByRound)) {
      const expected = expectedMatches[round as keyof typeof expectedMatches] || 0;
      
      if (roundMatches.length > expected) {
        // Sort by creation date and keep only the first 'expected' matches
        const matchesToDelete = roundMatches.slice(expected);
        
        for (const match of matchesToDelete) {
          await Match.findByIdAndDelete(match._id);
          deletedCount++;
          console.log(`Deleted duplicate ${round} match: ${match._id}`);
        }
      }
    }
    
    // Verify final count
    const remainingMatches = await Match.find({ bracketId: bracket._id });
    const finalsByRound: Record<string, number> = {};
    remainingMatches.forEach(match => {
      finalsByRound[match.round] = (finalsByRound[match.round] || 0) + 1;
    });
    
    return NextResponse.json({ 
      success: true, 
      message: `Cleaned up ${deletedCount} duplicate matches`,
      remainingMatches: finalsByRound
    });
    
  } catch (error) {
    console.error('Error cleaning up duplicates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}