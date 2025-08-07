'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTeam1Auth } from '@/hooks/useTeam1Auth';
import { SUPPORTED_GAMES } from '@/lib/constants';

interface Match {
  _id: string;
  round: string;
  clan1: {
    _id: string;
    name: string;
    tag: string;
    leader: string;
  } | null;
  clan2: {
    _id: string;
    name: string;
    tag: string;
    leader: string;
  } | null;
  scheduledAt?: string;
  completedAt?: string;
  status: 'scheduling' | 'ready' | 'active' | 'completed';
  score?: {
    clan1Score: number;
    clan2Score: number;
  };
  rosters?: {
    clan1: Array<{ userId: string; username: string; confirmed: boolean }>;
    clan2: Array<{ userId: string; username: string; confirmed: boolean }>;
  };
  playerPerformances?: Array<{
    userId: { _id: string; username: string };
    clanId: string;
    kills: number;
    deaths: number;
    assists: number;
    score: number;
    mvp: boolean;
  }>;
}

interface Tournament {
  _id: string;
  game: string;
  status: 'active' | 'open' | 'completed' | 'full';
  registeredTeams: number;
  maxTeams: number;
  bracketId?: string;
  prizePool?: number;
}

const Bracket = () => {
  const { address } = useTeam1Auth();
  const [selectedGame, setSelectedGame] = useState('Off the Grid');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    if (tournaments.length > 0) {
      fetchAllMatches();
      if (selectedGame) {
        fetchMatches();
      }
    }
  }, [selectedGame, tournaments]);

  // Auto-refresh matches every 30 seconds
  useEffect(() => {
    if (tournaments.length > 0) {
      const interval = setInterval(async () => {
        const allTournamentMatches: Match[] = [];
        for (const tournament of tournaments) {
          if (tournament.bracketId && tournament.status !== 'completed') {
            try {
              const response = await fetch(`/api/tournaments/matches?bracketId=${tournament.bracketId}`);
              const data = await response.json();
              if (data.matches) {
                allTournamentMatches.push(...data.matches);
              }
            } catch (error) {
              console.error(`Error fetching matches for tournament ${tournament.game}:`, error);
            }
          }
        }
        setAllMatches(allTournamentMatches);

        if (selectedGame) {
          const currentTournament = tournaments.find(t =>
            t.game === selectedGame &&
            (t.status === 'active' || t.status === 'full' || t.status === 'open')
          );

          if (currentTournament?.bracketId) {
            try {
              const response = await fetch(`/api/tournaments/matches?bracketId=${currentTournament.bracketId}`);
              const data = await response.json();
              setMatches(data.matches || []);
            } catch (error) {
              console.error('Error fetching matches:', error);
            }
          }
        }
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [selectedGame, tournaments]);

  const fetchTournaments = async () => {
    try {
      const response = await fetch('/api/tournaments/mongo');
      const data = await response.json();
      setTournaments(data.tournaments || []);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllMatches = async () => {
    const allTournamentMatches: Match[] = [];

    for (const tournament of tournaments) {
      if (tournament.bracketId && tournament.status !== 'completed') {
        try {
          const response = await fetch(`/api/tournaments/matches?bracketId=${tournament.bracketId}`);
          const data = await response.json();
          if (data.matches) {
            allTournamentMatches.push(...data.matches);
          }
        } catch (error) {
          console.error(`Error fetching matches for tournament ${tournament.game}:`, error);
        }
      }
    }

    setAllMatches(allTournamentMatches);
  };

  const getCurrentTournament = useMemo((): Tournament | undefined => {
    return tournaments.find(t =>
      t.game === selectedGame &&
      (t.status === 'active' || t.status === 'full' || t.status === 'open')
    );
  }, [tournaments, selectedGame]);

  const fetchMatches = useCallback(async () => {
    if (!getCurrentTournament?.bracketId) {
      setMatches([]);
      return;
    }

    try {
      const response = await fetch(`/api/tournaments/matches?bracketId=${getCurrentTournament.bracketId}`);
      const data = await response.json();
      setMatches(data.matches || []);
    } catch (error) {
      console.error('Error fetching matches:', error);
      setMatches([]);
    }
  }, [getCurrentTournament]);

  const handleGenerateBracket = async () => {
    if (!getCurrentTournament) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/tournaments/generate-bracket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: getCurrentTournament._id })
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

  return (
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Current Tournament Brackets</h1>
          <p className="text-gray-400">Live tournament progress with detailed match information and statistics</p>
        </div>

        {/* Tournament Overview */}
        <div className="mb-8">
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-black/40 border border-white/10 rounded-xl p-8 text-center">
              <div className="text-4xl font-bold text-white mb-2">
                {allMatches.filter(m => m.status === 'ready' || m.status === 'scheduling').length}
              </div>
              <div className="text-gray-400 text-sm">Pending Matches</div>
            </div>
            <div className="bg-black/40 border border-white/10 rounded-xl p-8 text-center">
              <div className="text-4xl font-bold text-red-400 mb-2">
                {allMatches.filter(m => m.status === 'active').length}
              </div>
              <div className="text-gray-400 text-sm">Live Matches</div>
            </div>
            <div className="bg-black/40 border border-white/10 rounded-xl p-8 text-center">
              <div className="text-4xl font-bold text-white mb-2">
                {tournaments.reduce((total, tournament) => {
                  if (tournament.status === 'active' || tournament.status === 'full' || tournament.status === 'open') {
                    return total + tournament.registeredTeams;
                  }
                  return total;
                }, 0)}
              </div>
              <div className="text-gray-400 text-sm">Teams Registered</div>
            </div>
          </div>
        </div>

        {/* Game Selection */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Select Game</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {SUPPORTED_GAMES.map((game: string) => {
              const tournament = tournaments.find(t => t.game === game && t.status !== 'completed');
              const hasActiveTournament = tournament &&
                (tournament.status === 'active' || tournament.status === 'full' || tournament.status === 'open');

              return (
                <button
                  key={game}
                  onClick={() => setSelectedGame(game)}
                  className={`p-4 rounded-lg border transition-all text-center ${selectedGame === game
                      ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                      : hasActiveTournament
                        ? 'border-white/20 bg-white/5 hover:border-white/40 text-white'
                        : 'border-white/10 bg-white/5 hover:border-white/20 text-gray-400'
                    }`}
                >
                  <div className="font-medium mb-1">{game}</div>
                  <div className="text-xs">
                    {hasActiveTournament ? (
                      <span className="text-green-400">
                        {tournament.registeredTeams}/{tournament.maxTeams} Teams
                      </span>
                    ) : tournament ? (
                      <span className="text-yellow-400">
                        {tournament.status} - {tournament.registeredTeams}/{tournament.maxTeams}
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

        {!getCurrentTournament ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-2xl font-bold text-white mb-2">No Active Tournament</h3>
            <p className="text-gray-400 mb-8">There's currently no active tournament for {selectedGame}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Tournament Info Card */}
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">{selectedGame} Tournament</h2>
                  <div className="flex items-center gap-6 text-gray-300">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                      Single Elimination
                    </span>
                    <span>{getCurrentTournament.registeredTeams}/{getCurrentTournament.maxTeams} Teams</span>
                    <span className="capitalize px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                      {getCurrentTournament.status}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-4xl mb-2">🏆</div>
                  <div className="text-2xl font-bold text-yellow-400">${(getCurrentTournament.prizePool || 5000).toLocaleString()}</div>
                  <div className="text-sm text-gray-400">Prize Pool</div>
                </div>
              </div>

              {matches.length > 0 && (
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{matches.filter(m => m.status === 'completed').length}</div>
                    <div className="text-xs text-gray-400">Matches Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{matches.filter(m => m.status === 'active').length}</div>
                    <div className="text-xs text-gray-400">Live Matches</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400">{matches.filter(m => m.status === 'ready' || m.status === 'scheduling').length}</div>
                    <div className="text-xs text-gray-400">Pending Matches</div>
                  </div>
                </div>
              )}
            </div>

            {/* Tournament Bracket */}
            <div className="space-y-8">
              <h3 className="text-2xl font-semibold text-white flex items-center gap-3">
                <span className="text-orange-400">🥊</span>
                Tournament Bracket
              </h3>

              {matches.length === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-xl">
                  {getCurrentTournament?.bracketId ? (
                    <div>
                      <div className="text-blue-400 mb-4 text-lg">🔄 Loading bracket...</div>
                      <div className="text-gray-400 text-sm mb-4">Bracket ID: {getCurrentTournament.bracketId}</div>
                      <button
                        onClick={() => window.location.reload()}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
                      >
                        Refresh Page
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="text-yellow-400 mb-4 text-lg">⚡ Ready to Generate Bracket</div>
                      {getCurrentTournament && getCurrentTournament.registeredTeams >= getCurrentTournament.maxTeams ? (
                        <button
                          onClick={handleGenerateBracket}
                          disabled={submitting}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg transition-colors disabled:opacity-50 text-lg font-medium"
                        >
                          {submitting ? 'Generating...' : 'Generate Bracket'}
                        </button>
                      ) : (
                        <div className="text-gray-400">
                          Need {getCurrentTournament?.maxTeams || 8} teams to generate bracket
                          (currently {getCurrentTournament?.registeredTeams || 0}/{getCurrentTournament?.maxTeams || 8})
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-8">
                  {['quarter', 'semi', 'final'].map(round => {
                    const roundMatches = matches.filter(match => match.round === round);
                    if (roundMatches.length === 0) return null;

                    const completedInRound = roundMatches.filter(m => m.status === 'completed').length;
                    const liveInRound = roundMatches.filter(m => m.status === 'active').length;

                    return (
                      <div key={round} className="bg-white/5 rounded-xl p-6 border border-white/10">
                        <div className="flex items-center justify-between mb-6">
                          <h4 className="text-xl font-bold text-white flex items-center gap-3">
                            <span className="text-2xl">
                              {round === 'quarter' ? '🥉' : round === 'semi' ? '🥈' : '🥇'}
                            </span>
                            {round === 'quarter' ? 'Quarter Finals' : round === 'semi' ? 'Semi Finals' : 'Final'}
                          </h4>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-green-400">{completedInRound} Completed</span>
                            {liveInRound > 0 && <span className="text-red-400">{liveInRound} Live</span>}
                            <span className="text-gray-400">{roundMatches.length} Total</span>
                          </div>
                        </div>

                        <div className="space-y-6">
                          {roundMatches.map((match) => {
                            const isUserMatch = (match.clan1?.leader === address || match.clan2?.leader === address);

                            return (
                              <div key={match._id} className={`border rounded-xl p-6 transition-all ${match.status === 'completed' ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30' :
                                  match.status === 'active' ? 'bg-gradient-to-br from-red-500/10 to-pink-500/10 border-red-500/30 animate-pulse' :
                                    match.status === 'ready' ? 'bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30' :
                                      'bg-black/20 border-white/10'
                                }`}>
                                {/* Match Header */}
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-6">
                                    <div className="text-center">
                                      <div className="font-bold text-blue-400 text-lg">{match.clan1?.name || 'TBD'}</div>
                                      <div className="text-xs text-gray-500">{match.clan1?.tag}</div>
                                    </div>
                                    <div className="text-center">
                                      {match.status === 'completed' && match.score ? (
                                        <div className="text-2xl font-bold text-white">
                                          {match.score.clan1Score} - {match.score.clan2Score}
                                        </div>
                                      ) : (
                                        <div className="text-gray-400 font-bold text-lg">VS</div>
                                      )}
                                    </div>
                                    <div className="text-center">
                                      <div className="font-bold text-orange-400 text-lg">{match.clan2?.name || 'TBD'}</div>
                                      <div className="text-xs text-gray-500">{match.clan2?.tag}</div>
                                    </div>
                                  </div>

                                  <div className="flex flex-col items-end gap-2">
                                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${match.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                        match.status === 'active' ? 'bg-red-500/20 text-red-400' :
                                          match.status === 'ready' ? 'bg-blue-500/20 text-blue-400' :
                                            'bg-yellow-500/20 text-yellow-400'
                                      }`}>
                                      {match.status === 'completed' ? '✅ Completed' :
                                        match.status === 'active' ? '🔴 Live' :
                                          match.status === 'ready' ? '🟢 Ready' :
                                            '⏳ Scheduling'}
                                    </div>
                                    {match.scheduledAt && (
                                      <div className="text-xs text-gray-400">
                                        {new Date(match.scheduledAt).toLocaleDateString()} {new Date(match.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Match Details for Completed Matches */}
                                {match.status === 'completed' && match.playerPerformances && match.playerPerformances.length > 0 && (
                                  <div className="bg-black/20 rounded-lg p-4 mt-4">
                                    <h5 className="text-white font-medium mb-3 flex items-center gap-2">
                                      <span className="text-yellow-400">⭐</span>
                                      Match Highlights
                                    </h5>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {/* Clan 1 Performance */}
                                      <div>
                                        <div className="text-blue-400 font-medium mb-2">{match.clan1?.name}</div>
                                        <div className="space-y-1">
                                          {match.playerPerformances
                                            .filter(perf => perf.clanId === match.clan1?._id)
                                            .filter((perf, index, arr) =>
                                              arr.findIndex(p => p.userId._id === perf.userId._id) === index
                                            )
                                            .sort((a, b) => b.kills - a.kills)
                                            .slice(0, 3)
                                            .map((perf) => (
                                              <div key={perf.userId._id} className="flex justify-between items-center text-sm">
                                                <span className="text-gray-300 flex items-center gap-1">
                                                  {perf.mvp && <span className="text-yellow-400">👑</span>}
                                                  {perf.userId.username}
                                                </span>
                                                <span className="font-mono text-xs">
                                                  <span className="text-green-400">{perf.kills}</span>
                                                  <span className="text-gray-500">/</span>
                                                  <span className="text-red-400">{perf.deaths}</span>
                                                  <span className="text-gray-500">/</span>
                                                  <span className="text-blue-400">{perf.assists}</span>
                                                </span>
                                              </div>
                                            ))}
                                        </div>
                                      </div>

                                      {/* Clan 2 Performance */}
                                      <div>
                                        <div className="text-orange-400 font-medium mb-2">{match.clan2?.name}</div>
                                        <div className="space-y-1">
                                          {match.playerPerformances
                                            .filter(perf => perf.clanId === match.clan2?._id)
                                            .filter((perf, index, arr) =>
                                              arr.findIndex(p => p.userId._id === perf.userId._id) === index
                                            )
                                            .sort((a, b) => b.kills - a.kills)
                                            .slice(0, 3)
                                            .map((perf) => (
                                              <div key={perf.userId._id} className="flex justify-between items-center text-sm">
                                                <span className="text-gray-300 flex items-center gap-1">
                                                  {perf.mvp && <span className="text-yellow-400">👑</span>}
                                                  {perf.userId.username}
                                                </span>
                                                <span className="font-mono text-xs">
                                                  <span className="text-green-400">{perf.kills}</span>
                                                  <span className="text-gray-500">/</span>
                                                  <span className="text-red-400">{perf.deaths}</span>
                                                  <span className="text-gray-500">/</span>
                                                  <span className="text-blue-400">{perf.assists}</span>
                                                </span>
                                              </div>
                                            ))}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* User Action Section */}
                                {isUserMatch && match.status !== 'completed' && (
                                  <div className="mt-4 bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                                    <div className="text-center">
                                      <div className="text-purple-400 font-medium mb-2">🏠 Your Match</div>
                                      <div className="text-sm text-gray-300 mb-3">
                                        Manage scheduling and results in your clan tab
                                      </div>
                                      <button
                                        onClick={() => window.location.href = '/clan'}
                                        className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                                      >
                                        Go to Clan Tab
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
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
  );
};

export default Bracket;