import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import { Tournament } from "@/lib/models/Tournament";
import mongoose from "mongoose";

// Team schema
const TeamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  organizer: { type: String, required: true },
  country: { type: String, required: true },
  clanId: { type: String },
  players: [{
    id: String,
    name: String,
    walletAddress: String,
    steamId: String
  }],
  registeredAt: { type: Date, default: Date.now }
});

const Team = mongoose.models.Team || mongoose.model('Team', TeamSchema);

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const { tournamentId, team } = await request.json();
    
    if (!tournamentId || !team) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if tournament exists and has space
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    if (tournament.registeredTeams >= tournament.maxTeams) {
      return NextResponse.json({ error: "Tournament is full" }, { status: 400 });
    }

    // Check for duplicate registration by organizer
    const existingTeam = await Team.findOne({ 
      tournamentId: new mongoose.Types.ObjectId(tournamentId),
      organizer: team.organizer 
    });
    
    if (existingTeam) {
      return NextResponse.json({ error: "You have already registered a team for this tournament" }, { status: 400 });
    }

    // Insert team
    const teamDoc = new Team({
      ...team,
      tournamentId: new mongoose.Types.ObjectId(tournamentId),
      registeredAt: new Date(),
    });
    
    const savedTeam = await teamDoc.save();

    // Update tournament registered teams count
    await Tournament.findByIdAndUpdate(tournamentId, {
      $inc: { registeredTeams: 1 },
      $push: { teams: savedTeam._id }
    });

    // Update status to full if needed
    const updatedTournament = await Tournament.findById(tournamentId);
    if (updatedTournament && updatedTournament.registeredTeams >= updatedTournament.maxTeams) {
      await Tournament.findByIdAndUpdate(tournamentId, { status: 'full' });
    }

    return NextResponse.json({ 
      success: true, 
      teamId: savedTeam._id,
      message: "Team registered successfully" 
    });
  } catch (error) {
    console.error("Error registering team:", error);
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

    const teams = await Team.find({ tournamentId: new mongoose.Types.ObjectId(tournamentId) });

    return NextResponse.json({ teams });
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}