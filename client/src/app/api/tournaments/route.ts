import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  const client = await clientPromise;
  const db = client.db("tundra");

  const tournaments = await db
    .collection("tournaments")
    .find(
      {},
      {
        projection: { registeredTeams: 1, maxTeams: 1, status: 1, gameName: 1 },
      }
    )
    .toArray();

  return NextResponse.json(tournaments);
}
