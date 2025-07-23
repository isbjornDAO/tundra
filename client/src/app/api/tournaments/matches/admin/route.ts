import { NextRequest, NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth-middleware';
import clientPromise from '@/lib/mongodb';
import connectToDatabase from '@/lib/mongoose';
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

    // Get all teams/clans for match details
    const teamIds = matches.flatMap(m => [m.team1?.id, m.team2?.id]).filter(Boolean);
    const clanIds = matches.flatMap(m => [m.clan1, m.clan2]).filter(Boolean);
    
    const teams = teamIds.length > 0 ? await teamsCol.find({ _id: { $in: teamIds.map(id => new ObjectId(id)) } }).toArray() : [];
    const clans = clanIds.length > 0 ? await db.collection("clans").find({ _id: { $in: clanIds.map(id => new ObjectId(id)) } }).toArray() : [];
    
    const teamMap = teams.reduce((acc, team) => {
      acc[team._id.toString()] = team;
      return acc;
    }, {} as any);
    
    const clanMap = clans.reduce((acc, clan) => {
      acc[clan._id.toString()] = clan;
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
          conflictData: match.conflictData,
          resultsSubmissions: match.resultsSubmissions,
          team1: match.team1 ? {
            ...match.team1,
            details: teamMap[match.team1.id]
          } : match.clan1 ? {
            id: match.clan1.toString(),
            name: clanMap[match.clan1.toString()]?.name || 'Unknown Clan',
            details: clanMap[match.clan1.toString()]
          } : null,
          team2: match.team2 ? {
            ...match.team2,
            details: teamMap[match.team2.id]
          } : match.clan2 ? {
            id: match.clan2.toString(),
            name: clanMap[match.clan2.toString()]?.name || 'Unknown Clan',
            details: clanMap[match.clan2.toString()]
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
  try {
    // Read the request body first
    const requestBody = await request.json();
    const { matchId, winnerId, completedAt, resolveConflict, resolutionData, walletAddress } = requestBody;
    
    // Manually authenticate using walletAddress from body since we already consumed the request
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }
    
    // Manual authentication check
    const { User } = await import('@/lib/models/User');
    await connectToDatabase();
    
    const user = await User.findOne({ 
      walletAddress: walletAddress.toLowerCase() 
    }).select('-__v');
    
    if (!user || (!user.isHost && !user.isAdmin)) {
      return NextResponse.json({ error: 'Host or Admin privileges required' }, { status: 403 });
    }
    
    const auth = {
      user: {
        _id: user._id.toString(),
        walletAddress: user.walletAddress,
        displayName: user.displayName,
        isAdmin: user.isAdmin || false,
        isHost: user.isHost || false,
        region: user.region
      },
      isAdmin: user.isAdmin || false,
      isHost: user.isHost || false
    };
    
    console.log('Admin PATCH request:', { 
      matchId, 
      winnerId, 
      resolveConflict, 
      resolutionData: resolutionData ? {
        clan1Score: resolutionData.clan1Score,
        clan2Score: resolutionData.clan2Score,
        playerPerformancesCount: resolutionData.playerPerformances?.length
      } : null
    });
    
    if (!matchId) {
      return NextResponse.json({ error: 'Missing required field: matchId' }, { status: 400 });
    }
    
    if (resolveConflict && resolutionData) {
      // New resolution format with detailed results
      if (resolutionData.clan1Score === undefined || resolutionData.clan2Score === undefined) {
        return NextResponse.json({ error: 'Resolution data must include both clan1Score and clan2Score' }, { status: 400 });
      }
    } else if (!winnerId) {
      return NextResponse.json({ error: 'Missing required field: winnerId' }, { status: 400 });
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
    
    console.log('Match structure:', {
      _id: match._id,
      status: match.status,
      hasTeam1: !!match.team1,
      hasTeam2: !!match.team2,
      hasClan1: !!match.clan1,
      hasClan2: !!match.clan2,
      team1: match.team1 ? { id: match.team1.id, name: match.team1.name } : null,
      team2: match.team2 ? { id: match.team2.id, name: match.team2.name } : null,
      clan1: match.clan1,
      clan2: match.clan2
    });

    // Support both old team format and new clan format
    const isTeamFormat = match.team1 || match.team2;
    const isClanFormat = match.clan1 || match.clan2;
    
    console.log('Format detection:', { isTeamFormat, isClanFormat });
    
    if (!isTeamFormat && !isClanFormat) {
      return NextResponse.json({ error: 'Match has no valid team or clan data' }, { status: 400 });
    }
    
    let winner, loser;
    
    if (resolveConflict && resolutionData) {
      // Handle detailed resolution with scores
      const { clan1Score, clan2Score } = resolutionData;
      
      if (isClanFormat) {
        if (clan1Score > clan2Score) {
          winner = match.clan1;
          loser = match.clan2;
        } else if (clan2Score > clan1Score) {
          winner = match.clan2;
          loser = match.clan1;
        } else {
          return NextResponse.json({ error: 'Cannot resolve with tied scores' }, { status: 400 });
        }
      } else if (isTeamFormat) {
        if (clan1Score > clan2Score) {
          winner = match.team1;
          loser = match.team2;
        } else if (clan2Score > clan1Score) {
          winner = match.team2;
          loser = match.team1;
        } else {
          return NextResponse.json({ error: 'Cannot resolve with tied scores' }, { status: 400 });
        }
      }
    } else {
      // Original winner-based resolution
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
    }
    
    console.log('Winner determination complete:', { 
      winner: winner ? (winner._id || winner.id) : null, 
      loser: loser ? (loser._id || loser.id) : null,
      isTeamFormat,
      isClanFormat
    });

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
    
    // Add detailed resolution data if provided
    if (resolveConflict && resolutionData) {
      updateData.score = {
        clan1Score: resolutionData.clan1Score,
        clan2Score: resolutionData.clan2Score
      };
      
      if (resolutionData.playerPerformances && resolutionData.playerPerformances.length > 0) {
        updateData.playerPerformances = resolutionData.playerPerformances;
      }
    }

    // If resolving a conflict, add resolution info (conflictData will be unset separately)
    if (resolveConflict) {
      updateData.conflictResolvedBy = {
        walletAddress: auth.user.walletAddress,
        displayName: auth.user.displayName,
        resolvedAt: new Date()
      };
      // Don't set conflictData to null here - we'll unset it instead
    }
    
    console.log('Updating match with data:', updateData);
    
    // Prepare the update operations
    const updateOps: any = { $set: updateData };
    if (resolveConflict) {
      updateOps.$unset = { conflictData: "" };
    }
    
    const updateResult = await matchesCol.updateOne(
      { _id: new ObjectId(matchId) },
      updateOps
    );
    
    console.log('Update result:', updateResult);

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
        // Check if next round matches already exist
        const existingNextRoundMatches = await matchesCol.find({
          bracketId: bracket._id,
          round: nextRound
        }).toArray();
        
        if (existingNextRoundMatches.length === 0) {
          // Only create next round matches if they don't exist
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
            console.log(`Created ${nextRoundMatches.length} ${nextRound} matches`);
          }
        } else {
          // Update existing matches with winners
          const winners = completedRoundMatches.map(m => m.winner);
          for (let i = 0; i < Math.min(existingNextRoundMatches.length, Math.floor(winners.length / 2)); i++) {
            const existingMatch = existingNextRoundMatches[i];
            const team1Winner = winners[i * 2];
            const team2Winner = winners[i * 2 + 1];
            
            if (team1Winner && team2Winner) {
              await matchesCol.updateOne(
                { _id: existingMatch._id },
                { 
                  $set: { 
                    team1: team1Winner,
                    team2: team2Winner,
                    clan1: team1Winner,
                    clan2: team2Winner,
                    status: 'scheduling',
                    updatedAt: new Date()
                  }
                }
              );
              console.log(`Updated existing ${nextRound} match with winners`);
            }
          }
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
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    return NextResponse.json({ 
      error: 'Failed to enter match result',
      details: error.message 
    }, { status: 500 });
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