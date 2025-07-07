const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI || "mongodb+srv://mach:eqpFFjgOBdZmTCYU@cluster0.bd0tytw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const client = new MongoClient(uri);

const games = ["CS2", "Valorant", "League of Legends", "Dota 2", "Rocket League", "Fortnite"];

async function seed() {
  try {
    await client.connect();
    const db = client.db("tundra");
    const tournamentsCol = db.collection("tournaments");

    // Clear existing data
    await tournamentsCol.deleteMany({});

    // Create tournaments for each game
    const tournaments = games.map(game => ({
      game,
      maxTeams: 16,
      registeredTeams: Math.floor(Math.random() * 8) + 2, // 2-9 teams
      status: "open",
      createdAt: new Date(),
    }));

    // Make one tournament full for testing
    tournaments[0].registeredTeams = 16;
    tournaments[0].status = "full";

    const result = await tournamentsCol.insertMany(tournaments);
    console.log(`✅ Seeded ${result.insertedCount} tournaments`);

    // Display seeded data
    console.log("\n📊 Seeded Tournaments:");
    tournaments.forEach((tournament, index) => {
      console.log(`${index + 1}. ${tournament.game}: ${tournament.registeredTeams}/${tournament.maxTeams} teams (${tournament.status})`);
    });

  } catch (error) {
    console.error("❌ Error seeding database:", error);
  } finally {
    await client.close();
  }
}

seed();