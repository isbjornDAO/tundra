import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import mongoose from 'mongoose';
import { validateObjectId, validateWalletAddress, sanitizeInput } from '@/lib/security-utils';

// Match schema
const MatchSchema = new mongoose.Schema({
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  bracketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bracket', required: true },
  round: { type: String, required: true },
  team1: {
    name: String,
    organizer: String,
    clanId: String
  },
  team2: {
    name: String,
    organizer: String,
    clanId: String
  },
  scheduledTime: Date,
  status: { type: String, enum: ['pending', 'scheduled', 'completed'], default: 'pending' },
  results: {
    team1Score: { type: Number, default: 0 },
    team2Score: { type: Number, default: 0 },
    submittedBy: [String], // Array of wallet addresses who submitted results
    submissions: [{
      submittedBy: String,
      team1Score: Number,
      team2Score: Number,
      submittedAt: { type: Date, default: Date.now }
    }],
    confirmed: { type: Boolean, default: false },
    confirmedAt: Date
  },
  winner: {
    name: String,
    organizer: String,
    clanId: String
  },
  createdAt: { type: Date, default: Date.now }
});

const Match = mongoose.models.Match || mongoose.model('Match', MatchSchema);

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const requestBody = await request.json();
    const sanitizedData = sanitizeInput(requestBody);
    const { matchId, team1Score, team2Score, submittedBy } = sanitizedData;
    
    if (!matchId || team1Score === undefined || team2Score === undefined || !submittedBy) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Validate match ID
    const { isValid: matchIdValid, objectId: validatedMatchId, error: matchIdError } = validateObjectId(matchId);
    if (!matchIdValid) {
      return NextResponse.json({ error: `Invalid match ID: ${matchIdError}` }, { status: 400 });
    }
    
    // Validate wallet address
    const { isValid: walletValid, address: validatedAddress, error: walletError } = validateWalletAddress(submittedBy);
    if (!walletValid) {
      return NextResponse.json({ error: `Invalid wallet address: ${walletError}` }, { status: 400 });
    }
    
    // Validate scores
    if (typeof team1Score !== 'number' || typeof team2Score !== 'number' || team1Score < 0 || team2Score < 0) {
      return NextResponse.json({ error: 'Invalid scores provided' }, { status: 400 });
    }
    
    // Find the match
    const match = await Match.findById(validatedMatchId);
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }
    
    // Check if user is authorized (team leader)
    if (match.team1.organizer !== validatedAddress && match.team2.organizer !== validatedAddress) {
      return NextResponse.json({ error: 'Only team leaders can submit results' }, { status: 403 });
    }
    
    // Check if match is ready for results (should be scheduled and time passed)
    if (match.status !== 'scheduled' && match.status !== 'completed') {
      return NextResponse.json({ error: 'Match is not ready for results submission' }, { status: 400 });
    }
    
    // Check if user already submitted results
    if (match.results?.submittedBy?.includes(validatedAddress)) {
      return NextResponse.json({ error: 'You have already submitted results for this match' }, { status: 400 });
    }
    
    // Initialize results if not exists
    if (!match.results) {
      match.results = {
        team1Score: 0,
        team2Score: 0,
        submittedBy: [],
        submissions: [],
        confirmed: false
      };
    }
    
    // Add submission
    match.results.submissions.push({
      submittedBy: validatedAddress,
      team1Score,
      team2Score,
      submittedAt: new Date()
    });
    
    match.results.submittedBy.push(validatedAddress);
    
    // Check if both team leaders have submitted
    const team1Leader = match.team1.organizer;
    const team2Leader = match.team2.organizer;
    const bothSubmitted = match.results.submittedBy.includes(team1Leader) && match.results.submittedBy.includes(team2Leader);
    
    if (bothSubmitted) {
      // Get the two submissions
      const team1Submission = match.results.submissions.find(s => s.submittedBy === team1Leader);
      const team2Submission = match.results.submissions.find(s => s.submittedBy === team2Leader);
      
      // Check if scores match
      const scoresMatch = team1Submission && team2Submission &&
        team1Submission.team1Score === team2Submission.team1Score &&
        team1Submission.team2Score === team2Submission.team2Score;
      
      if (scoresMatch) {
        // Scores match - confirm results
        match.results.team1Score = team1Submission.team1Score;
        match.results.team2Score = team2Submission.team2Score;
        match.results.confirmed = true;
        match.results.confirmedAt = new Date();
        match.status = 'completed';
        
        // Determine winner
        if (team1Submission.team1Score > team1Submission.team2Score) {
          match.winner = match.team1;
        } else if (team1Submission.team2Score > team1Submission.team1Score) {
          match.winner = match.team2;
        }
        // If tied, no winner is set
        
        console.log(`Match results confirmed: ${match.team1.name} ${match.results.team1Score} - ${match.results.team2Score} ${match.team2.name}`);
      } else {
        // Scores don't match - keep as unconfirmed
        match.results.team1Score = team1Score;
        match.results.team2Score = team2Score;
        match.results.confirmed = false;
        
        console.log(`Match results submitted but scores don't match - awaiting resolution`);
      }
    } else {
      // Only one submission so far
      match.results.team1Score = team1Score;
      match.results.team2Score = team2Score;
      match.results.confirmed = false;
    }
    
    await match.save();
    
    return NextResponse.json({ 
      success: true, 
      message: bothSubmitted 
        ? (match.results.confirmed ? 'Results confirmed and match completed!' : 'Results submitted but scores don\'t match. Please coordinate with the other team leader.')
        : 'Results submitted. Waiting for the other team leader to confirm.',
      confirmed: match.results.confirmed,
      bothSubmitted
    });
    
  } catch (error) {
    console.error('Error submitting match results:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId');
    
    if (!matchId) {
      return NextResponse.json({ error: 'Match ID is required' }, { status: 400 });
    }
    
    // Validate match ID
    const { isValid: matchIdValid, objectId: validatedMatchId, error: matchIdError } = validateObjectId(matchId);
    if (!matchIdValid) {
      return NextResponse.json({ error: `Invalid match ID: ${matchIdError}` }, { status: 400 });
    }
    
    // Find the match
    const match = await Match.findById(validatedMatchId);
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      match: {
        _id: match._id,
        round: match.round,
        team1: match.team1,
        team2: match.team2,
        scheduledTime: match.scheduledTime,
        status: match.status,
        results: match.results,
        winner: match.winner
      }
    });
    
  } catch (error) {
    console.error('Error fetching match results:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
