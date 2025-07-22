import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { initializeModels, Tournament, TournamentRegistration } from '@/lib/models';
import { validateGame, validateStatus, sanitizeInput, validateCountryCode, validateObjectId, validateWalletAddress } from '@/lib/security-utils';
import { requireHost } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Initialize all models to prevent MissingSchemaError
    initializeModels();
    
    const { searchParams } = new URL(request.url);
    const gameParam = searchParams.get('game');
    const statusParam = searchParams.get('status');
    
    let query: any = {};
    
    // Validate and sanitize game parameter
    if (gameParam) {
      const { isValid, game, error } = validateGame(gameParam);
      if (!isValid) {
        return NextResponse.json({ error: `Invalid game: ${error}` }, { status: 400 });
      }
      query.game = game;
    }
    
    // Validate and sanitize status parameter
    if (statusParam) {
      const { isValid, status, error } = validateStatus(statusParam);
      if (!isValid) {
        return NextResponse.json({ error: `Invalid status: ${error}` }, { status: 400 });
      }
      query.status = status;
    }
    
    const tournaments = await Tournament.find(query)
      .sort({ createdAt: -1 });
    
    // Convert to plain objects and ensure proper data structure
    const tournamentsData = tournaments.map(t => ({
      _id: t._id.toString(),
      game: t.game,
      maxTeams: t.maxTeams,
      registeredTeams: t.registeredTeams || 0,
      status: t.status,
      prizePool: t.prizePool,
      bracketId: t.bracketId?.toString(),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt
    }));
    
    return NextResponse.json({ tournaments: tournamentsData });
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    return NextResponse.json({ error: 'Failed to fetch tournaments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Initialize all models to prevent MissingSchemaError
    initializeModels();
    
    const requestBody = await request.json();
    const sanitizedData = sanitizeInput(requestBody);
    const { game, maxTeams, prizePool } = sanitizedData;
    
    // Validate required fields
    if (!game) {
      return NextResponse.json(
        { error: 'Game is required' },
        { status: 400 }
      );
    }
    
    // Validate game
    const { isValid: gameValid, game: validatedGame, error: gameError } = validateGame(game);
    if (!gameValid) {
      return NextResponse.json({ error: `Invalid game: ${gameError}` }, { status: 400 });
    }
    
    // Validate numeric fields
    const validatedMaxTeams = Number(maxTeams) || 16;
    const validatedPrizePool = Number(prizePool) || 5000;
    
    if (validatedMaxTeams < 4 || validatedMaxTeams > 64) {
      return NextResponse.json({ error: 'Max teams must be between 4 and 64' }, { status: 400 });
    }
    
    if (validatedPrizePool < 0 || validatedPrizePool > 1000000) {
      return NextResponse.json({ error: 'Prize pool must be between 0 and 1,000,000' }, { status: 400 });
    }
    
    // Check if there's already an open tournament for this game
    const existingTournament = await Tournament.findOne({ 
      game: validatedGame, 
      status: { $in: ['open', 'full', 'active'] } 
    });
    
    if (existingTournament) {
      return NextResponse.json(
        { 
          error: `Cannot create tournament: A ${validatedGame} tournament is already ${existingTournament.status}. Please wait for the current tournament to complete or choose a different game.`,
          existingTournament: {
            id: existingTournament._id,
            game: existingTournament.game,
            status: existingTournament.status,
            teams: `${existingTournament.registeredTeams || 0}/${existingTournament.maxTeams}`
          }
        },
        { status: 409 }
      );
    }
    
    const tournament = new Tournament({
      game: validatedGame,
      maxTeams: validatedMaxTeams,
      prizePool: validatedPrizePool,
      status: 'open'
    });
    
    await tournament.save();
    
    return NextResponse.json(tournament, { status: 201 });
  } catch (error) {
    console.error('Error creating tournament:', error);
    return NextResponse.json({ error: 'Failed to create tournament' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Require Host privileges
    const auth = await requireHost(request);
    if (auth instanceof NextResponse) {
      return auth; // Return error response
    }

    await connectToDatabase();
    
    // Initialize all models to prevent MissingSchemaError
    initializeModels();
    
    const { searchParams } = new URL(request.url);
    const tournamentIdParam = searchParams.get('tournamentId');
    
    if (!tournamentIdParam) {
      return NextResponse.json({ error: 'Tournament ID is required' }, { status: 400 });
    }
    
    // Validate tournament ID
    const { isValid, objectId, error } = validateObjectId(tournamentIdParam);
    if (!isValid) {
      return NextResponse.json({ error: `Invalid tournament ID: ${error}` }, { status: 400 });
    }
    
    // Find the tournament
    const tournament = await Tournament.findById(objectId);
    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }
    
    // Check if tournament can be deleted (only before it gets full)
    if (tournament.status === 'full' || tournament.status === 'active' || tournament.status === 'completed') {
      return NextResponse.json({ 
        error: 'Cannot delete tournament that is full, active, or completed' 
      }, { status: 400 });
    }
    
    // Delete all clan registrations for this tournament
    await TournamentRegistration.deleteMany({ tournamentId: objectId });
    
    // Delete the tournament
    await Tournament.findByIdAndDelete(objectId);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Tournament deleted successfully' 
    });
    
  } catch (error) {
    console.error('Error deleting tournament:', error);
    return NextResponse.json({ error: 'Failed to delete tournament' }, { status: 500 });
  }
}