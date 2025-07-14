import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// Direct bracket access by bracket ID - useful for fallback scenarios
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bracketId = searchParams.get("bracketId");
    
    if (!bracketId) {
      return NextResponse.json({ error: "Bracket ID required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("tundra");
    const bracketsCol = db.collection("brackets");
    const matchesCol = db.collection("matches");

    const bracket = await bracketsCol.findOne({ _id: new ObjectId(bracketId) });
    
    if (!bracket) {
      return NextResponse.json({ error: "Bracket not found" }, { status: 404 });
    }

    const matches = await matchesCol.find({ bracketId: bracket._id }).toArray();

    return NextResponse.json({ bracket, matches });
  } catch (error) {
    console.error("Error fetching bracket directly:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}