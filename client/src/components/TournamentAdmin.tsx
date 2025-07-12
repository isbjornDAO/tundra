"use client";

import { useState, useEffect } from "react";
import { useAccount } from 'wagmi';
import { useTournaments, useCreateTournament, useGenerateBracket, useTeams } from "@/hooks/useTournaments";
import { GAMES, REGIONS, type Game, type Region } from "@/types/tournament";

interface AdminData {
  isAdmin: boolean;
  isClanLeader: boolean;
  isTeam1Host: boolean;
  role: 'super_admin' | 'regional_admin' | 'team1_host' | null;
  regions: string[];
}

interface User {
  _id: string;
  walletAddress: string;
  username: string;
  displayName: string;
  email?: string;
  country: string;
  stats: {
    totalTournaments: number;
    wins: number;
    totalPrizeMoney: number;
    level: number;
    xp: number;
  };
  isClanLeader: boolean;
  isTeam1Host: boolean;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Team {
  _id: string;
  name: string;
  region: string;
  organizer: string;
  players: any[];
}

interface Match {
  _id: string;
  round: string;
  status: 'pending' | 'scheduled' | 'completed';
  scheduledAt?: string;
  completedAt?: string;
  team1: {
    id: string;
    name: string;
    details: Team;
  } | null;
  team2: {
    id: string;
    name: string;
    details: Team;
  } | null;
  winner?: {
    id: string;
    name: string;
  };
  createdAt: string;
}

interface Clan {
  _id: string;
  name: string;
  tag: string;
  description?: string;
  logo?: string;
  leader: {
    _id: string;
    username: string;
    displayName: string;
  };
  members: Array<{
    _id: string;
    username: string;
    displayName: string;
  }>;
  maxMembers: number;
  country: string;
  region: string;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  isPublic: boolean;
  stats: {
    totalTournaments: number;
    wins: number;
    totalPrizeMoney: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface Tournament {
  tournament: {
    _id: string;
    game: string;
    region: string;
    status: string;
    maxTeams: number;
    registeredTeams: number;
  };
  bracket: {
    _id: string;
    status: string;
  } | null;
  matches: Match[];
}

export function TournamentAdmin() {
  const { address } = useAccount();
  const { data: tournamentsData, refetch } = useTournaments();
  const createTournament = useCreateTournament();
  const generateBracket = useGenerateBracket();
  
  const [selectedGame, setSelectedGame] = useState<Game | "">("");
  const [selectedRegion, setSelectedRegion] = useState<Region | "">("");
  const [maxTeams, setMaxTeams] = useState(16);
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tournaments' | 'create' | 'matches' | 'users' | 'schedule' | 'clans'>('tournaments');
  
  // Team1 Host Dashboard state
  const [hostTournaments, setHostTournaments] = useState<Tournament[]>([]);
  const [submitting, setSubmitting] = useState<string | null>(null);
  
  // User management state
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [userStats, setUserStats] = useState({
    totalTournaments: 0,
    wins: 0,
    totalPrizeMoney: 0,
    level: 1,
    xp: 0
  });
  
  // Schedule management state
  const [scheduleData, setScheduleData] = useState<{[key: string]: string}>({});
  const [schedulingMatch, setSchedulingMatch] = useState<string | null>(null);
  
  // Clan management state
  const [clans, setClans] = useState<Clan[]>([]);
  const [pendingClans, setPendingClans] = useState<Clan[]>([]);
  const [approvingClan, setApprovingClan] = useState<string | null>(null);

  const tournaments = tournamentsData?.tournaments || [];
  
  useEffect(() => {
    if (address) {
      fetchAdminData();
      // Always fetch clans for pending notifications
      fetchClans();
      if (activeTab === 'matches' || activeTab === 'schedule') {
        fetchHostTournaments();
      }
      if (activeTab === 'users') {
        fetchUsers();
      }
    }
  }, [address, activeTab]);

  const fetchAdminData = async () => {
    try {
      const response = await fetch(`/api/admin/check?walletAddress=${address}`);
      const data = await response.json();
      setAdminData(data);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHostTournaments = async () => {
    try {
      const params = new URLSearchParams();
      params.append('walletAddress', address!);
      if (selectedRegion) params.append('region', selectedRegion);
      
      const response = await fetch(`/api/tournaments/matches/admin?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch tournaments');
      }
      
      const data = await response.json();
      setHostTournaments(data.tournaments || []);
    } catch (error) {
      console.error('Error fetching host tournaments:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchClans = async () => {
    try {
      const response = await fetch('/api/clans');
      
      if (!response.ok) {
        throw new Error('Failed to fetch clans');
      }
      
      const data = await response.json();
      const allClans = Array.isArray(data) ? data : [];
      
      setClans(allClans.filter((clan: Clan) => clan.isVerified));
      setPendingClans(allClans.filter((clan: Clan) => !clan.isVerified));
    } catch (error) {
      console.error('Error fetching clans:', error);
    }
  };

  const handleApproveClan = async (clanId: string) => {
    try {
      setApprovingClan(clanId);
      const response = await fetch('/api/clans/admin', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clanId,
          action: 'approve',
          walletAddress: address
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve clan');
      }

      await fetchClans();
      
    } catch (error) {
      console.error('Error approving clan:', error);
      alert(`Error approving clan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setApprovingClan(null);
    }
  };

  const handleRejectClan = async (clanId: string) => {
    try {
      setApprovingClan(clanId);
      const response = await fetch('/api/clans/admin', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clanId,
          action: 'reject',
          walletAddress: address
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject clan');
      }

      await fetchClans();
      
    } catch (error) {
      console.error('Error rejecting clan:', error);
      alert(`Error rejecting clan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setApprovingClan(null);
    }
  };

  const handleEnterResult = async (matchId: string, winnerId: string) => {
    if (!address) return;
    
    setSubmitting(matchId);
    
    try {
      const response = await fetch('/api/tournaments/matches/admin', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchId,
          winnerId,
          walletAddress: address,
          completedAt: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to enter result');
      }

      await response.json();
      
      // Refresh tournaments to show updated results
      await fetchHostTournaments();
      
    } catch (error) {
      console.error('Error entering result:', error);
      alert(`Error entering result: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSubmitting(null);
    }
  };

  const handleUserStatsUpdate = async (userId: string, newStats: typeof userStats) => {
    try {
      setSubmitting(userId);
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: selectedUser?.walletAddress,
          stats: newStats
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user stats');
      }

      await fetchUsers();
      setIsEditingUser(false);
      setSelectedUser(null);
      
    } catch (error) {
      console.error('Error updating user stats:', error);
      alert(`Error updating user stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSubmitting(null);
    }
  };

  const handleScheduleMatch = async (matchId: string, scheduledTime: string) => {
    try {
      setSchedulingMatch(matchId);
      const response = await fetch('/api/tournaments/matches/admin', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchId,
          scheduledAt: scheduledTime,
          walletAddress: address,
          action: 'schedule'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to schedule match');
      }

      await fetchHostTournaments();
      setScheduleData(prev => ({ ...prev, [matchId]: '' }));
      
    } catch (error) {
      console.error('Error scheduling match:', error);
      alert(`Error scheduling match: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSchedulingMatch(null);
    }
  };

  const getRoundDisplayName = (round: string) => {
    switch (round) {
      case 'first': return 'Round 1';
      case 'quarter': return 'Quarter Finals';
      case 'semi': return 'Semi Finals';
      case 'final': return 'Finals';
      default: return round;
    }
  };

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    user.displayName.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    user.walletAddress.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const handleUserEdit = (user: User) => {
    setSelectedUser(user);
    setUserStats(user.stats);
    setIsEditingUser(true);
  };

  // Filter tournaments by admin regions - Team1 hosts see all tournaments
  const filteredTournaments = adminData?.role === 'super_admin' || adminData?.isTeam1Host
    ? tournaments 
    : tournaments.filter(t => adminData?.regions.includes(t.region));

  // Get available regions for this admin - Team1 hosts can create in all regions
  const availableRegions = adminData?.role === 'super_admin' || adminData?.isTeam1Host
    ? REGIONS 
    : (adminData?.regions || []);

  const handleCreateTournament = async () => {
    if (!selectedGame || !selectedRegion) return;

    try {
      await createTournament.mutateAsync({
        game: selectedGame,
        region: selectedRegion,
        maxTeams,
      });
      alert("Tournament created successfully!");
      setSelectedGame("");
      setSelectedRegion("");
      setMaxTeams(16);
    } catch (error) {
      console.error("Failed to create tournament:", error);
      alert("Failed to create tournament");
    }
  };

  const handleGenerateBracket = async (tournamentId: string) => {
    try {
      await generateBracket.mutateAsync({ tournamentId });
      alert("Bracket generated successfully!");
      refetch();
    } catch (error) {
      console.error("Failed to generate bracket:", error);
      alert("Failed to generate bracket");
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-white text-center">Loading admin permissions...</div>
      </div>
    );
  }

  // Check if user has permissions to access this page
  if (!adminData?.isAdmin && !adminData?.isTeam1Host) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-gray-400">You need admin or Team1 Host permissions to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Host</h1>
        <div className="text-sm text-gray-400">
          Role: {adminData?.role === 'super_admin' ? 'Super Admin' : adminData?.role === 'regional_admin' ? 'Regional Admin' : adminData?.role === 'team1_host' ? 'Team1 Host' : 'User'}
          {adminData?.role === 'regional_admin' && (
            <div>Regions: {adminData.regions.join(', ')}</div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-white/10">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('tournaments')}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'tournaments'
                ? 'border-red-500 text-red-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <span>🏆</span>
            Tournaments
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'matches'
                ? 'border-red-500 text-red-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <span>⚔️</span>
            Matches
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'users'
                ? 'border-red-500 text-red-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <span>👥</span>
            Users
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'schedule'
                ? 'border-red-500 text-red-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <span>📅</span>
            Schedule
          </button>
          <button
            onClick={() => setActiveTab('clans')}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'clans'
                ? 'border-red-500 text-red-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <span>🛡️</span>
            Clans
            {pendingClans.length > 0 && (
              <span className="px-1.5 py-0.5 bg-red-600 text-white text-xs rounded-full min-w-[20px] text-center">
                {pendingClans.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'tournaments' && (
        <>
          {/* Create Tournament */}
      <div className="bg-black/20 rounded-lg border border-white/10 p-6">
        <h2 className="text-xl font-bold mb-4 text-white">Create New Tournament</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-white">Game</label>
            <select
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value as Game)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" className="text-black">Select Game</option>
              {GAMES.map((game) => (
                <option key={game} value={game} className="text-black">
                  {game}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-white">Region</label>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value as Region)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" className="text-black">Select Region</option>
              {availableRegions.map((region) => (
                <option key={region} value={region} className="text-black">
                  {region}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-white">Max Teams</label>
            <input
              type="number"
              value={maxTeams}
              onChange={(e) => setMaxTeams(parseInt(e.target.value))}
              min="4"
              max="32"
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleCreateTournament}
              disabled={!selectedGame || !selectedRegion || createTournament.isPending}
              className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
            >
              {createTournament.isPending ? "Creating..." : "Create Tournament"}
            </button>
          </div>
        </div>
      </div>

          {/* Tournament List */}
          <div className="bg-black/20 rounded-lg border border-white/10 p-6">
            <h2 className="text-xl font-bold mb-4 text-white">Active Tournaments</h2>
            
            <div className="space-y-4">
              {filteredTournaments.map((tournament: any) => (
                <TournamentCard
                  key={tournament._id}
                  tournament={tournament}
                  onGenerateBracket={handleGenerateBracket}
                  generateBracketPending={generateBracket.isPending}
                />
              ))}
              
              {filteredTournaments.length === 0 && (
                <p className="text-gray-400 text-center py-8">
                  {adminData?.role === 'regional_admin' 
                    ? `No tournaments found in your regions: ${adminData.regions.join(', ')}` 
                    : 'No tournaments found'
                  }
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Clans Tab */}
      {activeTab === 'clans' && (
        <div className="space-y-6">
          {/* Pending Clans Section */}
          {pendingClans.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                <span>Pending Clan Approvals</span>
                <span className="px-2 py-1 bg-red-600 text-white text-sm rounded-full">
                  {pendingClans.length}
                </span>
              </h2>
              
              <div className="space-y-4">
                {pendingClans.map((clan) => (
                  <div key={clan._id} className="bg-black/20 border border-white/20 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">{clan.name}</h3>
                          <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded font-medium">
                            [{clan.tag}]
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                          <div>
                            <span className="text-gray-400 text-sm">Leader:</span>
                            <p className="text-white">{clan.leader.displayName} (@{clan.leader.username})</p>
                          </div>
                          <div>
                            <span className="text-gray-400 text-sm">Location:</span>
                            <p className="text-white">{clan.country}, {clan.region}</p>
                          </div>
                          <div>
                            <span className="text-gray-400 text-sm">Members:</span>
                            <p className="text-white">{clan.members.length} / {clan.maxMembers}</p>
                          </div>
                        </div>
                        
                        {clan.description && (
                          <div className="mb-3">
                            <span className="text-gray-400 text-sm">Description:</span>
                            <p className="text-gray-300 text-sm">{clan.description}</p>
                          </div>
                        )}
                        
                        <div className="text-xs text-gray-400">
                          Created: {new Date(clan.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleApproveClan(clan._id)}
                          disabled={approvingClan === clan._id}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
                        >
                          {approvingClan === clan._id ? 'Approving...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleRejectClan(clan._id)}
                          disabled={approvingClan === clan._id}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
                        >
                          {approvingClan === clan._id ? 'Rejecting...' : 'Reject'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approved Clans Section */}
          <div className="bg-black/20 rounded-lg border border-white/10 p-6">
            <h2 className="text-xl font-bold mb-4 text-white">Approved Clans</h2>
            
            <div className="space-y-4">
              {clans.map((clan) => (
                <div key={clan._id} className="bg-black/10 border border-white/20 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{clan.name}</h3>
                        <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded font-medium">
                          [{clan.tag}]
                        </span>
                        <span className="px-2 py-1 bg-green-600 text-white text-xs rounded font-medium">
                          ✓ Verified
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <span className="text-gray-400 text-sm">Leader:</span>
                          <p className="text-white">{clan.leader.displayName} (@{clan.leader.username})</p>
                        </div>
                        <div>
                          <span className="text-gray-400 text-sm">Location:</span>
                          <p className="text-white">{clan.country}, {clan.region}</p>
                        </div>
                        <div>
                          <span className="text-gray-400 text-sm">Members:</span>
                          <p className="text-white">{clan.members.length} / {clan.maxMembers}</p>
                        </div>
                        <div>
                          <span className="text-gray-400 text-sm">Tournaments:</span>
                          <p className="text-white">{clan.stats.totalTournaments}</p>
                        </div>
                      </div>
                      
                      {clan.description && (
                        <div className="mb-3">
                          <span className="text-gray-400 text-sm">Description:</span>
                          <p className="text-gray-300 text-sm">{clan.description}</p>
                        </div>
                      )}
                      
                      <div className="flex gap-4 text-xs text-gray-400">
                        <span>Created: {new Date(clan.createdAt).toLocaleDateString()}</span>
                        {clan.verifiedAt && (
                          <span>Verified: {new Date(clan.verifiedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {clans.length === 0 && (
                <p className="text-gray-400 text-center py-8">No approved clans found</p>
              )}
            </div>
          </div>

          {pendingClans.length === 0 && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6 text-center">
              <h3 className="text-lg font-semibold text-green-400 mb-2">All caught up!</h3>
              <p className="text-gray-300">No pending clan approvals at this time.</p>
            </div>
          )}
        </div>
      )}

      {/* Matches Tab */}
      {activeTab === 'matches' && (
        <div className="space-y-6">
          <div className="bg-black/20 rounded-lg border border-white/10 p-6">
            <h2 className="text-xl font-bold mb-4 text-white">Match Results Entry</h2>
            
            <div className="space-y-6">
              {hostTournaments.map((tournament) => (
                <div key={tournament.tournament._id} className="bg-black/10 border border-white/20 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{tournament.tournament.game}</h3>
                      <p className="text-gray-300">Region: {tournament.tournament.region}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${tournament.tournament.status === 'active' ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'}`}>
                      {tournament.tournament.status.toUpperCase()}
                    </span>
                  </div>

                  {tournament.matches.length > 0 ? (
                    <div className="space-y-3">
                      {tournament.matches.map((match) => (
                        <div key={match._id} className="bg-black/20 border border-white/10 rounded-lg p-4">
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <h4 className="font-medium text-white mb-2">{getRoundDisplayName(match.round)}</h4>
                              <div className="grid grid-cols-2 gap-4 mb-3">
                                <div className="text-white">
                                  <span className="text-gray-400">Team 1:</span> {match.team1?.name || 'TBD'}
                                </div>
                                <div className="text-white">
                                  <span className="text-gray-400">Team 2:</span> {match.team2?.name || 'TBD'}
                                </div>
                              </div>
                              
                              {match.status === 'completed' && match.winner && (
                                <div className="text-green-400 text-sm font-medium">
                                  ✓ Winner: {match.winner.name}
                                </div>
                              )}
                              
                              {match.status === 'scheduled' && match.scheduledAt && (
                                <div className="text-blue-400 text-sm">
                                  📅 Scheduled: {new Date(match.scheduledAt).toLocaleString()}
                                </div>
                              )}
                            </div>
                            
                            {match.status === 'pending' && match.team1 && match.team2 && (
                              <div className="flex gap-2 ml-4">
                                <button
                                  onClick={() => handleEnterResult(match._id, match.team1!.id)}
                                  disabled={submitting === match._id}
                                  className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
                                >
                                  {submitting === match._id ? 'Submitting...' : `${match.team1.name} Wins`}
                                </button>
                                <button
                                  onClick={() => handleEnterResult(match._id, match.team2!.id)}
                                  disabled={submitting === match._id}
                                  className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
                                >
                                  {submitting === match._id ? 'Submitting...' : `${match.team2.name} Wins`}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-8">No matches found for this tournament</p>
                  )}
                </div>
              ))}
              
              {hostTournaments.length === 0 && (
                <p className="text-gray-400 text-center py-8">No tournaments found for match management</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="bg-black/20 rounded-lg border border-white/10 p-6">
            <h2 className="text-xl font-bold mb-4 text-white">User Management</h2>
            
            <div className="mb-6">
              <input
                type="text"
                placeholder="Search users by username, display name, or wallet address..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div key={user._id} className="bg-black/10 border border-white/20 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{user.displayName}</h3>
                        <span className="text-gray-400">@{user.username}</span>
                        {user.isAdmin && (
                          <span className="px-2 py-1 bg-red-600 text-white text-xs rounded font-medium">Admin</span>
                        )}
                        {user.isTeam1Host && (
                          <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded font-medium">Team1 Host</span>
                        )}
                        {user.isClanLeader && (
                          <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded font-medium">Clan Leader</span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <span className="text-gray-400 text-sm">Level:</span>
                          <p className="text-white">{user.stats.level}</p>
                        </div>
                        <div>
                          <span className="text-gray-400 text-sm">XP:</span>
                          <p className="text-white">{user.stats.xp}</p>
                        </div>
                        <div>
                          <span className="text-gray-400 text-sm">Tournaments:</span>
                          <p className="text-white">{user.stats.totalTournaments}</p>
                        </div>
                        <div>
                          <span className="text-gray-400 text-sm">Wins:</span>
                          <p className="text-white">{user.stats.wins}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-4 text-xs text-gray-400">
                        <span>Country: {user.country}</span>
                        <span>Joined: {new Date(user.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleUserEdit(user)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
                      >
                        Edit Stats
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredUsers.length === 0 && (
                <p className="text-gray-400 text-center py-8">No users found</p>
              )}
            </div>
          </div>

          {/* User Edit Modal */}
          {isEditingUser && selectedUser && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-gray-900 border border-white/20 rounded-lg p-6 w-full max-w-md">
                <h3 className="text-xl font-bold text-white mb-4">Edit User Stats</h3>
                <p className="text-gray-300 mb-4">
                  Editing stats for: <span className="font-semibold">{selectedUser.displayName}</span>
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-white">Level</label>
                    <input
                      type="number"
                      value={userStats.level}
                      onChange={(e) => setUserStats(prev => ({ ...prev, level: parseInt(e.target.value) || 1 }))}
                      min="1"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2 text-white">XP</label>
                    <input
                      type="number"
                      value={userStats.xp}
                      onChange={(e) => setUserStats(prev => ({ ...prev, xp: parseInt(e.target.value) || 0 }))}
                      min="0"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2 text-white">Total Tournaments</label>
                    <input
                      type="number"
                      value={userStats.totalTournaments}
                      onChange={(e) => setUserStats(prev => ({ ...prev, totalTournaments: parseInt(e.target.value) || 0 }))}
                      min="0"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2 text-white">Wins</label>
                    <input
                      type="number"
                      value={userStats.wins}
                      onChange={(e) => setUserStats(prev => ({ ...prev, wins: parseInt(e.target.value) || 0 }))}
                      min="0"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2 text-white">Total Prize Money</label>
                    <input
                      type="number"
                      value={userStats.totalPrizeMoney}
                      onChange={(e) => setUserStats(prev => ({ ...prev, totalPrizeMoney: parseInt(e.target.value) || 0 }))}
                      min="0"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => handleUserStatsUpdate(selectedUser._id, userStats)}
                    disabled={submitting === selectedUser._id}
                    className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
                  >
                    {submitting === selectedUser._id ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingUser(false);
                      setSelectedUser(null);
                    }}
                    className="flex-1 py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Schedule Tab */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          <div className="bg-black/20 rounded-lg border border-white/10 p-6">
            <h2 className="text-xl font-bold mb-4 text-white">Match Scheduling</h2>
            
            <div className="space-y-6">
              {hostTournaments.map((tournament) => (
                <div key={tournament.tournament._id} className="bg-black/10 border border-white/20 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{tournament.tournament.game}</h3>
                      <p className="text-gray-300">Region: {tournament.tournament.region}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${tournament.tournament.status === 'active' ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'}`}>
                      {tournament.tournament.status.toUpperCase()}
                    </span>
                  </div>

                  {tournament.matches.length > 0 ? (
                    <div className="space-y-3">
                      {tournament.matches.filter(match => match.status !== 'completed').map((match) => (
                        <div key={match._id} className="bg-black/20 border border-white/10 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-medium text-white mb-2">{getRoundDisplayName(match.round)}</h4>
                              <div className="grid grid-cols-2 gap-4 mb-3">
                                <div className="text-white">
                                  <span className="text-gray-400">Team 1:</span> {match.team1?.name || 'TBD'}
                                </div>
                                <div className="text-white">
                                  <span className="text-gray-400">Team 2:</span> {match.team2?.name || 'TBD'}
                                </div>
                              </div>
                              
                              {match.status === 'scheduled' && match.scheduledAt && (
                                <div className="text-blue-400 text-sm">
                                  📅 Scheduled: {new Date(match.scheduledAt).toLocaleString()}
                                </div>
                              )}
                            </div>
                            
                            {match.team1 && match.team2 && (
                              <div className="flex items-center gap-2 ml-4">
                                <input
                                  type="datetime-local"
                                  value={scheduleData[match._id] || ''}
                                  onChange={(e) => setScheduleData(prev => ({ ...prev, [match._id]: e.target.value }))}
                                  className="px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                  onClick={() => handleScheduleMatch(match._id, scheduleData[match._id])}
                                  disabled={schedulingMatch === match._id || !scheduleData[match._id]}
                                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
                                >
                                  {schedulingMatch === match._id ? 'Scheduling...' : 'Schedule'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-8">No matches available for scheduling</p>
                  )}
                </div>
              ))}
              
              {hostTournaments.length === 0 && (
                <p className="text-gray-400 text-center py-8">No tournaments found for scheduling</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface TournamentCardProps {
  tournament: any;
  onGenerateBracket: (tournamentId: string) => void;
  generateBracketPending: boolean;
}

function TournamentCard({ tournament, onGenerateBracket, generateBracketPending }: TournamentCardProps) {
  const { data: teamsData } = useTeams(tournament._id);
  const teams = teamsData?.teams || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-green-600 text-white";
      case "full": return "bg-yellow-600 text-white";
      case "active": return "bg-blue-600 text-white";
      case "completed": return "bg-gray-600 text-white";
      default: return "bg-gray-600 text-white";
    }
  };

  return (
    <div className="bg-black/10 border border-white/20 rounded-lg p-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{tournament.game}</h3>
          <p className="text-gray-300">
            {tournament.registeredTeams}/{tournament.maxTeams} teams registered
          </p>
          <p className="text-gray-400 text-sm">Region: {tournament.region}</p>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(tournament.status)}`}>
          {tournament.status.toUpperCase()}
        </span>
      </div>

      <div className="mb-4">
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(tournament.registeredTeams / tournament.maxTeams) * 100}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-300 mb-4">
        <div>
          <span className="font-medium text-white">Created:</span>
          <br />
          {new Date(tournament.createdAt).toLocaleDateString()}
        </div>
        <div>
          <span className="font-medium text-white">Teams:</span>
          <br />
          {teams.length} registered
        </div>
        <div>
          <span className="font-medium text-white">Max Teams:</span>
          <br />
          {tournament.maxTeams}
        </div>
        <div>
          <span className="font-medium text-white">Slots Left:</span>
          <br />
          {tournament.maxTeams - tournament.registeredTeams}
        </div>
      </div>

      {tournament.status === "full" && !tournament.bracketId && (
        <button
          onClick={() => onGenerateBracket(tournament._id)}
          disabled={generateBracketPending}
          className="py-2 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
        >
          {generateBracketPending ? "Generating..." : "Generate Bracket"}
        </button>
      )}

      {tournament.bracketId && (
        <div className="flex gap-2 items-center">
          <span className="text-green-400 text-sm font-medium">✓ Bracket Generated</span>
          <button
            onClick={() => window.open(`/tournament/bracket?tournamentId=${tournament._id}`, "_blank")}
            className="py-1 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            View Bracket
          </button>
        </div>
      )}

      {teams.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-blue-400 hover:text-blue-300">
            View Registered Teams ({teams.length})
          </summary>
          <div className="mt-2 space-y-2">
            {teams.map((team: any, index: number) => (
              <div key={team._id} className="text-sm border-l-2 border-white/20 pl-3">
                <div className="font-medium text-white">{team.name}</div>
                <div className="text-gray-300">{team.region}</div>
                <div className="text-xs text-gray-400">
                  {team.players?.length || 0} players • Organizer: {team.organizer.slice(0, 8)}...
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}