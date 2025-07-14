import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(request: Request) {
  try {
    const { matchId, approvedBy } = await request.json();
    
    if (!matchId || !approvedBy) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("tundra");
    const matchesCol = db.collection("matches");
    const timeSlotsCol = db.collection("timeSlots");

    // Get match
    const match = await matchesCol.findOne({ _id: new ObjectId(matchId) });
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    // Verify approver is one of the team organizers
    const isTeam1Leader = match.team1?.organizer?.toLowerCase() === approvedBy.toLowerCase();
    const isTeam2Leader = match.team2?.organizer?.toLowerCase() === approvedBy.toLowerCase();
    
    if (!isTeam1Leader && !isTeam2Leader) {
      return NextResponse.json({ error: "Unauthorized to approve match time" }, { status: 403 });
    }

    // Find the most recent pending time slot (the one being approved)
    const pendingTimeSlot = await timeSlotsCol.findOne({ 
      matchId: new ObjectId(matchId),
      status: "pending",
      proposedBy: { $ne: approvedBy.toLowerCase() } // Not proposed by the approver
    }, { sort: { createdAt: -1 } });

    if (!pendingTimeSlot) {
      return NextResponse.json({ error: "No pending time proposal found to approve" }, { status: 404 });
    }

    // Accept the time slot
    await timeSlotsCol.updateOne(
      { _id: pendingTimeSlot._id },
      { $set: { status: "accepted", respondedBy: approvedBy, respondedAt: new Date() } }
    );

    // Reject all other pending time slots for this match
    await timeSlotsCol.updateMany(
      { 
        matchId: new ObjectId(matchId), 
        _id: { $ne: pendingTimeSlot._id },
        status: "pending"
      },
      { $set: { status: "rejected" } }
    );

    // Update match with scheduled time, status, and approval flags
    const updateData = {
      scheduledTime: pendingTimeSlot.proposedTime,
      status: "scheduled",
      updatedAt: new Date()
    };

    // Update approval flags based on who proposed and who approved
    if (isTeam1Leader) {
      updateData.organizer1Approved = true;
      // If team1 is approving, then team2 must have proposed (and is implicitly approved)
      updateData.organizer2Approved = true;
    } else if (isTeam2Leader) {
      updateData.organizer2Approved = true;
      // If team2 is approving, then team1 must have proposed (and is implicitly approved)
      updateData.organizer1Approved = true;
    }

    await matchesCol.updateOne(
      { _id: new ObjectId(matchId) },
      { $set: updateData }
    );

    return NextResponse.json({ 
      success: true, 
      message: "Time approved successfully" 
    });
  } catch (error) {
    console.error("Error approving time:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}