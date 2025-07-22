import { NextResponse } from "next/server";
import connectToDatabase from '@/lib/mongoose';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { Tournament } from '@/lib/models/Tournament';
import { Bracket } from '@/lib/models/Bracket';
import { Match } from '@/lib/models/Match';
import { Clan } from '@/lib/models/Clan';

export async function POST(request: Request) {
  try {
    const { tournamentId } = await request.json();
    
    if (!tournamentId) {
      return NextResponse.json({ error: "Tournament ID required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("tundra");
    // Mongoose uses pluralized collection names by default
    const tournamentsCol = db.collection("tournaments");
    const clansCol = db.collection("clans");
    const registrationsCol = db.collection("tournamentregistrations");
    const bracketsCol = db.collection("brackets");
    const matchesCol = db.collection("matches");

    // Get tournament - try both collection names (mongoose might have pluralized it)
    let tournament = await tournamentsCol.findOne({ _id: new ObjectId(tournamentId) });
    
    if (!tournament) {
      // Also try the singular form in case Mongoose didn't pluralize
      const tournamentCol = db.collection("tournament");
      tournament = await tournamentCol.findOne({ _id: new ObjectId(tournamentId) });
    }
    if (!tournament || tournament.status !== "full") {
      return NextResponse.json({ error: "Tournament not ready for bracket generation" }, { status: 400 });
    }

    // Get registered clans for this tournament
    const registrations = await registrationsCol.find({ 
      tournamentId: new ObjectId(tournamentId),
      status: "registered" 
    }).toArray();
    
    const clanIds = registrations.map(reg => reg.clanId);
    const clans = await clansCol.find({ _id: { $in: clanIds } }).toArray();
    
    if (clans.length < 2) {
      return NextResponse.json({ error: "Not enough clans for bracket" }, { status: 400 });
    }

    // Generate bracket
    const shuffledClans = clans.sort(() => Math.random() - 0.5);
    const bracketDoc = {
      tournamentId: new ObjectId(tournamentId),
      clans: shuffledClans,
      status: "active",
      createdAt: new Date(),
    };

    const bracketResult = await bracketsCol.insertOne(bracketDoc);

    // Generate matches
    const matches = [];
    const rounds = Math.ceil(Math.log2(clans.length));
    
    // First round matches
    for (let i = 0; i < shuffledClans.length; i += 2) {
      if (i + 1 < shuffledClans.length) {
        // Get registered players for each clan from tournament registrations
        const clan1Registration = registrations.find(reg => reg.clanId.toString() === shuffledClans[i]._id.toString());
        const clan2Registration = registrations.find(reg => reg.clanId.toString() === shuffledClans[i + 1]._id.toString());
        
        matches.push({
          bracketId: bracketResult.insertedId,
          clan1: shuffledClans[i]._id,
          clan2: shuffledClans[i + 1]._id,
          rosters: {
            clan1: clan1Registration?.selectedPlayers?.map(player => ({
              userId: player.userId,
              username: player.username,
              confirmed: true
            })) || [],
            clan2: clan2Registration?.selectedPlayers?.map(player => ({
              userId: player.userId,
              username: player.username,
              confirmed: true
            })) || []
          },
          round: "first",
          status: "scheduling",
          createdAt: new Date(),
        });
      }
    }

    if (matches.length > 0) {
      await matchesCol.insertMany(matches);
    }

    // Update tournament status
    await tournamentsCol.updateOne(
      { _id: new ObjectId(tournamentId) },
      { $set: { status: "active", bracketId: bracketResult.insertedId } }
    );

    return NextResponse.json({ 
      success: true, 
      bracketId: bracketResult.insertedId,
      matchesCount: matches.length 
    });
  } catch (error) {
    console.error("Error generating bracket:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get("tournamentId");
    
    if (!tournamentId) {
      return NextResponse.json({ error: "Tournament ID required" }, { status: 400 });
    }

    console.log('Looking for bracket with tournamentId:', tournamentId);

    // First, check if the tournament exists and has a bracketId reference
    const tournament = await Tournament.findById(tournamentId);
    console.log('Found tournament:', !!tournament, 'bracketId:', tournament?.bracketId);

    let bracket = null;
    let matches = [];

    if (tournament?.bracketId) {
      // If tournament has bracketId, use it to find the bracket
      bracket = await Bracket.findById(tournament.bracketId);
      
      if (bracket) {
        matches = await Match.find({ bracketId: bracket._id });
      }
    } else if (tournament) {
      // Otherwise, search for bracket by tournamentId
      bracket = await Bracket.findOne({ tournamentId: tournament._id });
      
      if (bracket) {
        matches = await Match.find({ bracketId: bracket._id });
      }
    }

    if (!bracket) {
      // Try to find any bracket that might be related
      const allBrackets = await Bracket.find({});
      console.log('All brackets:', allBrackets.map(b => ({ id: b._id, tournamentId: b.tournamentId })));
      
      for (const b of allBrackets) {
        if (b.tournamentId && b.tournamentId.toString() === tournamentId) {
          const relatedMatches = await Match.find({ bracketId: b._id });
          return NextResponse.json({ bracket: b, matches: relatedMatches });
        }
      }

      return NextResponse.json({ 
        error: "Bracket not found", 
        tournamentId, 
        tournament: !!tournament,
        allBracketsCount: allBrackets.length,
        debug: {
          searchedTournamentId: tournamentId,
          foundTournament: !!tournament,
          tournamentBracketId: tournament?.bracketId
        }
      }, { status: 404 });
    }

    return NextResponse.json({ bracket, matches });
  } catch (error) {
    console.error("Error fetching bracket:", error);
    return NextResponse.json({ error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}