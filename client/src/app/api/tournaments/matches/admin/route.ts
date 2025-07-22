import { NextRequest, NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth-middleware';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  // Require host authentication
  const auth = await requireHost(request);
  if (auth instanceof NextResponse) {
    return auth; // Return error response
  }

  try {
    const { searchParams } = new URL(request.url);
    const region = searchParams.get('region');

    const client = await clientPromise;
    const db = client.db("tundra");
    const tournamentsCol = db.collection("tournaments");
    const bracketsCol = db.collection("brackets");
    const matchesCol = db.collection("matches");
    const teamsCol = db.collection("teams");

    // Build query for tournaments
    let tournamentQuery: any = { status: { $in: ['active', 'full'] } };
    
    // Apply region filter if specified
    if (region) {
      tournamentQuery.region = region;
    }

    // Get active tournaments
    const tournaments = await tournamentsCol.find(tournamentQuery).toArray();
    
    // Get all matches for these tournaments
    const tournamentIds = tournaments.map(t => t._id);
    const brackets = await bracketsCol.find({ tournamentId: { $in: tournamentIds } }).toArray();
    const bracketIds = brackets.map(b => b._id);
    
    const matches = await matchesCol.find({ 
      bracketId: { $in: bracketIds },
      status: { $in: ['pending', 'scheduled', 'completed', 'ready', 'active', 'results_pending', 'results_conflict'] }
    }).toArray();

    // Get all teams for match details
    const teamIds = matches.flatMap(m => [m.team1?.id, m.team2?.id]).filter(Boolean);
    const teams = await teamsCol.find({ _id: { $in: teamIds.map(id => new ObjectId(id)) } }).toArray();
    const teamMap = teams.reduce((acc, team) => {
      acc[team._id.toString()] = team;
      return acc;
    }, {} as any);

    // Organize matches by tournament
    const result = tournaments.map(tournament => {
      const bracket = brackets.find(b => b.tournamentId.equals(tournament._id));
      const tournamentMatches = matches.filter(m => bracket && m.bracketId.equals(bracket._id));
      
      return {
        tournament: {
          _id: tournament._id,
          game: tournament.game,
          region: tournament.region,
          status: tournament.status,
          maxTeams: tournament.maxTeams,
          registeredTeams: tournament.registeredTeams
        },
        bracket: bracket ? {
          _id: bracket._id,
          status: bracket.status
        } : null,
        matches: tournamentMatches.map(match => ({
          _id: match._id,
          round: match.round,
          status: match.status,
          scheduledAt: match.scheduledAt,
          completedAt: match.completedAt,
          team1: match.team1 ? {
            ...match.team1,
            details: teamMap[match.team1.id]
          } : null,
          team2: match.team2 ? {
            ...match.team2,
            details: teamMap[match.team2.id]
          } : null,
          winner: match.winner,
          createdAt: match.createdAt
        }))
      };
    });

    return NextResponse.json({ tournaments: result });
  } catch (error) {
    console.error('Error fetching admin matches:', error);
    return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  // Require host authentication
  const auth = await requireHost(request);
  if (auth instanceof NextResponse) {
    return auth; // Return error response
  }

  try {
    const { matchId, winnerId, completedAt, resolveConflict } = await request.json();
    
    if (!matchId || !winnerId) {
      return NextResponse.json({ error: 'Missing required fields: matchId, winnerId' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("tundra");
    const matchesCol = db.collection("matches");
    const bracketsCol = db.collection("brackets");
    const tournamentsCol = db.collection("tournaments");

    // Get the match
    const match = await matchesCol.findOne({ _id: new ObjectId(matchId) });
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Support both old team format and new clan format
    const isTeamFormat = match.team1 || match.team2;
    const isClanFormat = match.clan1 || match.clan2;
    
    let winner, loser;
    
    if (isTeamFormat) {
      // Old team format
      if (winnerId !== match.team1?.id && winnerId !== match.team2?.id) {
        return NextResponse.json({ error: 'Winner must be one of the participating teams' }, { status: 400 });
      }
      winner = winnerId === match.team1?.id ? match.team1 : match.team2;
      loser = winnerId === match.team1?.id ? match.team2 : match.team1;
    } else if (isClanFormat) {
      // New clan format
      if (winnerId !== match.clan1?._id?.toString() && winnerId !== match.clan2?._id?.toString()) {
        return NextResponse.json({ error: 'Winner must be one of the participating clans' }, { status: 400 });
      }
      winner = winnerId === match.clan1?._id?.toString() ? match.clan1 : match.clan2;
      loser = winnerId === match.clan1?._id?.toString() ? match.clan2 : match.clan1;
    } else {
      return NextResponse.json({ error: 'Match format not supported' }, { status: 400 });
    }

    // Prepare update data
    let updateData: any = { 
      status: 'completed',
      winner,
      loser,
      completedAt: new Date(completedAt || Date.now()),
      enteredBy: {
        walletAddress: auth.user.walletAddress,
        displayName: auth.user.displayName,
        isHost: true,
        region: auth.user.region
      }
    };

    // If resolving a conflict, clear conflict data and add resolution info
    if (resolveConflict) {
      updateData.conflictResolvedBy = {
        walletAddress: auth.user.walletAddress,
        displayName: auth.user.displayName,
        resolvedAt: new Date()
      };
      updateData.conflictData = null;
    }
    
    await matchesCol.updateOne(
      { _id: new ObjectId(matchId) },
      { $set: updateData, $unset: resolveConflict ? { conflictData: "" } : {} }
    );

    // Get bracket to check for progression
    const bracket = await bracketsCol.findOne({ _id: match.bracketId });
    if (!bracket) {
      return NextResponse.json({ error: 'Bracket not found' }, { status: 404 });
    }

    // Check if this completes a round and generates next round matches
    const roundMatches = await matchesCol.find({ 
      bracketId: bracket._id, 
      round: match.round 
    }).toArray();
    
    const completedRoundMatches = roundMatches.filter(m => m.status === 'completed');
    
    // If all matches in this round are completed, generate next round
    if (completedRoundMatches.length === roundMatches.length) {
      // Generate next round matches (simplified logic)
      const nextRound = getNextRound(match.round);
      if (nextRound) {
        const winners = completedRoundMatches.map(m => m.winner);
        
        // Create next round matches
        const nextRoundMatches = [];
        for (let i = 0; i < winners.length; i += 2) {
          if (winners[i + 1]) {
            nextRoundMatches.push({
              bracketId: bracket._id,
              round: nextRound,
              status: 'pending',
              team1: winners[i],
              team2: winners[i + 1],
              createdAt: new Date()
            });
          }
        }
        
        if (nextRoundMatches.length > 0) {
          await matchesCol.insertMany(nextRoundMatches);
        }
        
        // If this was the final match, complete the tournament
        if (nextRound === null && completedRoundMatches.length === 1) {
          const tournamentWinner = completedRoundMatches[0].winner;
          const tournamentRunnerUp = completedRoundMatches[0].loser;
          
          await tournamentsCol.updateOne(
            { _id: bracket.tournamentId },
            { 
              $set: { 
                status: 'completed',
                winner: tournamentWinner,
                runnerUp: tournamentRunnerUp,
                completedAt: new Date()
              } 
            }
          );
          
          await bracketsCol.updateOne(
            { _id: bracket._id },
            { 
              $set: { 
                status: 'completed',
                winner: tournamentWinner,
                runnerUp: tournamentRunnerUp,
                completedAt: new Date()
              } 
            }
          );
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Match result entered successfully',
      winner,
      loser
    });
  } catch (error) {
    console.error('Error entering match result:', error);
    return NextResponse.json({ error: 'Failed to enter match result' }, { status: 500 });
  }
}

function getNextRound(currentRound: string): string | null {
  const roundOrder = ['first', 'quarter', 'semi', 'final'];
  const currentIndex = roundOrder.indexOf(currentRound);
  
  if (currentIndex === -1 || currentIndex === roundOrder.length - 1) {
    return null; // Final round or invalid round
  }
  
  return roundOrder[currentIndex + 1];
}