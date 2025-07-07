import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const organizerAddress = searchParams.get("organizer");
    const game = searchParams.get("game");
    
    const client = await clientPromise;
    const db = client.db("tundra");
    const tournamentsCol = db.collection("tournaments");
    const teamsCol = db.collection("teams");
    const matchesCol = db.collection("matches");
    const bracketsCol = db.collection("brackets");

    if (organizerAddress) {
      // Get player/organizer stats
      const teams = await teamsCol.find({ organizer: organizerAddress }).toArray();
      const tournamentIds = teams.map(team => team.tournamentId);
      
      // Get all tournaments this organizer participated in
      const tournaments = await tournamentsCol.find({ 
        _id: { $in: tournamentIds } 
      }).toArray();
      
      // Get all matches for this organizer
      const allMatches = await matchesCol.find({
        $or: [
          { "team1.organizer": organizerAddress },
          { "team2.organizer": organizerAddress }
        ]
      }).toArray();
      
      const completedMatches = allMatches.filter(m => m.status === 'completed');
      const wins = completedMatches.filter(m => m.winner?.organizer === organizerAddress);
      
      // Tournament wins (completed tournaments where user won)
      const tournamentWins = tournaments.filter(t => t.status === 'completed' && t.winner?.organizer === organizerAddress);
      const tournamentRunnerUps = tournaments.filter(t => t.status === 'completed' && t.runnerUp?.organizer === organizerAddress);
      
      // Calculate win rate
      const winRate = completedMatches.length > 0 ? (wins.length / completedMatches.length) * 100 : 0;
      
      // Recent form (last 10 matches)
      const recentMatches = completedMatches
        .sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime())
        .slice(0, 10);
      
      const recentForm = recentMatches.map(match => 
        match.winner?.organizer === organizerAddress ? 'W' : 'L'
      );
      
      // Games played
      const gameStats = tournaments.reduce((acc, tournament) => {
        const game = tournament.game;
        if (!acc[game]) {
          acc[game] = { played: 0, wins: 0, runnerUps: 0 };
        }
        acc[game].played++;
        if (tournament.winner?.organizer === organizerAddress) acc[game].wins++;
        if (tournament.runnerUp?.organizer === organizerAddress) acc[game].runnerUps++;
        return acc;
      }, {});

      return NextResponse.json({
        organizer: organizerAddress,
        totalTournaments: tournaments.length,
        activeTournaments: tournaments.filter(t => t.status === 'active').length,
        completedTournaments: tournaments.filter(t => t.status === 'completed').length,
        tournamentWins: tournamentWins.length,
        tournamentRunnerUps: tournamentRunnerUps.length,
        totalMatches: allMatches.length,
        completedMatches: completedMatches.length,
        matchWins: wins.length,
        winRate: Math.round(winRate),
        recentForm,
        gameStats,
        recentMatches: recentMatches.slice(0, 5).map(match => ({
          id: match._id,
          team1: match.team1,
          team2: match.team2,
          winner: match.winner,
          round: match.round,
          game: tournaments.find(t => t._id.toString() === match.bracketId?.toString())?.game,
          completedAt: match.completedAt || match.createdAt
        }))
      });
    }

    // Global tournament stats
    const totalTournaments = await tournamentsCol.countDocuments();
    const activeTournaments = await tournamentsCol.countDocuments({ status: 'active' });
    const completedTournaments = await tournamentsCol.countDocuments({ status: 'completed' });
    const openTournaments = await tournamentsCol.countDocuments({ status: 'open' });
    
    const totalTeams = await teamsCol.countDocuments();
    const totalMatches = await matchesCol.countDocuments();
    const completedMatches = await matchesCol.countDocuments({ status: 'completed' });
    
    // Game breakdown
    const gameBreakdown = await tournamentsCol.aggregate([
      {
        $group: {
          _id: "$game",
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
          open: { $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] } }
        }
      },
      { $sort: { total: -1 } }
    ]).toArray();

    // Recent activity (last 10 completed matches)
    const recentActivity = await matchesCol.find({ 
      status: 'completed' 
    }).sort({ 
      completedAt: -1, createdAt: -1 
    }).limit(10).toArray();

    return NextResponse.json({
      global: {
        totalTournaments,
        activeTournaments,
        completedTournaments,
        openTournaments,
        totalTeams,
        totalMatches,
        completedMatches,
        completionRate: Math.round((completedMatches / Math.max(totalMatches, 1)) * 100)
      },
      gameBreakdown,
      recentActivity: recentActivity.map(match => ({
        id: match._id,
        team1: match.team1,
        team2: match.team2,
        winner: match.winner,
        round: match.round,
        completedAt: match.completedAt || match.createdAt
      }))
    });
  } catch (error) {
    console.error("Error fetching tournament stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}