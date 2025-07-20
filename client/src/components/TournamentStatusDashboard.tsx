'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useTournaments } from '@/hooks/useTournaments';
import { useAuth } from '@/hooks/useAuth';

interface TournamentStatus {
  _id: string;
  game: string;
  status: 'open' | 'full' | 'active' | 'completed';
  registeredTeams: number;
  maxTeams: number;
  prizePool?: number;
  userTeam?: {
    name: string;
    status: 'registered' | 'eliminated' | 'active' | 'winner';
    nextMatch?: {
      opponent: string;
      scheduledTime?: string;
      round: string;
    };
  };
  createdAt: string;
}

export function TournamentStatusDashboard() {
  const { address } = useAccount();
  const { user } = useAuth();
  const { data: tournamentsData, isLoading } = useTournaments();
  const [userTournaments, setUserTournaments] = useState<TournamentStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (address && tournamentsData?.tournaments) {
      fetchUserTournamentStatus();
    }
  }, [address, tournamentsData]);

  const fetchUserTournamentStatus = async () => {
    try {
      const response = await fetch(`/api/users/tournaments?walletAddress=${address}`);
      if (response.ok) {
        const data = await response.json();
        setUserTournaments(data.tournaments || []);
      }
    } catch (error) {
      console.error('Error fetching user tournament status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-500';
      case 'full': return 'bg-yellow-500';
      case 'active': return 'bg-blue-500';
      case 'completed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return 'Registration Open';
      case 'full': return 'Tournament Full';
      case 'active': return 'In Progress';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  const getTeamStatusColor = (status?: string) => {
    switch (status) {
      case 'registered': return 'text-blue-400';
      case 'active': return 'text-green-400';
      case 'eliminated': return 'text-red-400';
      case 'winner': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getTeamStatusText = (status?: string) => {
    switch (status) {
      case 'registered': return 'Registered';
      case 'active': return 'Active in Tournament';
      case 'eliminated': return 'Eliminated';
      case 'winner': return 'Tournament Winner!';
      default: return 'Not Registered';
    }
  };

  if (loading || isLoading) {
    return (
      <div className="bg-black/20 border border-white/10 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-white/10 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-white/10 rounded"></div>
            <div className="h-4 bg-white/10 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  const allTournaments = tournamentsData?.tournaments || [];
  const activeTournaments = allTournaments.filter(t => t.status === 'active' || t.status === 'full');
  const openTournaments = allTournaments.filter(t => t.status === 'open');

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-black/20 border border-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Open Tournaments</p>
              <p className="text-2xl font-bold text-green-400">{openTournaments.length}</p>
            </div>
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <span className="text-green-400 text-xl">🎮</span>
            </div>
          </div>
        </div>

        <div className="bg-black/20 border border-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Active Tournaments</p>
              <p className="text-2xl font-bold text-blue-400">{activeTournaments.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <span className="text-blue-400 text-xl">⚡</span>
            </div>
          </div>
        </div>

        <div className="bg-black/20 border border-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Your Tournaments</p>
              <p className="text-2xl font-bold text-purple-400">{userTournaments.length}</p>
            </div>
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <span className="text-purple-400 text-xl">🏆</span>
            </div>
          </div>
        </div>
      </div>

      {/* Your Tournament Status */}
      {userTournaments.length > 0 && (
        <div className="bg-black/20 border border-white/10 rounded-lg p-6">

          <div className="space-y-4">
            {userTournaments.map((tournament) => (
              <div key={tournament._id} className="border border-white/10 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(tournament.status)}`}></div>
                    <h4 className="font-medium text-white">{tournament.game} Tournament</h4>
                    <span className="text-xs px-2 py-1 bg-white/10 rounded text-gray-300">
                      {getStatusText(tournament.status)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">
                    ${(tournament.prizePool || 5000).toLocaleString()} Prize Pool
                  </div>
                </div>

                {tournament.userTeam && (
                  <div className="bg-white/5 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{tournament.userTeam.name}</p>
                        <p className={`text-sm ${getTeamStatusColor(tournament.userTeam.status)}`}>
                          {getTeamStatusText(tournament.userTeam.status)}
                        </p>
                      </div>
                      {tournament.userTeam.nextMatch && (
                        <div className="text-right">
                          <p className="text-sm text-white">Next Match</p>
                          <p className="text-xs text-gray-400">vs {tournament.userTeam.nextMatch.opponent}</p>
                          <p className="text-xs text-blue-400">{tournament.userTeam.nextMatch.round}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <div className="text-gray-400">
                    {tournament.registeredTeams}/{tournament.maxTeams} teams registered
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => window.open(`/tournaments/bracket?tournamentId=${tournament._id}`, '_blank')}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                    >
                      View Bracket
                    </button>
                    {tournament.userTeam?.nextMatch && (
                      <button
                        onClick={() => window.open(`/tournaments/results?tournamentId=${tournament._id}`, '_blank')}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                      >
                        Submit Results
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Tournaments */}
      {openTournaments.length > 0 && (
        <div className="bg-black/20 border border-white/10 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Available Tournaments</h3>
            <button
              onClick={() => window.open('/tournaments/register', '_blank')}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded transition-colors"
            >
              Register Team
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {openTournaments.slice(0, 4).map((tournament) => (
              <div key={tournament._id} className="border border-white/10 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-white">{tournament.game}</h4>
                  <span className="text-xs px-2 py-1 bg-green-600 rounded text-white">
                    OPEN
                  </span>
                </div>
                <div className="text-sm text-gray-300 space-y-1">
                  <div className="flex justify-between">
                    <span>Prize Pool:</span>
                    <span className="text-green-400">${(tournament.prizePool || 5000).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Teams:</span>
                    <span>{tournament.registeredTeams}/{tournament.maxTeams}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Slots Left:</span>
                    <span className="text-yellow-400">{tournament.maxTeams - tournament.registeredTeams}</span>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(tournament.registeredTeams / tournament.maxTeams) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-black/20 border border-white/10 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => window.open('/tournaments/register', '_blank')}
            className="p-4 border border-white/20 rounded-lg hover:bg-white/5 transition-colors text-left"
          >
            <div className="text-green-400 text-2xl mb-2">🎮</div>
            <h4 className="font-medium text-white mb-1">Register for Tournament</h4>
            <p className="text-sm text-gray-400">Join an open tournament with your clan</p>
          </button>

          <button
            onClick={() => window.open('/clan', '_blank')}
            className="p-4 border border-white/20 rounded-lg hover:bg-white/5 transition-colors text-left"
          >
            <div className="text-blue-400 text-2xl mb-2">👥</div>
            <h4 className="font-medium text-white mb-1">Manage Clan</h4>
            <p className="text-sm text-gray-400">Organize your team and members</p>
          </button>

          <button
            onClick={() => window.open('/tournaments/host', '_blank')}
            className="p-4 border border-white/20 rounded-lg hover:bg-white/5 transition-colors text-left"
          >
            <div className="text-purple-400 text-2xl mb-2">🏆</div>
            <h4 className="font-medium text-white mb-1">Host Tournament</h4>
            <p className="text-sm text-gray-400">Create and manage tournaments</p>
          </button>
        </div>
      </div>
    </div>
  );
}
