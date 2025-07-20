const { MongoClient } = require('mongodb');
require('dotenv').config();

// Use environment variable for MongoDB URI
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tundra';

if (!process.env.MONGODB_URI) {
  console.warn('⚠️  MONGODB_URI environment variable not set. Using local fallback.');
  console.warn('   Please set MONGODB_URI in your .env file for production use.');
}

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