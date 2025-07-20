'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { WagmiGuard } from '@/components/WagmiGuard';
import { useTeam1Auth } from '@/hooks/useTeam1Auth';
import { useTournaments, useBracket, useMatches } from '@/hooks/useTournaments';

const GAMES = ['Off the Grid', 'Shatterline', 'Cozyverse', 'Rocket League', 'Fortnite', 'Apex Legends', 'Call of Duty'];

interface Match {
  _id: string;
  round: string;
  team1: { name: string; organizer: string };
  team2: { name: string; organizer: string };
  scheduledTime?: string;
  status: 'pending' | 'scheduled' | 'completed';
  timeProposals?: Array<{
    proposedBy: string;
    time: string;
    status: 'pending' | 'approved' | 'rejected';
  }>;
  results?: {
    team1Score: number;
    team2Score: number;
    submittedBy: string[];
  };
}

interface Tournament {
  _id: string;
  game: string;
  status: string;
  registeredTeams: number;
  maxTeams: number;
  bracketId?: string;
}

function TournamentBracketsContent() {
  const [mounted, setMounted] = useState(false);
  const { address } = useTeam1Auth();
  const searchParams = useSearchParams();
  const gameParam = searchParams.get('game');
  const [selectedGame, setSelectedGame] = useState(gameParam || 'Off the Grid');
  const [submitting, setSubmitting] = useState(false);

  const { data: tournamentsData, isLoading: tournamentsLoading } = useTournaments();
  
  // Get current tournament
  const getCurrentTournament = (): Tournament | undefined => {
    const tournaments = tournamentsData?.tournaments || [];
    return tournaments.find(t => 
      t.game === selectedGame && (t.status === 'active' || t.status === 'full' || t.status === 'open')
    ) as Tournament | undefined;
  };
  
  const currentTournament = getCurrentTournament();
  const { data: matchesData } = useMatches(currentTournament?.bracketId || '');
  const matches = (matchesData?.matches || []) as Match[];

  useEffect(() => {
    setMounted(true);
  }, []);

  // Generate bracket function
  const handleGenerateBracket = async () => {
    if (!currentTournament) return;
    
    setSubmitting(true);
    try {
      const response = await fetch('/api/tournaments/generate-bracket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: currentTournament._id })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        window.location.reload();
      } else {
        if (data.bracketExists) {
          alert('Bracket already exists for this tournament! Refreshing page to show it.');
          window.location.reload();
        } else {
          alert(data.error || 'Failed to generate bracket');
        }
      }
    } catch (error) {
      console.error('Error generating bracket:', error);
      alert('Error generating bracket');
    } finally {
      setSubmitting(false);
    }
  };

  // Propose time function
  const handleProposeTime = async (matchId: string, time: string) => {
    if (!address || !time) return;
    
    setSubmitting(true);
    try {
      const response = await fetch('/api/tournaments/matches/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          proposedTime: time,
          proposedBy: address
        })
      });
      
      if (response.ok) {
        window.location.reload();
      } else {
        alert('Failed to propose time');
      }
    } catch (error) {
      console.error('Error proposing time:', error);
      alert('Failed to propose time');
    } finally {
      setSubmitting(false);
    }
  };

  // Approve time function
  const handleApproveTime = async (matchId: string) => {
    if (!address) return;
    
    setSubmitting(true);
    try {
      const response = await fetch('/api/tournaments/matches/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          approvedBy: address
        })
      });
      
      if (response.ok) {
        window.location.reload();
      } else {
        alert('Failed to approve time');
      }
    } catch (error) {
      console.error('Error approving time:', error);
      alert('Failed to approve time');
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted || tournamentsLoading) {
    return (
      <WagmiGuard>
        <Layout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-lg text-white">Loading...</div>
          </div>
        </Layout>
      </WagmiGuard>
    );
  }

  const tournaments = tournamentsData?.tournaments || [];

  return (
    <WagmiGuard>
      <Layout>
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">Tournament Brackets</h1>
            <p className="text-gray-400">View brackets, coordinate match times, and track tournament progress</p>
          </div>

          {/* Game Selection */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Select Game</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {GAMES.map((game) => {
                const tournament = tournaments.find(t => t.game === game);
                const isAvailable = tournament && (tournament.status === 'active' || tournament.status === 'full' || tournament.status === 'open');
                
                return (
                  <button
                    key={game}
                    onClick={() => isAvailable && setSelectedGame(game)}
                    disabled={!isAvailable}
                    className={`p-4 rounded-lg border transition-all text-center ${
                      selectedGame === game 
                        ? 'border-blue-500 bg-blue-500/20 text-blue-400' 
                        : isAvailable
                        ? 'border-white/20 bg-white/5 hover:border-white/40 text-white'
                        : 'border-white/10 bg-white/5 opacity-50 cursor-not-allowed text-gray-500'
                    }`}
                  >
                    <div className="font-medium mb-1">{game}</div>
                    <div className="text-xs">
                      {isAvailable ? (
                        <span className="text-green-400">
                          {tournament.registeredTeams}/{tournament.maxTeams} Teams
                        </span>
                      ) : (
                        <span className="text-gray-500">No Tournament</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {!currentTournament ? (
            /* No Tournament State */
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🏆</div>
              <h3 className="text-2xl font-bold text-white mb-2">No Active Tournament</h3>
              <p className="text-gray-400 mb-8">There's currently no active tournament for {selectedGame}</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Tournament Info */}
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">{selectedGame} Tournament</h2>
                    <div className="flex items-center gap-6 text-sm text-gray-300">
                      <span>Single Elimination</span>
                      <span>{currentTournament.registeredTeams}/{currentTournament.maxTeams} Teams</span>
                      <span className="capitalize">{currentTournament.status}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl mb-1">🏆</div>
                    <div className="text-xl font-bold text-yellow-400">$5,000</div>
                    <div className="text-xs text-gray-400">Prize Pool</div>
                  </div>
                </div>
              </div>

              {/* Tournament Bracket */}
              <div className="space-y-8">
                <h3 className="text-xl font-semibold text-white">Tournament Bracket</h3>
                
                {matches.length === 0 ? (
                  <div className="text-center py-8 bg-white/5 rounded-lg">
                    {currentTournament?.bracketId ? (
                      <div>
                        <div className="text-blue-400 mb-4">🔄 Loading bracket...</div>
                        <div className="text-gray-400 text-sm">Bracket exists but matches are loading</div>
                        <button
                          onClick={() => window.location.reload()}
                          className="mt-4 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                          Refresh Page
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="text-yellow-400 mb-4">No bracket generated yet</div>
                        {currentTournament && currentTournament.registeredTeams >= currentTournament.maxTeams ? (
                          <button
                            onClick={handleGenerateBracket}
                            disabled={submitting}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {submitting ? 'Generating...' : 'Generate Bracket'}
                          </button>
                        ) : (
                          <div className="text-gray-400">
                            Need {currentTournament?.maxTeams || 8} teams to generate bracket 
                            (currently {currentTournament?.registeredTeams || 0}/{currentTournament?.maxTeams || 8})
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Clean Bracket Display */
                  <div className="space-y-6">
                    {['quarter', 'semi', 'final'].map(round => {
                      const roundMatches = matches.filter(match => match.round === round);
                      if (roundMatches.length === 0) return null;

                      return (
                        <div key={round} className="bg-white/5 rounded-lg p-6">
                          <h4 className="text-lg font-semibold text-white mb-4 capitalize">
                            {round === 'quarter' ? 'Quarter Finals' : round === 'semi' ? 'Semi Finals' : 'Final'}
                          </h4>
                          
                          <div className="space-y-4">
                            {roundMatches.map((match) => (
                              <div key={match._id} className="bg-black/20 border border-white/10 rounded-lg p-4">
                                {/* Match Teams */}
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center space-x-4">
                                    <div className="text-white font-medium">{match.team1.name}</div>
                                    <div className="text-gray-400">vs</div>
                                    <div className="text-white font-medium">{match.team2.name}</div>
                                  </div>
                                  
                                  {/* Match Status */}
                                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    match.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                    match.status === 'scheduled' ? 'bg-blue-500/20 text-blue-400' :
                                    'bg-yellow-500/20 text-yellow-400'
                                  }`}>
                                    {match.status === 'completed' ? 'Completed' :
                                     match.status === 'scheduled' ? 'Scheduled' :
                                     'Pending'}
                                  </div>
                                </div>

                                {/* Match Details */}
                                {match.scheduledTime && (
                                  <div className="text-sm text-gray-300 mb-2">
                                    Scheduled: {new Date(match.scheduledTime).toLocaleString()}
                                  </div>
                                )}

                                {/* Time Coordination */}
                                {match.status === 'pending' && (address === match.team1.organizer || address === match.team2.organizer) && (
                                  <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded">
                                    <div className="text-blue-400 text-sm font-medium mb-2">Coordinate Match Time</div>
                                    <div className="flex gap-2">
                                      <input
                                        type="datetime-local"
                                        className="bg-black/20 border border-white/20 rounded px-3 py-1 text-white text-sm"
                                        onChange={(e) => {
                                          if (e.target.value) {
                                            handleProposeTime(match._id, e.target.value);
                                          }
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* Results Entry */}
                                {match.status === 'completed' && match.results && (
                                  <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded">
                                    <div className="text-green-400 text-sm font-medium mb-2">Match Results</div>
                                    <div className="text-white text-sm">
                                      {match.team1.name}: {match.results.team1Score} - {match.team2.name}: {match.results.team2Score}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Layout>
    </WagmiGuard>
  );
}

export default function TournamentBracketsPage() {
  return (
    <div>
      <TournamentBracketsContent />
    </div>
  );
}
