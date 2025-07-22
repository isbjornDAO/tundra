import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(request: Request) {
  try {
    const { matchId, proposedTime, proposedBy } = await request.json();
    
    if (!matchId || !proposedTime || !proposedBy) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("tundra");
    const matchesCol = db.collection("matches");
    const timeSlotsCol = db.collection("timeSlots");

    // Check if match exists
    const match = await matchesCol.findOne({ _id: new ObjectId(matchId) });
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    // Create time slot proposal
    const timeSlotDoc = {
      matchId: new ObjectId(matchId),
      proposedBy,
      proposedTime: new Date(proposedTime),
      status: "pending",
      createdAt: new Date(),
    };

    const timeSlotResult = await timeSlotsCol.insertOne(timeSlotDoc);

    // Keep match status as "scheduling" since time is just proposed, not confirmed
    // Match status stays "scheduling" until both teams agree

    return NextResponse.json({ 
      success: true, 
      timeSlotId: timeSlotResult.insertedId,
      message: "Time proposed successfully" 
    });
  } catch (error) {
    console.error("Error proposing time:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { timeSlotId, action, respondedBy } = await request.json();
    
    if (!timeSlotId || !action || !respondedBy) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("tundra");
    const timeSlotsCol = db.collection("timeSlots");
    const matchesCol = db.collection("matches");

    // Get time slot
    const timeSlot = await timeSlotsCol.findOne({ _id: new ObjectId(timeSlotId) });
    if (!timeSlot) {
      return NextResponse.json({ error: "Time slot not found" }, { status: 404 });
    }

    // Update time slot status
    await timeSlotsCol.updateOne(
      { _id: new ObjectId(timeSlotId) },
      { $set: { status: action, respondedBy, respondedAt: new Date() } }
    );

    // If accepted, update match to "ready" status since both teams agreed on time
    if (action === "accepted") {
      await matchesCol.updateOne(
        { _id: timeSlot.matchId },
        { 
          $set: { 
            scheduledAt: timeSlot.proposedTime,
            status: "ready"
          } 
        }
      );

      // Reject other pending time slots for this match
      await timeSlotsCol.updateMany(
        { 
          matchId: timeSlot.matchId, 
          _id: { $ne: new ObjectId(timeSlotId) },
          status: "pending"
        },
        { $set: { status: "rejected" } }
      );
    } else if (action === "rejected") {
      // If rejected, check if this was the current scheduled time
      const match = await matchesCol.findOne({ _id: timeSlot.matchId });
      if (match && match.scheduledAt && 
          new Date(match.scheduledAt).getTime() === new Date(timeSlot.proposedTime).getTime()) {
        // Remove scheduled time and reset match to scheduling
        await matchesCol.updateOne(
          { _id: timeSlot.matchId },
          { 
            $set: { 
              status: "scheduling",
              organizer1Approved: false,
              organizer2Approved: false
            },
            $unset: {
              scheduledAt: ""
            }
          }
        );
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Time slot ${action} successfully` 
    });
  } catch (error) {
    console.error("Error responding to time slot:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get("matchId");
    
    if (!matchId) {
      return NextResponse.json({ error: "Match ID required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("tundra");
    const timeSlotsCol = db.collection("timeSlots");

    const timeSlots = await timeSlotsCol.find({ 
      matchId: new ObjectId(matchId) 
    }).sort({ createdAt: -1 }).toArray();

    return NextResponse.json({ timeSlots });
  } catch (error) {
    console.error("Error fetching time slots:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}