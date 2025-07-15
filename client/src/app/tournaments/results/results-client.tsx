'use client';

import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useTeam1Auth } from '@/hooks/useTeam1Auth';
import { useResults, useStats } from '@/hooks/useTournaments';
import { GAMES, type Game } from '@/types/tournament';
import MatchResultsConfirmation from '@/components/MatchResultsConfirmation';

export default function ResultsClient() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg text-white">Loading...</div>
        </div>
      </Layout>
    );
  }

  return <ResultsContent />;
}

function ResultsContent() {
  const { address } = useTeam1Auth();
  const [selectedGame, setSelectedGame] = useState<Game | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  // Fetch results and stats
  const { data: resultsData, isLoading: resultsLoading } = useResults(
    selectedGame === 'all' ? undefined : selectedGame,
    selectedStatus
  );
  const { data: globalStats } = useStats();
  const { data: userStats } = useStats(address);
  
  const results = resultsData?.results || [];

  const GameFilter = () => (
    <div className="flex items-center gap-3 overflow-x-auto pb-2">
      <button
        onClick={() => setSelectedGame('all')}
        className={`flex-shrink-0 px-4 py-2 rounded-lg border transition-all ${
          selectedGame === 'all' 
            ? 'border-white/40 bg-white/10 text-white' 
            : 'border-white/20 bg-white/5 text-gray-300 hover:bg-white/10'
        }`}
      >
        All Games
      </button>
      {GAMES.map((game) => (
        <button
          key={game}
          onClick={() => setSelectedGame(game)}
          className={`flex-shrink-0 px-4 py-2 rounded-lg border transition-all ${
            selectedGame === game 
              ? 'border-white/40 bg-white/10 text-white' 
              : 'border-white/20 bg-white/5 text-gray-300 hover:bg-white/10'
          }`}
        >
          {game}
        </button>
      ))}
    </div>
  );

  const StatusFilter = () => (
    <div className="flex items-center gap-3">
      {[
        { key: 'all', label: 'All' },
        { key: 'completed', label: 'Completed' },
        { key: 'active', label: 'Active' }
      ].map(({ key, label }) => (
        <button
          key={key}
          onClick={() => setSelectedStatus(key)}
          className={`px-3 py-1 rounded-lg text-sm transition-all ${
            selectedStatus === key 
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' 
              : 'bg-white/5 text-gray-400 hover:text-white'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  if (resultsLoading) {
    return (
      <Layout>
        <div className="text-white text-center py-8">Loading results...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white">Tournament Results</h1>
          <StatusFilter />
        </div>

        {/* Game Filter */}
        <div className="mb-6">
          <GameFilter />
        </div>

        {/* Match Results Confirmation */}
        <div className="mb-8">
          <MatchResultsConfirmation />
        </div>

        {/* Global Stats */}
        {globalStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="text-2xl font-bold text-white">{globalStats.global.totalTournaments}</div>
              <div className="text-sm text-gray-400">Total Tournaments</div>
            </div>
            <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
              <div className="text-2xl font-bold text-green-400">{globalStats.global.completedTournaments}</div>
              <div className="text-sm text-green-400">Completed</div>
            </div>
            <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
              <div className="text-2xl font-bold text-blue-400">{globalStats.global.activeTournaments}</div>
              <div className="text-sm text-blue-400">Active</div>
            </div>
            <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/20">
              <div className="text-2xl font-bold text-yellow-400">{globalStats.global.totalTeams}</div>
              <div className="text-sm text-yellow-400">Total Teams</div>
            </div>
          </div>
        )}

        {/* User Stats */}
        {address && userStats && (
          <div className="bg-white/5 rounded-lg p-6 mb-8 border border-white/10">
            <h2 className="text-xl font-semibold text-white mb-4">Your Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{userStats.totalTournaments}</div>
                <div className="text-sm text-gray-400">Tournaments</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{userStats.tournamentWins}</div>
                <div className="text-sm text-green-400">Wins</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">{userStats.tournamentRunnerUps}</div>
                <div className="text-sm text-yellow-400">Runner-ups</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{userStats.winRate}%</div>
                <div className="text-sm text-blue-400">Win Rate</div>
              </div>
            </div>
            
            {/* Recent Form */}
            {userStats.recentForm && userStats.recentForm.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">Recent Form:</span>
                <div className="flex gap-1">
                  {userStats.recentForm.map((result, i) => (
                    <div
                      key={i}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        result === 'W' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                      }`}
                    >
                      {result}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tournament Results */}
        <div className="space-y-6">
          {results.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4 text-4xl">🏆</div>
              <h3 className="text-white font-medium mb-2">No Results Found</h3>
              <p className="text-gray-400 text-sm">
                {selectedGame === 'all' 
                  ? 'No tournaments match your current filters.' 
                  : `No ${selectedGame} tournaments found.`}
              </p>
            </div>
          ) : (
            results.map((tournament) => (
              <div key={tournament._id} className="bg-white/5 rounded-lg p-6 border border-white/10">
                {/* Tournament Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <h3 className="text-xl font-semibold text-white">{tournament.game} Tournament</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      tournament.status === 'completed' 
                        ? 'bg-green-500/20 text-green-400' 
                        : tournament.status === 'active'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {tournament.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">
                    {tournament.status === 'completed' && tournament.completedAt
                      ? `Completed ${new Date(tournament.completedAt).toLocaleDateString()}`
                      : `Started ${new Date(tournament.createdAt).toLocaleDateString()}`}
                  </div>
                </div>

                {/* Tournament Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-400">Progress</span>
                    <span className="text-white">{tournament.progressPercentage}% Complete</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${tournament.progressPercentage}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Winners Section */}
                  <div>
                    <h4 className="text-white font-medium mb-3">Results</h4>
                    {tournament.winner ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 p-3 bg-green-500/20 border border-green-500/40 rounded-lg">
                          <span className="text-yellow-400 text-lg">🏆</span>
                          <div>
                            <div className="text-green-400 font-medium">{tournament.winner.name}</div>
                            <div className="text-xs text-green-400/80">Champion</div>
                          </div>
                        </div>
                        {tournament.runnerUp && (
                          <div className="flex items-center gap-3 p-3 bg-gray-500/20 border border-gray-500/40 rounded-lg">
                            <span className="text-gray-400 text-lg">🥈</span>
                            <div>
                              <div className="text-gray-300 font-medium">{tournament.runnerUp.name}</div>
                              <div className="text-xs text-gray-400">Runner-up</div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-sm">Tournament in progress...</div>
                    )}
                  </div>

                  {/* Stats Section */}
                  <div>
                    <h4 className="text-white font-medium mb-3">Statistics</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Teams:</span>
                        <span className="text-white">{tournament.totalTeams}/{tournament.maxTeams}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Matches:</span>
                        <span className="text-white">{tournament.completedMatches}/{tournament.totalMatches}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Prize Pool:</span>
                        <span className="text-yellow-400">
                          ${tournament.prizePool?.toLocaleString() || 'TBD'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div>
                    <h4 className="text-white font-medium mb-3">Recent Activity</h4>
                    {tournament.recentMatches && tournament.recentMatches.length > 0 ? (
                      <div className="space-y-2">
                        {tournament.recentMatches.slice(0, 3).map((match) => (
                          <div key={match.id} className="bg-white/5 rounded-lg p-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-300">
                                {match.team1.name} vs {match.team2.name}
                              </span>
                              <span className="text-green-400">
                                {match.winner?.name} won
                              </span>
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {match.round} • {new Date(match.completedAt).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-sm">No recent activity</div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Game Breakdown */}
        {globalStats?.gameBreakdown && (
          <div className="mt-12">
            <h2 className="text-xl font-semibold text-white mb-4">Tournament Breakdown by Game</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {globalStats.gameBreakdown.map((game) => (
                <div key={game._id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h3 className="text-white font-medium mb-2">{game._id}</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total:</span>
                      <span className="text-white">{game.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-400">Completed:</span>
                      <span className="text-green-400">{game.completed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-400">Active:</span>
                      <span className="text-blue-400">{game.active}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}