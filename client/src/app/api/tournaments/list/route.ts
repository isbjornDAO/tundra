import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { validateGame, validateStatus, createSafeQuery } from "@/lib/security-utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameParam = searchParams.get("game");
    const statusParam = searchParams.get("status");
    
    const client = await clientPromise;
    const db = client.db("tundra");
    const tournamentsCol = db.collection("tournaments");
    const teamsCol = db.collection("teams");

    let query: any = {};
    
    // Validate and sanitize game parameter
    if (gameParam) {
      const { isValid, game, error } = validateGame(gameParam);
      if (!isValid) {
        return NextResponse.json({ error: `Invalid game: ${error}` }, { status: 400 });
      }
      query.game = game;
    }
    
    // Validate and sanitize status parameter
    if (statusParam) {
      const { isValid, status, error } = validateStatus(statusParam);
      if (!isValid) {
        return NextResponse.json({ error: `Invalid status: ${error}` }, { status: 400 });
      }
      query.status = status;
    }
    
    // Create safe query object
    query = createSafeQuery(query);

    // Get tournaments with team counts
    const tournaments = await tournamentsCol.aggregate([
      { $match: query },
      {
        $lookup: {
          from: "teams",
          localField: "_id",
          foreignField: "tournamentId",
          as: "teams"
        }
      },
      {
        $addFields: {
          registeredTeams: { $size: "$teams" }
        }
      },
      {
        $project: {
          _id: 1,
          game: 1,
          maxTeams: 1,
          registeredTeams: 1,
          status: 1,
          createdAt: 1,
          completedAt: 1,
          bracketId: 1,
          winner: 1,
          runnerUp: 1,
          teams: {
            $map: {
              input: "$teams",
              as: "team",
              in: {
                id: "$$team._id",
                name: "$$team.name",
                organizer: "$$team.organizer",
                region: "$$team.region",
                registeredAt: "$$team.registeredAt"
              }
            }
          }
        }
      },
      { $sort: { createdAt: -1 } }
    ]).toArray();

    return NextResponse.json({
      tournaments,
      totalCount: tournaments.length,
      games: await tournamentsCol.distinct("game"),
      statuses: await tournamentsCol.distinct("status")
    });
  } catch (error) {
    console.error("Error fetching tournaments list:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}