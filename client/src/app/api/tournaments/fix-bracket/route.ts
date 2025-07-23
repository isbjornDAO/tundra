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
    
    // Check existing matches
    const matches = await Match.find({ bracketId: bracket._id });
    const matchesByRound = matches.reduce((acc: any, match: any) => {
      if (!acc[match.round]) acc[match.round] = [];
      acc[match.round].push(match);
      return acc;
    }, {});
    
    console.log('Current matches by round:', {
      quarter: matchesByRound.quarter?.length || 0,
      semi: matchesByRound.semi?.length || 0,
      final: matchesByRound.final?.length || 0
    });
    
    // Check if finals match is missing
    const hasSemis = matchesByRound.semi && matchesByRound.semi.length > 0;
    const hasFinals = matchesByRound.final && matchesByRound.final.length > 0;
    
    if (hasSemis && !hasFinals) {
      // Create finals match
      const finalMatch = new Match({
        bracketId: bracket._id,
        clan1: null,
        clan2: null,
        round: 'final',
        status: 'scheduling',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await finalMatch.save();
      console.log('Created missing finals match');
      
      // Check if any semis are completed and advance winners
      const completedSemis = matchesByRound.semi.filter((m: any) => m.status === 'completed' && m.winner);
      
      if (completedSemis.length > 0) {
        // Sort by creation date to maintain order
        completedSemis.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        
        // Update finals with winners
        const updates: any = {};
        if (completedSemis[0]?.winner) {
          updates.clan1 = completedSemis[0].winner;
        }
        if (completedSemis[1]?.winner) {
          updates.clan2 = completedSemis[1].winner;
        }
        
        if (Object.keys(updates).length > 0) {
          await Match.findByIdAndUpdate(finalMatch._id, updates);
          console.log('Updated finals match with winners:', updates);
        }
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Finals match created successfully',
        finalsMatchId: finalMatch._id
      });
    } else if (hasFinals) {
      return NextResponse.json({ 
        success: true, 
        message: 'Finals match already exists' 
      });
    } else {
      return NextResponse.json({ 
        error: 'Cannot create finals - no semifinal matches found' 
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Error fixing bracket:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}