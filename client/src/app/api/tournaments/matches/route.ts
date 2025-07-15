import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId, Db } from "mongodb";
import { validateObjectId, validateWalletAddress, sanitizeInput } from "@/lib/security-utils";

async function generateNextRoundMatches(bracketId: ObjectId, db: Db) {
  const matchesCol = db.collection("matches");
  const bracketsCol = db.collection("brackets");
  const tournamentsCol = db.collection("tournaments");

  // Get all matches for this bracket
  const allMatches = await matchesCol.find({ bracketId }).toArray();
  
  // Group by round
  const matchesByRound = allMatches.reduce((acc, match) => {
    if (!acc[match.round]) acc[match.round] = [];
    acc[match.round].push(match);
    return acc;
  }, {});

  const roundNames = ['first', 'quarter', 'semi', 'final'];
  
  // Check each round for completion and generate next round
  for (const roundName of roundNames) {
    const currentRoundMatches = matchesByRound[roundName] || [];
    if (currentRoundMatches.length === 0) continue;
    
    const completedMatches = currentRoundMatches.filter(m => m.status === 'completed');
    
    // If current round is complete, generate next round
    if (completedMatches.length === currentRoundMatches.length && completedMatches.length > 0) {
      const winners = completedMatches.map(match => match.winner).filter(w => w);
      
      const currentRoundIndex = roundNames.indexOf(roundName);
      const nextRoundName = roundNames[currentRoundIndex + 1];
      
      // Check if next round already exists
      const nextRoundExists = matchesByRound[nextRoundName] && matchesByRound[nextRoundName].length > 0;
      
      if (nextRoundName && !nextRoundExists && winners.length >= 2) {
        const nextRoundMatches = [];
        
        // Create matches for next round
        for (let i = 0; i < winners.length; i += 2) {
          if (i + 1 < winners.length) {
            nextRoundMatches.push({
              bracketId,
              team1: winners[i],
              team2: winners[i + 1],
              round: nextRoundName,
              status: "pending",
              organizer1Approved: false,
              organizer2Approved: false,
              createdAt: new Date(),
            });
          }
        }
        
        if (nextRoundMatches.length > 0) {
          await matchesCol.insertMany(nextRoundMatches);
          console.log(`Generated ${nextRoundMatches.length} matches for ${nextRoundName} round`);
        }
      }
      
      // If this was the final round and only one winner, tournament is complete
      if (roundName === 'final' && winners.length === 1) {
        const bracket = await bracketsCol.findOne({ _id: bracketId });
        if (bracket) {
          await bracketsCol.updateOne(
            { _id: bracketId },
            { $set: { winner: winners[0], status: "completed" } }
          );
          
          await tournamentsCol.updateOne(
            { _id: bracket.tournamentId },
            { $set: { status: "completed", winner: winners[0], completedAt: new Date() } }
          );
          
          console.log(`Tournament completed! Winner: ${winners[0].name}`);
        }
      }
    }
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bracketIdParam = searchParams.get("bracketId");
    const organizerParam = searchParams.get("organizer");
    
    const client = await clientPromise;
    const db = client.db("tundra");
    const matchesCol = db.collection("matches");
    
    let query = {};
    
    if (bracketIdParam) {
      // Validate and sanitize bracketId
      const { isValid, objectId, error } = validateObjectId(bracketIdParam);
      if (!isValid) {
        return NextResponse.json({ error: `Invalid bracketId: ${error}` }, { status: 400 });
      }
      query = { bracketId: objectId };
    } else if (organizerParam) {
      // Validate and sanitize organizer address
      const { isValid, address, error } = validateWalletAddress(organizerParam);
      if (!isValid) {
        return NextResponse.json({ error: `Invalid organizer address: ${error}` }, { status: 400 });
      }
      query = {
        $or: [
          { "team1.organizer": address },
          { "team2.organizer": address }
        ]
      };
    }

    const matches = await matchesCol.find(query).sort({ createdAt: 1 }).toArray();

    return NextResponse.json({ matches });
  } catch (error) {
    console.error("Error fetching matches:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const requestBody = await request.json();
    const { matchId, winnerId, reportedBy } = sanitizeInput(requestBody);
    
    if (!matchId || !winnerId || !reportedBy) {
      return NextResponse.json({ error: "Missing required fields: matchId, winnerId, reportedBy" }, { status: 400 });
    }

    // Validate matchId
    const { isValid: matchIdValid, objectId: matchObjectId, error: matchIdError } = validateObjectId(matchId);
    if (!matchIdValid) {
      return NextResponse.json({ error: `Invalid matchId: ${matchIdError}` }, { status: 400 });
    }

    // Validate winnerId (also an ObjectId)
    const { isValid: winnerIdValid, objectId: winnerObjectId, error: winnerIdError } = validateObjectId(winnerId);
    if (!winnerIdValid) {
      return NextResponse.json({ error: `Invalid winnerId: ${winnerIdError}` }, { status: 400 });
    }

    // Validate reportedBy wallet address
    const { isValid: reporterValid, address: reporterAddress, error: reporterError } = validateWalletAddress(reportedBy);
    if (!reporterValid) {
      return NextResponse.json({ error: `Invalid reporter address: ${reporterError}` }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("tundra");
    const matchesCol = db.collection("matches");

    // Get match using validated ObjectId
    const match = await matchesCol.findOne({ _id: matchObjectId });
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    // Verify reporter is one of the team organizers
    const isValidReporter = 
      match.team1?.organizer?.toLowerCase() === reporterAddress ||
      match.team2?.organizer?.toLowerCase() === reporterAddress;
      
    if (!isValidReporter) {
      return NextResponse.json({ error: "Unauthorized to report match result" }, { status: 403 });
    }

    // Verify winner is one of the participating teams
    const winner = match.team1?.id === winnerId ? match.team1 : 
                   match.team2?.id === winnerId ? match.team2 : null;
                   
    if (!winner) {
      return NextResponse.json({ error: "Winner must be one of the participating teams" }, { status: 400 });
    }

    // Update match with winner using validated ObjectId
    await matchesCol.updateOne(
      { _id: matchObjectId },
      { 
        $set: { 
          winner,
          status: "completed",
          completedAt: new Date(),
          reportedBy: reporterAddress
        } 
      }
    );

    // Generate next round matches if this completes a round
    await generateNextRoundMatches(match.bracketId, db);

    return NextResponse.json({ 
      success: true, 
      message: "Match result reported successfully" 
    });
  } catch (error) {
    console.error("Error reporting match result:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}