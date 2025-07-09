import { NextResponse } from "next/server";
import { inMemoryDB } from "@/lib/in-memory-db";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    // Try to get MongoDB data first
    const mongoClient = await clientPromise;
    let tournaments = [];
    let allTeams = [];
    
    if (mongoClient) {
      try {
        const db = mongoClient.db("tundra");
        const tournamentsCol = db.collection("tournaments");
        const teamsCol = db.collection("teams");
        
        tournaments = await tournamentsCol.find({}).toArray();
        allTeams = await teamsCol.find({}).toArray();
      } catch (mongoError) {
        console.error("MongoDB error for locations:", mongoError);
        // Fall back to in-memory database
        tournaments = await inMemoryDB.findTournaments();
        allTeams = await inMemoryDB.findTeams();
      }
    } else {
      // Fall back to in-memory database
      tournaments = await inMemoryDB.findTournaments();
      allTeams = await inMemoryDB.findTeams();
    }
    
    // Add teams to tournaments
    const tournamentsWithTeams = tournaments.map(tournament => ({
      ...tournament,
      teams: allTeams
        .filter(team => team.tournamentId === tournament._id.toString())
        .map(team => ({
          name: team.name,
          region: team.region || "North America",
          organizer: team.organizer
        }))
    }));

    // Define region coordinates (you can customize these)
    const regionCoordinates = {
      "North America": { lat: 40.7128, lng: -74.0060, city: "New York" },
      "Europe West": { lat: 52.5200, lng: 13.4050, city: "Berlin" },
      "Asia Pacific": { lat: 35.6762, lng: 139.6503, city: "Tokyo" },
      "South America": { lat: -23.5505, lng: -46.6333, city: "São Paulo" },
      "Oceania": { lat: -33.8688, lng: 151.2093, city: "Sydney" },
      "Middle East": { lat: 25.2048, lng: 55.2708, city: "Dubai" },
      "Europe East": { lat: 55.7558, lng: 37.6176, city: "Moscow" },
      "Africa": { lat: -26.2041, lng: 28.0473, city: "Johannesburg" }
    };

    // Group tournaments by region and add coordinates
    const locationData = tournamentsWithTeams.reduce((acc: any, tournament: any) => {
      // Use tournament region directly, or get from teams if available
      const primaryRegion = tournament.region || 
        (tournament.teams.length > 0 ? tournament.teams[0].region : null) || 
        "North America";

      const coords = (regionCoordinates as any)[primaryRegion] || regionCoordinates["North America"];
      
      const locationKey = `${coords.city}-${tournament.game}`;
      
      if (!acc[locationKey]) {
        acc[locationKey] = {
          id: locationKey,
          name: `${tournament.game} Tournament`,
          game: tournament.game,
          region: primaryRegion,
          city: coords.city,
          lat: coords.lat,
          lng: coords.lng,
          tournaments: [],
          totalTeams: 0,
          status: tournament.status
        };
      }

      acc[locationKey].tournaments.push({
        id: tournament._id,
        registeredTeams: tournament.registeredTeams || tournament.teams?.length || 0,
        maxTeams: tournament.maxTeams || 16,
        status: tournament.status,
        createdAt: tournament.createdAt,
        completedAt: tournament.completedAt
      });

      acc[locationKey].totalTeams += tournament.registeredTeams || tournament.teams?.length || 0;
      
      // Update status priority: active > open > completed
      if (tournament.status === 'active') {
        acc[locationKey].status = 'active';
      } else if (tournament.status === 'open' && acc[locationKey].status !== 'active') {
        acc[locationKey].status = 'open';
      }

      return acc;
    }, {});

    // Convert to array and add scheduled times
    const locations = Object.values(locationData).map((location: any) => ({
      ...location,
      scheduledTime: location.tournaments.find((t: any) => t.status === 'active')?.createdAt || 
                    location.tournaments.find((t: any) => t.status === 'open')?.createdAt ||
                    location.tournaments[0]?.createdAt || new Date(),
      teamCount: location.totalTeams
    }));

    return NextResponse.json(locations);
  } catch (error) {
    console.error("Error fetching tournament locations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}