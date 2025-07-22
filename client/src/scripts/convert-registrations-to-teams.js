const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env' });

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function convertRegistrationsToTeams() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('tundra');
    const tournamentId = '687dbcd33e6c1b61936ee10c'; // Off the Grid tournament
    
    // Get tournament registrations for this tournament
    const registrations = await db.collection('tournamentregistrations').find({
      tournamentId: new ObjectId(tournamentId)
    }).toArray();
    
    console.log(`Found ${registrations.length} registrations for tournament ${tournamentId}`);
    
    if (registrations.length === 0) {
      console.log('No registrations found to convert');
      return;
    }
    
    const teams = [];
    
    for (const registration of registrations) {
      // Get clan info for team name
      const clan = await db.collection('clans').findOne({
        _id: registration.clanId
      });
      
      const teamName = clan ? clan.name : `Team ${registration._id.toString().slice(-6)}`;
      
      // Convert registration to team format
      const team = {
        name: teamName,
        tournamentId: new ObjectId(tournamentId),
        captain: {
          username: registration.selectedPlayers[0]?.displayName || 'Captain',
          walletAddress: registration.selectedPlayers[0]?.walletAddress
        },
        players: registration.selectedPlayers.map(player => ({
          username: player.displayName,
          walletAddress: player.walletAddress,
          role: 'player'
        })),
        status: 'registered',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      teams.push(team);
      console.log(`Converting registration for clan ${clan?.name || 'Unknown'} to team: ${teamName}`);
    }
    
    // Insert teams
    if (teams.length > 0) {
      const result = await db.collection('teams').insertMany(teams);
      console.log(`Successfully created ${result.insertedCount} team documents`);
      
      // Update tournament to have correct team count
      await db.collection('tournaments').updateOne(
        { _id: new ObjectId(tournamentId) },
        { 
          $set: { 
            registeredTeams: teams.length,
            updatedAt: new Date()
          }
        }
      );
      console.log(`Updated tournament with ${teams.length} registered teams`);
    }
    
  } catch (error) {
    console.error('Error converting registrations to teams:', error);
  } finally {
    await client.close();
  }
}

convertRegistrationsToTeams();