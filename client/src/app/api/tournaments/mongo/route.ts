import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { Tournament } from '@/lib/models/Tournament';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const game = searchParams.get('game');
    const region = searchParams.get('region');
    const status = searchParams.get('status');
    
    let query: any = {};
    if (game) query.game = game;
    if (region) query.region = region;
    if (status) query.status = status;
    
    const tournaments = await Tournament.find(query)
      .sort({ createdAt: -1 });
    
    // Convert to plain objects and ensure proper data structure
    const tournamentsData = tournaments.map(t => ({
      _id: t._id.toString(),
      game: t.game,
      region: t.region,
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
    
    const data = await request.json();
    const { game, region, maxTeams, prizePool } = data;
    
    if (!game || !region) {
      return NextResponse.json(
        { error: 'Game and region are required' },
        { status: 400 }
      );
    }
    
    // Check if there's already an open tournament for this game/region
    const existingTournament = await Tournament.findOne({ 
      game, 
      region, 
      status: { $in: ['open', 'full', 'active'] } 
    });
    
    if (existingTournament) {
      return NextResponse.json(
        { error: `There is already an active ${game} tournament in ${region}` },
        { status: 409 }
      );
    }
    
    const tournament = new Tournament({
      game,
      region,
      maxTeams: maxTeams || 16,
      prizePool: prizePool || 5000,
      status: 'open'
    });
    
    await tournament.save();
    
    return NextResponse.json(tournament, { status: 201 });
  } catch (error) {
    console.error('Error creating tournament:', error);
    return NextResponse.json({ error: 'Failed to create tournament' }, { status: 500 });
  }
}