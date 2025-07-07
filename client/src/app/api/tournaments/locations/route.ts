import { NextResponse } from "next/server";
import { inMemoryDB } from "@/lib/in-memory-db";
// import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    // Get all tournaments from in-memory database
    const tournaments = await inMemoryDB.findTournaments();
    const allTeams = await inMemoryDB.findTeams();
    
    // Add teams to tournaments
    const tournamentsWithTeams = tournaments.map(tournament => ({
      ...tournament,
      teams: allTeams
        .filter(team => team.tournamentId === tournament._id)
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
    const locationData = tournamentsWithTeams.reduce((acc, tournament) => {
      // Get the most common region from teams in this tournament
      const regionCounts = tournament.teams.reduce((counts, team) => {
        const region = team.region || "Unknown";
        counts[region] = (counts[region] || 0) + 1;
        return counts;
      }, {});

      const primaryRegion = Object.entries(regionCounts).reduce((a, b) => 
        regionCounts[a[0]] > regionCounts[b[0]] ? a : b
      )?.[0] || "North America";

      const coords = regionCoordinates[primaryRegion] || regionCoordinates["North America"];
      
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
        registeredTeams: tournament.registeredTeams,
        maxTeams: tournament.maxTeams,
        status: tournament.status,
        createdAt: tournament.createdAt,
        completedAt: tournament.completedAt
      });

      acc[locationKey].totalTeams += tournament.registeredTeams;
      
      // Update status priority: active > open > completed
      if (tournament.status === 'active') {
        acc[locationKey].status = 'active';
      } else if (tournament.status === 'open' && acc[locationKey].status !== 'active') {
        acc[locationKey].status = 'open';
      }

      return acc;
    }, {});

    // Convert to array and add scheduled times
    const locations = Object.values(locationData).map(location => ({
      ...location,
      scheduledTime: location.tournaments.find(t => t.status === 'active')?.createdAt || 
                    location.tournaments.find(t => t.status === 'open')?.createdAt ||
                    location.tournaments[0]?.createdAt || new Date(),
      teamCount: location.totalTeams
    }));

    return NextResponse.json(locations);
  } catch (error) {
    console.error("Error fetching tournament locations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}