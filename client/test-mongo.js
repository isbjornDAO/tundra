const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://icebear:sBl63aOuw5R3RjiC@cluster0.ob8odne.mongodb.net/tundra?retryWrites=true&w=majority&appName=Cluster0";

async function testConnection() {
  try {
    console.log("Connecting to MongoDB...");
    const client = new MongoClient(uri);
    await client.connect();
    console.log("Connected successfully!");
    
    const db = client.db("tundra");
    const tournamentsCol = db.collection("tournaments");
    
    // Test inserting a tournament
    const result = await tournamentsCol.insertOne({
      game: "CS2",
      maxTeams: 16,
      registeredTeams: 0,
      status: "open",
      createdAt: new Date(),
    });
    
    console.log("Tournament created with ID:", result.insertedId);
    
    // Test fetching tournaments
    const tournaments = await tournamentsCol.find({}).toArray();
    console.log("Found tournaments:", tournaments.length);
    
    await client.close();
    console.log("Connection closed");
  } catch (error) {
    console.error("Error:", error);
  }
}

testConnection();