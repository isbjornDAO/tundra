import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import { authenticateUser } from "@/lib/auth-middleware";
import { validateObjectId, sanitizeInput } from "@/lib/security-utils";
import mongoose from "mongoose";

// Match schema
const MatchSchema = new mongoose.Schema({
  bracketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bracket', required: true },
  team1: { type: Object, required: true },
  team2: { type: Object, required: true },
  round: { type: String, required: true },
  status: { type: String, required: true },
  scheduledTime: { type: Date },
  confirmedDate: { type: Date },
  winner: { type: Object },
  hostRegions: [String],
  needsConfirmation: Boolean,
  resultsSubmitted: [{
    hostWalletAddress: String,
    hostRegion: String,
    winnerTeamId: String,
    winnerTeamName: String,
    submittedAt: { type: Date, default: Date.now },
    notes: String
  }],
  createdAt: { type: Date, default: Date.now },
  completedAt: Date
});

const Match = mongoose.models.Match || mongoose.model('Match', MatchSchema);

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Authenticate user
    const authContext = await authenticateUser(request);
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user } = authContext;
    
    // Check if user is a regional admin/host
    if (!user.isAdmin || !user.adminRegions || user.adminRegions.length === 0) {
      return NextResponse.json({ error: "Only regional hosts can submit match results" }, { status: 403 });
    }

    const requestBody = await request.json();
    const sanitizedData = sanitizeInput(requestBody);
    const { matchId, winnerTeamId, winnerTeamName, notes } = sanitizedData;

    if (!matchId || !winnerTeamId || !winnerTeamName) {
      return NextResponse.json({ error: "Match ID, winner team ID and name are required" }, { status: 400 });
    }

    // Validate match ID
    const { isValid: matchIdValid, objectId: validatedMatchId, error: matchIdError } = validateObjectId(matchId);
    if (!matchIdValid) {
      return NextResponse.json({ error: `Invalid match ID: ${matchIdError}` }, { status: 400 });
    }

    // Find the match
    const match = await Match.findById(validatedMatchId);
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    // Check if match needs confirmation
    if (!match.needsConfirmation) {
      return NextResponse.json({ error: "This match does not require confirmation" }, { status: 400 });
    }

    // Check if match is in awaiting_results status
    if (match.status !== "awaiting_results") {
      return NextResponse.json({ error: "Match is not awaiting results" }, { status: 400 });
    }

    // Check if user's region is authorized for this match
    const userRegion = user.adminRegions[0]; // Take first admin region
    if (!match.hostRegions.includes(userRegion)) {
      return NextResponse.json({ 
        error: `Only hosts from ${match.hostRegions.join(' or ')} can submit results for this match` 
      }, { status: 403 });
    }

    // Check if this host has already submitted results
    const existingSubmission = match.resultsSubmitted.find(
      (submission: any) => submission.hostWalletAddress === user.walletAddress
    );

    if (existingSubmission) {
      return NextResponse.json({ error: "You have already submitted results for this match" }, { status: 400 });
    }

    // Validate winner team is one of the two teams in the match
    const validWinnerIds = [match.team1._id?.toString(), match.team2._id?.toString()];
    if (!validWinnerIds.includes(winnerTeamId)) {
      return NextResponse.json({ error: "Winner must be one of the teams in this match" }, { status: 400 });
    }

    // Add the result submission
    const newSubmission = {
      hostWalletAddress: user.walletAddress,
      hostRegion: userRegion,
      winnerTeamId,
      winnerTeamName,
      submittedAt: new Date(),
      notes: notes || ""
    };

    match.resultsSubmitted.push(newSubmission);

    // Check if we now have submissions from both required regions
    const submittedRegions = match.resultsSubmitted.map((sub: any) => sub.hostRegion);
    const allRegionsSubmitted = match.hostRegions.every(region => submittedRegions.includes(region));

    if (allRegionsSubmitted) {
      // Check if all submissions agree on the winner
      const winnerVotes = match.resultsSubmitted.map((sub: any) => sub.winnerTeamId);
      const allAgree = winnerVotes.every((vote: string) => vote === winnerVotes[0]);

      if (allAgree) {
        // All hosts agree - confirm the match
        const winnerTeam = winnerTeamId === match.team1._id?.toString() ? match.team1 : match.team2;
        
        match.status = "completed";
        match.winner = winnerTeam;
        match.completedAt = new Date();
      } else {
        // Hosts disagree - mark for admin review
        match.status = "disputed";
      }
    }

    await match.save();

    const responseData = {
      success: true,
      message: allRegionsSubmitted 
        ? (match.status === "completed" ? "Match results confirmed - all hosts agree!" : "Match disputed - hosts disagree, admin review required")
        : `Results submitted. Waiting for confirmation from ${match.hostRegions.filter(r => !submittedRegions.includes(r)).join(', ')} host(s).`,
      match: {
        _id: match._id,
        status: match.status,
        resultsSubmitted: match.resultsSubmitted,
        winner: match.winner,
        completedAt: match.completedAt
      }
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("Error submitting match results:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Authenticate user
    const authContext = await authenticateUser(request);
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user } = authContext;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "awaiting_results";

    // If user is a regional admin, show matches they can confirm
    if (user.isAdmin && user.adminRegions && user.adminRegions.length > 0) {
      const userRegion = user.adminRegions[0];
      
      const matches = await Match.find({
        status: status,
        needsConfirmation: true,
        hostRegions: userRegion
      }).sort({ scheduledTime: 1 });

      return NextResponse.json({ matches });
    }

    // For non-admin users, show all matches with basic info
    const matches = await Match.find({
      status: status,
      needsConfirmation: true
    }).sort({ scheduledTime: 1 });

    return NextResponse.json({ matches });

  } catch (error) {
    console.error("Error fetching matches:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}