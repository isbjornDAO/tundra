import { NextResponse } from "next/server";
import { inMemoryDB } from "@/lib/in-memory-db";
import clientPromise from "@/lib/mongodb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const organizerAddress = searchParams.get("organizer");
    
    // Try to use MongoDB if available, otherwise fallback to in-memory DB
    const client = await clientPromise;
    
    if (client && organizerAddress) {
      try {
        const db = client.db("tundra");
        const tournamentsCol = db.collection("tournaments");
        const teamsCol = db.collection("teams");
        const matchesCol = db.collection("matches");
        
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
      } catch (mongoError) {
        console.error("MongoDB error for organizer stats:", mongoError);
        // Fallback to empty stats if MongoDB fails
        return NextResponse.json({
          organizer: organizerAddress,
          totalTournaments: 0,
          activeTournaments: 0,
          completedTournaments: 0,
          tournamentWins: 0,
          tournamentRunnerUps: 0,
          totalMatches: 0,
          completedMatches: 0,
          matchWins: 0,
          winRate: 0,
          recentForm: [],
          gameStats: {},
          recentMatches: []
        });
      }
    }

    // Global tournament stats using in-memory database
    const stats = await inMemoryDB.getTournamentStats();
    const tournaments = await inMemoryDB.findTournaments();
    const teams = await inMemoryDB.findTeams();
    
    // Game breakdown - calculate from tournaments
    const gameBreakdown = tournaments.reduce((acc, tournament) => {
      const existing = acc.find(item => item._id === tournament.game);
      if (existing) {
        existing.total++;
        if (tournament.status === 'completed') existing.completed++;
        if (tournament.status === 'active') existing.active++;
        if (tournament.status === 'open') existing.open++;
      } else {
        acc.push({
          _id: tournament.game,
          total: 1,
          completed: tournament.status === 'completed' ? 1 : 0,
          active: tournament.status === 'active' ? 1 : 0,
          open: tournament.status === 'open' ? 1 : 0
        });
      }
      return acc;
    }, [] as any[]);

    return NextResponse.json({
      global: {
        totalTournaments: stats.totalTournaments,
        activeTournaments: stats.activeTournaments,
        completedTournaments: stats.completedTournaments,
        openTournaments: stats.openTournaments,
        totalTeams: stats.totalTeams,
        totalMatches: 0, // No matches in simple implementation
        completedMatches: 0,
        completionRate: 0
      },
      gameBreakdown,
      recentActivity: [] // No matches in simple implementation
    });
  } catch (error) {
    console.error("Error fetching tournament stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}