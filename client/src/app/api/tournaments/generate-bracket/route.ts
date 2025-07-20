import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { autoGenerateMatches } from '@/lib/tournament-utils';
import { Tournament } from '@/lib/models/Tournament';
import { validateObjectId, sanitizeInput } from '@/lib/security-utils';
import mongoose from 'mongoose';

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const requestBody = await request.json();
    const sanitizedData = sanitizeInput(requestBody);
    const { tournamentId } = sanitizedData;
    
    if (!tournamentId) {
      return NextResponse.json({ error: 'Tournament ID is required' }, { status: 400 });
    }
    
    // Validate tournament ID
    const { isValid: tournamentIdValid, objectId: validatedTournamentId, error: tournamentIdError } = validateObjectId(tournamentId);
    if (!tournamentIdValid) {
      return NextResponse.json({ error: `Invalid tournament ID: ${tournamentIdError}` }, { status: 400 });
    }
    
    // Check if tournament exists
    const tournament = await Tournament.findById(validatedTournamentId);
    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }
    
    // Check if tournament is full
    if (tournament.registeredTeams < tournament.maxTeams) {
      return NextResponse.json({ 
        error: `Tournament must be full to generate bracket. Currently has ${tournament.registeredTeams}/${tournament.maxTeams} teams.` 
      }, { status: 400 });
    }
    
    // Check if bracket already exists
    const Bracket = mongoose.models.Bracket || mongoose.model('Bracket', new mongoose.Schema({
      tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
      teams: [{ type: Object }],
      status: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    }));
    
    const existingBracket = await Bracket.findOne({ tournamentId: validatedTournamentId! });
    
    if (existingBracket) {
      return NextResponse.json({ 
        error: 'Bracket already exists for this tournament',
        bracketExists: true,
        bracketId: existingBracket._id
      }, { status: 400 });
    }
    
    // Generate matches/bracket
    console.log(`Manually generating bracket for ${tournament.game} tournament with ${tournament.registeredTeams} teams`);
    const matchesGenerated = await autoGenerateMatches(
      validatedTournamentId!.toString(), 
      tournament.game
    );
    
    if (matchesGenerated) {
      console.log(`Successfully generated bracket for ${tournament.game} tournament`);
      
      // Update tournament with bracket ID
      const newBracket = await Bracket.findOne({ tournamentId: validatedTournamentId! });
      if (newBracket) {
        await Tournament.findByIdAndUpdate(validatedTournamentId!, { 
          bracketId: newBracket._id,
          status: 'active'
        });
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Bracket generated successfully',
        tournamentId: validatedTournamentId!.toString(),
        bracketId: newBracket?._id
      });
    } else {
      return NextResponse.json({ 
        error: 'Failed to generate bracket. Please try again.' 
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error generating bracket:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
