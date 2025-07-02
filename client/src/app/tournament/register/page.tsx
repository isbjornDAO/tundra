'use client';

import { useState } from 'react';
import { useTournaments } from '@/hooks/use-tournaments';
import { useTeam1Auth } from '@/hooks/use-team1-auth';
import { RootLayout } from '@/components/root-layout';
import { GAMES, REGIONS, type Game, type Region, type Player, type TournamentSummary } from '@/types/tournament';

// Mock data for available tournaments
// const mockTournaments = [
//   { game: 'CS2', registeredTeams: 8, maxTeams: 12, status: 'open' },
//   { game: 'Valorant', registeredTeams: 12, maxTeams: 12, status: 'full' },
//   { game: 'League of Legends', registeredTeams: 5, maxTeams: 12, status: 'open' },
//   { game: 'Dota 2', registeredTeams: 3, maxTeams: 12, status: 'open' },
//   { game: 'Rocket League', registeredTeams: 12, maxTeams: 12, status: 'full' },
//   { game: 'Fortnite', registeredTeams: 1, maxTeams: 12, status: 'open' },
// ];

export default function RegisterTournament() {
  const { data: tournaments = [], isLoading, error } = useTournaments();
  const { address } = useTeam1Auth();
  const [selectedGame, setSelectedGame] = useState<Game | ''>('');
  const [teamName, setTeamName] = useState('');
  const [teamRegion, setTeamRegion] = useState<Region | ''>('');
  const [players, setPlayers] = useState<Player[]>(
    Array(5).fill(null).map((_, i) => ({ id: `${Date.now()}-${i}`, name: '', steamId: '' }))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updatePlayer = (playerIndex: number, field: 'name' | 'steamId', value: string) => {
    const updatedPlayers = [...players];
    updatedPlayers[playerIndex][field] = value;
    setPlayers(updatedPlayers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGame || !teamName || !teamRegion) return;

    const selectedTournament = tournaments.find(t => t.gameName === selectedGame);
    if (!selectedTournament || selectedTournament.status !== 'open') {
      alert('Tournament is not available for registration');
      return;
    }

    setIsSubmitting(true);

    // TODO: Implement actual submission to backend/smart contract
    console.log('Registering team:', {
      game: selectedGame,
      teamName,
      region: teamRegion,
      organizer: address,
      players: players.filter(p => p.name.trim() !== '')
    });

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    alert(`Team "${teamName}" successfully registered for ${selectedGame} tournament!`);
    setIsSubmitting(false);
  };

  const selectedTournament = tournaments.find(t => t.gameName === selectedGame);

  return (
    <RootLayout title="Register for Tournament">
      {/* Important Information */}
      <div className="card-compact bg-gray-500/5 border-gray-500/20 mb-8">
        <h4 className="text-gray-300 font-medium mb-3">Important Information</h4>
        <ul className="text-body text-sm space-y-1">
          <li>• Once 12 teams register for a game, the tournament bracket opens</li>
          <li>• You will coordinate match times with other Team1 organizers</li>
          <li>• Matches are played on the Avax Gaming Discord server</li>
          <li>• Registration spots are first-come, first-served</li>
        </ul>
      </div>

      {/* Tournament Overview */}
      <div className="section">
        <h2 className="heading-md mb-6">Available Tournaments</h2>
        {isLoading ? (
          <div>Loading tournaments...</div>
        ) : error ? (
          <div>Error loading tournaments</div>
        ) : (
              <div className="grid-3">
                {tournaments.map((tournament) => (
                  <div
                    key={tournament.gameName}
                    onClick={() => tournament.status === 'open' && setSelectedGame(tournament.gameName as Game)}
                    className={`card-interactive ${selectedGame === tournament.gameName ? 'card-selected' : ''
                      } ${tournament.status !== 'open' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="heading-sm">{tournament.gameName}</h3>
                      <span className={tournament.status === 'open' ? 'status-open' : 'status-full'}>
                        {tournament.status === 'open' ? 'OPEN' : 'FULL'}
                      </span>
                    </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-body">Teams</span>
                  <span className="text-white font-medium">
                    {tournament.registeredTeams}/{tournament.maxTeams}
                  </span>
                </div>

                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${(tournament.registeredTeams / tournament.maxTeams) * 100}%` }}
                  ></div>
                </div>

                <div className="flex justify-between text-xs">
                  <span className="text-muted">
                    {tournament.maxTeams - tournament.registeredTeams} slots left
                  </span>
                  <span className="text-muted font-medium">
                    {tournament.registeredTeams >= 10 ? 'Almost Full!' : 'Available'}
                  </span>
                </div>

                {tournament.status === 'open' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedGame(tournament.gameName as Game);
                      document.getElementById('registration-form')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="btn-primary btn-sm w-full"
                  >
                    Select Tournament
                  </button>
                )}

                {tournament.registeredTeams === 12 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                            window.location.href = `/tournament/bracket?game=${tournament.gameName}`;
                    }}
                    className="btn-secondary btn-sm w-full"
                  >
                    View Bracket
                  </button>
                )}
              </div>
                  </div>
                ))}
          </div>
        )}
        </div>

      {/* Registration Form */}
      <div className="card" id="registration-form">
        <h2 className="heading-md mb-8">Team Registration</h2>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Game</label>
              <select
                value={selectedGame}
                onChange={(e) => setSelectedGame(e.target.value as Game)}
                className="input-field"
                required
              >
                <option value="">Select game...</option>
                {GAMES.map(game => {
                  const tournament = tournaments.find(t => t.gameName === game);
                  const isAvailable = tournament?.status === 'open';
                  return (
                    <option
                      key={game}
                      value={game}
                      className="text-black"
                      disabled={!isAvailable}
                    >
                      {game} {!isAvailable ? '(FULL)' : `(${tournament?.registeredTeams}/${tournament?.maxTeams})`}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Team Region</label>
              <select
                value={teamRegion}
                onChange={(e) => setTeamRegion(e.target.value as Region)}
                className="input-field"
                required
              >
                <option value="">Select region...</option>
                {REGIONS.map(region => (
                  <option key={region} value={region} className="text-black">
                    {region}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedTournament && (
            <div className="card-compact bg-blue-500/5 border-blue-500/20">
              <h4 className="text-blue-300 font-medium mb-2">Tournament Status</h4>
              <p className="text-body text-sm">
                {selectedTournament.registeredTeams}/{selectedTournament.maxTeams} teams registered.{' '}
                {selectedTournament.maxTeams - selectedTournament.registeredTeams} slots remaining.
                {selectedTournament.registeredTeams === 11 && (
                  <span className="text-gray-300 font-medium"> Final slot available!</span>
                )}
              </p>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Team Name</label>
            <input
              type="text"
              placeholder="Enter your team name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Team Roster (5 Players)</label>
            <div className="grid-2 lg:grid-cols-3">
              {players.map((player, playerIndex) => (
                <div key={player.id} className="card-compact">
                  <h4 className="text-white font-medium mb-3 text-sm">Player {playerIndex + 1}</h4>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Player name"
                      value={player.name}
                      onChange={(e) => updatePlayer(playerIndex, 'name', e.target.value)}
                      className="input-field"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Steam ID (optional)"
                      value={player.steamId}
                      onChange={(e) => updatePlayer(playerIndex, 'steamId', e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>


          <div className="flex justify-center">
            <button
              type="submit"
              disabled={isSubmitting || !selectedGame || !teamName || !teamRegion || selectedTournament?.status !== 'open'}
              className="btn btn-primary"
            >
              {isSubmitting ? 'Registering Team...' : 'Register Team for Tournament'}
            </button>
          </div>
        </form>
      </div>
    </RootLayout>
  );
}