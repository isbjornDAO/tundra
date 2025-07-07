import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const game = searchParams.get("game");
    
    const client = await clientPromise;
    const db = client.db("tundra");
    const tournamentsCol = db.collection("tournaments");
    const teamsCol = db.collection("teams");
    const matchesCol = db.collection("matches");

    let query = {};
    if (game) {
      query = { game };
    }

    // Get completed tournaments
    const completedTournaments = await tournamentsCol.find({ 
      ...query,
      status: 'completed' 
    }).sort({ completedAt: -1 }).limit(10).toArray();

    // Get team leaderboards by aggregating team performance
    const teamLeaderboards = await teamsCol.aggregate([
      {
        $lookup: {
          from: "tournaments",
          localField: "tournamentId",
          foreignField: "_id",
          as: "tournament"
        }
      },
      {
        $unwind: "$tournament"
      },
      {
        $match: {
          ...query ? { "tournament.game": game } : {},
          "tournament.status": "completed"
        }
      },
      {
        $lookup: {
          from: "matches",
          let: { teamOrganizer: "$organizer", tournamentId: "$tournamentId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$tournamentId", "$$tournamentId"] },
                    { $eq: ["$status", "completed"] },
                    {
                      $or: [
                        { $eq: ["$team1.organizer", "$$teamOrganizer"] },
                        { $eq: ["$team2.organizer", "$$teamOrganizer"] }
                      ]
                    }
                  ]
                }
              }
            }
          ],
          as: "matches"
        }
      },
      {
        $addFields: {
          wins: {
            $size: {
              $filter: {
                input: "$matches",
                cond: { $eq: ["$$this.winner.organizer", "$organizer"] }
              }
            }
          },
          totalMatches: { $size: "$matches" },
          tournamentWins: {
            $cond: [
              { $eq: ["$tournament.winner.organizer", "$organizer"] },
              1,
              0
            ]
          }
        }
      },
      {
        $group: {
          _id: {
            teamName: "$name",
            organizer: "$organizer",
            game: "$tournament.game"
          },
          totalTournaments: { $sum: 1 },
          tournamentWins: { $sum: "$tournamentWins" },
          totalMatches: { $sum: "$totalMatches" },
          matchWins: { $sum: "$wins" },
          recentMatches: { $push: "$matches" }
        }
      },
      {
        $addFields: {
          winRate: {
            $cond: [
              { $eq: ["$totalMatches", 0] },
              0,
              { $multiply: [{ $divide: ["$matchWins", "$totalMatches"] }, 100] }
            ]
          },
          points: {
            $add: [
              { $multiply: ["$tournamentWins", 1000] },
              { $multiply: ["$matchWins", 100] },
              { $multiply: ["$totalTournaments", 50] }
            ]
          }
        }
      },
      {
        $sort: { points: -1 }
      },
      {
        $limit: 10
      }
    ]).toArray();

    // Get player leaderboards (organizers who participated in tournaments)
    const playerLeaderboards = await teamsCol.aggregate([
      {
        $lookup: {
          from: "tournaments",
          localField: "tournamentId",
          foreignField: "_id",
          as: "tournament"
        }
      },
      {
        $unwind: "$tournament"
      },
      {
        $match: {
          ...query ? { "tournament.game": game } : {},
          "tournament.status": "completed"
        }
      },
      {
        $lookup: {
          from: "matches",
          let: { organizer: "$organizer", tournamentId: "$tournamentId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$tournamentId", "$$tournamentId"] },
                    { $eq: ["$status", "completed"] },
                    {
                      $or: [
                        { $eq: ["$team1.organizer", "$$organizer"] },
                        { $eq: ["$team2.organizer", "$$organizer"] }
                      ]
                    }
                  ]
                }
              }
            }
          ],
          as: "matches"
        }
      },
      {
        $addFields: {
          wins: {
            $size: {
              $filter: {
                input: "$matches",
                cond: { $eq: ["$$this.winner.organizer", "$organizer"] }
              }
            }
          },
          totalMatches: { $size: "$matches" },
          tournamentWins: {
            $cond: [
              { $eq: ["$tournament.winner.organizer", "$organizer"] },
              1,
              0
            ]
          },
          runnerUps: {
            $cond: [
              { $eq: ["$tournament.runnerUp.organizer", "$organizer"] },
              1,
              0
            ]
          }
        }
      },
      {
        $group: {
          _id: "$organizer",
          playerName: { $first: "$organizer" }, // Would be display name if available
          totalTournaments: { $sum: 1 },
          tournamentWins: { $sum: "$tournamentWins" },
          runnerUps: { $sum: "$runnerUps" },
          totalMatches: { $sum: "$totalMatches" },
          matchWins: { $sum: "$wins" },
          favoriteGame: { $first: "$tournament.game" },
          recentMatches: { $push: "$matches" }
        }
      },
      {
        $addFields: {
          winRate: {
            $cond: [
              { $eq: ["$totalMatches", 0] },
              0,
              { $round: [{ $multiply: [{ $divide: ["$matchWins", "$totalMatches"] }, 100] }, 0] }
            ]
          },
          topThrees: { $add: ["$tournamentWins", "$runnerUps"] },
          totalPrizesMoney: {
            $add: [
              { $multiply: ["$tournamentWins", 1000] },
              { $multiply: ["$runnerUps", 500] }
            ]
          },
          averageScore: {
            $cond: [
              { $eq: ["$totalTournaments", 0] },
              0,
              { $round: [{ $multiply: [{ $divide: ["$matchWins", "$totalTournaments"] }, 10] }, 0] }
            ]
          },
          bestPlacement: {
            $cond: [
              { $gt: ["$tournamentWins", 0] },
              1,
              { $cond: [{ $gt: ["$runnerUps", 0] }, 2, 3] }
            ]
          }
        }
      },
      {
        $sort: { winRate: -1, totalTournaments: -1 }
      },
      {
        $limit: 10
      }
    ]).toArray();

    // Add rank to leaderboards
    const rankedTeamLeaderboards = teamLeaderboards.map((team, index) => ({
      rank: index + 1,
      teamId: team._id.organizer,
      teamName: team._id.teamName,
      points: team.points,
      wins: team.tournamentWins,
      totalTournaments: team.totalTournaments,
      winRate: Math.round(team.winRate),
      recentForm: [], // Would need to implement recent form logic
      change: 0 // Would need historical data for rank changes
    }));

    const rankedPlayerLeaderboards = playerLeaderboards.map((player, index) => ({
      ...player,
      playerId: player._id,
      recentForm: [], // Would need to implement recent form logic
      achievements: [] // Would need to implement achievements
    }));

    // Recent tournaments with results
    const recentTournaments = completedTournaments.map(tournament => ({
      id: tournament._id,
      tournament: {
        id: tournament._id,
        game: tournament.game,
        registeredTeams: [],
        maxTeams: tournament.maxTeams,
        status: tournament.status,
        createdAt: tournament.createdAt
      },
      winner: tournament.winner || { name: 'TBD' },
      runnerUp: tournament.runnerUp || { name: 'TBD' },
      participants: [],
      completedAt: tournament.completedAt || tournament.createdAt,
      prizePool: '$' + ((tournament.maxTeams || 8) * 100), // Estimated prize pool
      region: 'Global',
      game: tournament.game
    }));

    return NextResponse.json({
      recentTournaments,
      teamLeaderboards: game ? { [game]: rankedTeamLeaderboards } : 
        teamLeaderboards.reduce((acc, team) => {
          const gameKey = team._id.game;
          if (!acc[gameKey]) acc[gameKey] = [];
          acc[gameKey].push({
            rank: acc[gameKey].length + 1,
            teamId: team._id.organizer,
            teamName: team._id.teamName,
            points: team.points,
            wins: team.tournamentWins,
            totalTournaments: team.totalTournaments,
            winRate: Math.round(team.winRate),
            recentForm: [],
            change: 0
          });
          return acc;
        }, {}),
      playerLeaderboards: game ? { [game]: rankedPlayerLeaderboards } :
        playerLeaderboards.reduce((acc, player) => {
          const gameKey = player.favoriteGame;
          if (!acc[gameKey]) acc[gameKey] = [];
          acc[gameKey].push({
            ...player,
            playerId: player._id,
            recentForm: [],
            achievements: []
          });
          return acc;
        }, {})
    });
  } catch (error) {
    console.error("Error fetching tournament leaderboards:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}