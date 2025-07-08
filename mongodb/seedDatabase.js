const { MongoClient } = require("mongodb");

const uri =
  "mongodb+srv://<user>:<pass>@cluster0.bd0tytw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"; 

const client = new MongoClient(uri);

const mockTournaments = [
  { game: "CS2", registeredTeams: 8, maxTeams: 12, status: "open" },
  { game: "Valorant", registeredTeams: 12, maxTeams: 12, status: "full" },
  {
    game: "League of Legends",
    registeredTeams: 5,
    maxTeams: 12,
    status: "open",
  },
  { game: "Dota 2", registeredTeams: 3, maxTeams: 12, status: "open" },
  { game: "Rocket League", registeredTeams: 12, maxTeams: 12, status: "full" },
  { game: "Fortnite", registeredTeams: 1, maxTeams: 12, status: "open" },
];

const mockGameData = {
  CS2: {
    teams: [
      {
        id: "1",
        name: "NA Legends",
        organizer: "0x123...",
        region: "North America",
      },
      {
        id: "2",
        name: "EU Titans",
        organizer: "0x456...",
        region: "Europe West",
      },
      {
        id: "3",
        name: "APAC Dragons",
        organizer: "0x789...",
        region: "Asia Pacific",
      },
      {
        id: "4",
        name: "SA Warriors",
        organizer: "0xabc...",
        region: "South America",
      },
      {
        id: "5",
        name: "ME Falcons",
        organizer: "0xdef...",
        region: "Middle East",
      },
      { id: "6", name: "OCE Sharks", organizer: "0x111...", region: "Oceania" },
      {
        id: "7",
        name: "Africa Lions",
        organizer: "0x222...",
        region: "Africa",
      },
      {
        id: "8",
        name: "CA Wolves",
        organizer: "0x333...",
        region: "Central Asia",
      },
      {
        id: "9",
        name: "SEA Eagles",
        organizer: "0x444...",
        region: "Southeast Asia",
      },
      {
        id: "10",
        name: "Caribbean Heat",
        organizer: "0x555...",
        region: "Caribbean",
      },
      {
        id: "11",
        name: "Nordic Frost",
        organizer: "0x666...",
        region: "Nordic",
      },
      {
        id: "12",
        name: "EU East Storm",
        organizer: "0x777...",
        region: "Europe East",
      },
    ],
    status: "active",
  },
  Valorant: {
    teams: [
      {
        id: "1",
        name: "Valorant Team 1",
        organizer: "0x123...",
        region: "North America",
      },
      {
        id: "2",
        name: "Valorant Team 2",
        organizer: "0x456...",
        region: "Europe West",
      },
      {
        id: "3",
        name: "Valorant Team 3",
        organizer: "0x789...",
        region: "Asia Pacific",
      },
      {
        id: "4",
        name: "Valorant Team 4",
        organizer: "0xabc...",
        region: "South America",
      },
      {
        id: "5",
        name: "Valorant Team 5",
        organizer: "0xdef...",
        region: "Middle East",
      },
      {
        id: "6",
        name: "Valorant Team 6",
        organizer: "0x111...",
        region: "Oceania",
      },
      {
        id: "7",
        name: "Valorant Team 7",
        organizer: "0x222...",
        region: "Africa",
      },
      {
        id: "8",
        name: "Valorant Team 8",
        organizer: "0x333...",
        region: "Central Asia",
      },
      {
        id: "9",
        name: "Valorant Team 9",
        organizer: "0x444...",
        region: "Southeast Asia",
      },
      {
        id: "10",
        name: "Valorant Team 10",
        organizer: "0x555...",
        region: "Caribbean",
      },
      {
        id: "11",
        name: "Valorant Team 11",
        organizer: "0x666...",
        region: "Nordic",
      },
      {
        id: "12",
        name: "Valorant Team 12",
        organizer: "0x777...",
        region: "Europe East",
      },
    ],
    status: "active",
  },
};

async function seed() {
  try {
    await client.connect();
    const db = client.db("tundra");
    const gamesCol = db.collection("games");
    const teamsCol = db.collection("teams");
    const tournamentsCol = db.collection("tournaments");

    await gamesCol.deleteMany({});
    await teamsCol.deleteMany({});
    await tournamentsCol.deleteMany({});

    // Insert games
    const gameDocs = Object.entries(mockGameData).map(([name, data]) => ({
      name,
      status: data.status,
    }));
    const gameInsertResult = await gamesCol.insertMany(gameDocs);

    // Insert teams and keep track of their ObjectIds
    let teamDocs = [];
    let gameNameToId = {};
    Object.entries(mockGameData).forEach(([gameName, data], idx) => {
      const gameId = gameInsertResult.insertedIds[idx];
      gameNameToId[gameName] = gameId;
      data.teams.forEach((team) => {
        teamDocs.push({
          ...team,
          gameId,
        });
      });
    });
    const teamInsertResult = await teamsCol.insertMany(teamDocs);

    // Insert tournaments, linking to gameId and teamIds
    let teamNameToId = {};
    teamDocs.forEach((team, idx) => {
      teamNameToId[team.name] = teamInsertResult.insertedIds[idx];
    });

    const tournamentDocs = mockTournaments.map((t) => {
      // Find all teams for this game
      const gameId = gameNameToId[t.game];
      const teamIds = teamDocs
        .filter((team) => String(team.gameId) === String(gameId))
        .map((team) => teamNameToId[team.name]);
      return {
        ...t,
        gameId,
        teamIds,
      };
    });

    await tournamentsCol.insertMany(tournamentDocs);

    console.log("Games, teams, and tournaments seeded and linked!");
  } finally {
    await client.close();
  }
}

seed();
