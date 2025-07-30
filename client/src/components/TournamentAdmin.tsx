"use client";

import { useState, useEffect } from "react";
import { useTournaments, useCreateTournament, useGenerateBracket, useDeleteTournament, useTeams } from "@/hooks/useTournaments";
import { SUPPORTED_GAMES, type Game } from "@/types/tournament";
import { useAuthGuard } from "@/providers/AuthGuard";

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
  status: 'scheduling' | 'ready' | 'active' | 'completed';
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
  const { adminData, address, isLoadingAdmin } = useAuthGuard();
  const { data: tournamentsData, refetch } = useTournaments();
  const createTournament = useCreateTournament();
  const generateBracket = useGenerateBracket();
  const deleteTournament = useDeleteTournament();
  
  const [selectedGame, setSelectedGame] = useState<Game | "">("");
  const [maxTeams, setMaxTeams] = useState(16);
  // const [adminData, setAdminData] = useState<AdminData | null>(null);
  // const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tournaments' | 'matches' | 'schedule'>('tournaments');
  
  // Team1 Host Dashboard state
  const [hostTournaments, setHostTournaments] = useState<Tournament[]>([]);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [cleaningDuplicates, setCleaningDuplicates] = useState<string | null>(null);
  const [fixingFinals, setFixingFinals] = useState<string | null>(null);
  const [forceDeleting, setForceDeleting] = useState<string | null>(null);
  
  
  // Schedule management state
  const [scheduleData, setScheduleData] = useState<{[key: string]: string}>({});
  const [schedulingMatch, setSchedulingMatch] = useState<string | null>(null);
  

  const tournaments = tournamentsData?.tournaments || [];
  
  useEffect(() => {
    if (address) {
      if (activeTab === 'matches' || activeTab === 'schedule') {
        fetchHostTournaments();
      }
    }
  }, [address, activeTab]);

  const fetchHostTournaments = async () => {
    try {
      const params = new URLSearchParams();
      params.append('walletAddress', address!);
      
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

  const handleResolveConflict = async (matchId: string, resolutionData: {
    clan1Score: number;
    clan2Score: number;
    playerPerformances: any[];
  }) => {
    if (!address) return;
    
    setSubmitting(matchId);
    
    try {
      const requestData = {
        matchId,
        walletAddress: address,
        resolveConflict: true,
        resolutionData,
        completedAt: new Date().toISOString()
      };
      
      console.log('Sending conflict resolution request:', requestData);
      
      const response = await fetch('/api/tournaments/matches/admin', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error response:', errorData);
        throw new Error(errorData.details || errorData.error || 'Failed to resolve conflict');
      }

      await response.json();
      
      // Refresh tournaments to show updated results
      await fetchHostTournaments();
      
    } catch (error) {
      console.error('Error resolving conflict:', error);
      console.error('Full error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      alert(`Error resolving conflict: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSubmitting(null);
    }
  };

  const handleFixFinals = async (tournamentId: string) => {
    if (!address) return;
    
    setFixingFinals(tournamentId);
    
    try {
      const response = await fetch('/api/tournaments/fix-finals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tournamentId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fix finals');
      }

      const result = await response.json();
      
      if (result.success) {
        alert(`Success: ${result.message}\n\nFinals: ${result.finalsMatch.clan1} vs ${result.finalsMatch.clan2}`);
        // Refresh tournaments to show updated results
        await fetchHostTournaments();
      } else {
        alert(result.message || 'Failed to fix finals');
      }
      
    } catch (error) {
      console.error('Error fixing finals:', error);
      alert(`Error fixing finals: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setFixingFinals(null);
    }
  };

  const handleCleanupDuplicates = async (tournamentId: string) => {
    if (!address) return;
    
    setCleaningDuplicates(tournamentId);
    
    try {
      const response = await fetch('/api/tournaments/cleanup-finals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tournamentId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cleanup duplicates');
      }

      const result = await response.json();
      
      if (result.success) {
        alert(`Success: ${result.message}`);
        // Refresh tournaments to show updated results
        await fetchHostTournaments();
      } else {
        alert(result.message || 'No duplicates found');
      }
      
    } catch (error) {
      console.error('Error cleaning up duplicates:', error);
      alert(`Error cleaning up duplicates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCleaningDuplicates(null);
    }
  };

  const handleForceDelete = async (tournamentId: string, tournamentName: string) => {
    if (!address) return;
    
    const confirmed = confirm(`⚠️ FORCE DELETE WARNING ⚠️\n\nThis will permanently delete the "${tournamentName}" tournament and ALL related data:\n- Tournament record\n- Bracket data\n- All matches\n- All registrations\n\nThis action CANNOT be undone.\n\nAre you absolutely sure?`);
    
    if (!confirmed) return;
    
    // Double confirmation for safety
    const doubleConfirmed = confirm(`Final confirmation: Delete "${tournamentName}" tournament forever?`);
    if (!doubleConfirmed) return;
    
    setForceDeleting(tournamentId);
    
    try {
      const response = await fetch('/api/tournaments/delete-by-id', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tournamentId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to force delete tournament');
      }

      const result = await response.json();
      
      if (result.success) {
        alert(`✅ Success: ${result.message}\n\nDeleted:\n- Tournament: ${result.deletedData.tournament}\n- Bracket: ${result.deletedData.bracket}\n- Matches: ${result.deletedData.matches}\n- Registrations: ${result.deletedData.registrations}`);
        // Refresh tournaments to show updated list
        refetch();
      } else {
        alert('Failed to delete tournament');
      }
      
    } catch (error) {
      console.error('Error force deleting tournament:', error);
      alert(`Error force deleting tournament: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setForceDeleting(null);
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



  // All tournaments are global - Admins and hosts see all tournaments
  const filteredTournaments = tournaments;


  const handleCreateTournament = async () => {
    if (!selectedGame) return;

    try {
      await createTournament.mutateAsync({
        game: selectedGame,
        maxTeams,
      });
      alert("Tournament created successfully!");
      setSelectedGame("");
      setMaxTeams(16);
    } catch (error: any) {
      console.error("Failed to create tournament:", error);
      
      // Extract the error message from the API response
      let errorMessage = "Failed to create tournament";
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      alert(errorMessage);
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

  const handleDeleteTournament = async (tournamentId: string, tournamentName: string) => {
    if (!address) return;
    
    const confirmed = confirm(`Are you sure you want to delete the ${tournamentName} tournament? This action cannot be undone.`);
    if (!confirmed) return;
    
    try {
      await deleteTournament.mutateAsync({ tournamentId, walletAddress: address });
      alert("Tournament deleted successfully!");
      refetch();
    } catch (error) {
      console.error("Failed to delete tournament:", error);
      alert(`Failed to delete tournament: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (isLoadingAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-white text-center">Loading admin permissions...</div>
      </div>
    );
  }

  // Check if user has permissions to access this page
  if (!adminData?.isHost && !adminData?.isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-gray-400">You need Host or Admin permissions to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Host</h1>
        <div className="text-sm text-gray-400">
          Role: {adminData?.role === 'admin' ? 'Admin' : adminData?.role === 'host' ? 'Host' : 'User'}
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
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'tournaments' && (
        <>
          {/* Create Tournament */}
      <div className="bg-black/20 rounded-lg border border-white/10 p-6">
        <h2 className="text-xl font-bold mb-4 text-white">Create New Tournament</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-white">Game</label>
            <select
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value as Game)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" className="text-black">Select Game</option>
              {SUPPORTED_GAMES.map((game) => (
                <option key={game} value={game} className="text-black">
                  {game}
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
              disabled={!selectedGame || createTournament.isPending}
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
                  onDeleteTournament={handleDeleteTournament}
                  onCleanupDuplicates={handleCleanupDuplicates}
                  onFixFinals={handleFixFinals}
                  onForceDelete={handleForceDelete}
                  generateBracketPending={generateBracket.isPending}
                  deleteTournamentPending={deleteTournament.isPending}
                  cleaningDuplicates={cleaningDuplicates === tournament._id}
                  fixingFinals={fixingFinals === tournament._id}
                  forceDeleting={forceDeleting === tournament._id}
                />
              ))}
              
              {filteredTournaments.length === 0 && (
                <p className="text-gray-400 text-center py-8">
                  No tournaments found
                </p>
              )}
            </div>
          </div>
        </>
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
                      <p className="text-gray-300">Global Tournament</p>
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
                              
                              {match.status === 'results_conflict' && (
                                <ConflictResolutionInterface 
                                  match={match}
                                  onResolveConflict={handleResolveConflict}
                                  submitting={submitting === match._id}
                                />
                              )}
                              
                              {match.status === 'results_pending' && (
                                <div className="text-blue-400 text-sm">
                                  ⏳ Waiting for both teams to submit results
                                </div>
                              )}
                              
                              {(match.status === 'ready' || match.status === 'active') && match.scheduledAt && (
                                <div className={`text-sm ${match.status === 'active' ? 'text-red-400' : 'text-blue-400'}`}>
                                  {match.status === 'active' ? '🔴 LIVE: ' : '📅 Scheduled: '}
                                  {new Date(match.scheduledAt).toLocaleString()}
                                </div>
                              )}
                              
                              {match.status === 'scheduling' && (
                                <div className="text-yellow-400 text-sm">
                                  ⏳ Teams are coordinating match time
                                </div>
                              )}
                            </div>
                            
                            {(match.status === 'ready' || match.status === 'active') && match.team1 && match.team2 && (
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
                      <p className="text-gray-300">Global Tournament</p>
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
  onDeleteTournament: (tournamentId: string, tournamentName: string) => void;
  onCleanupDuplicates: (tournamentId: string) => void;
  onFixFinals: (tournamentId: string) => void;
  onForceDelete: (tournamentId: string, tournamentName: string) => void;
  generateBracketPending: boolean;
  deleteTournamentPending: boolean;
  cleaningDuplicates: boolean;
  fixingFinals: boolean;
  forceDeleting: boolean;
}

function TournamentCard({ tournament, onGenerateBracket, onDeleteTournament, onCleanupDuplicates, onFixFinals, onForceDelete, generateBracketPending, deleteTournamentPending, cleaningDuplicates, fixingFinals, forceDeleting }: TournamentCardProps) {
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
          <p className="text-gray-400 text-sm">Global Tournament</p>
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

      {/* Delete button - only show for tournaments that are not full/active/completed */}
      {(tournament.status === "open") && (
        <div className="mb-4">
          <button
            onClick={() => onDeleteTournament(tournament._id, tournament.game)}
            disabled={deleteTournamentPending}
            className="py-2 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
          >
            {deleteTournamentPending ? "Deleting..." : "Delete Tournament"}
          </button>
        </div>
      )}

      {/* Force Delete Button - Always available for admins */}
      <div className="mb-4">
        <button
          onClick={() => onForceDelete(tournament._id, tournament.game)}
          disabled={forceDeleting}
          className="py-2 px-4 bg-red-800 hover:bg-red-900 disabled:bg-red-900 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors border-2 border-red-600"
        >
          {forceDeleting ? "Force Deleting..." : "⚠️ Force Delete"}
        </button>
        <div className="text-xs text-red-400 mt-1">
          Permanently deletes tournament and all data
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
        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-green-400 text-sm font-medium">✓ Bracket Generated</span>
          <button
            onClick={() => window.open(`/tournaments/bracket?tournamentId=${tournament._id}`, "_blank")}
            className="py-1 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            View Bracket
          </button>
          {(tournament.status === "active" || tournament.status === "full") && (
            <>
              <button
                onClick={() => onCleanupDuplicates(tournament._id)}
                disabled={cleaningDuplicates}
                className="py-1 px-3 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-800 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
              >
                {cleaningDuplicates ? "Cleaning..." : "🧹 Fix Duplicates"}
              </button>
              <button
                onClick={() => onFixFinals(tournament._id)}
                disabled={fixingFinals}
                className="py-1 px-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
              >
                {fixingFinals ? "Fixing..." : "🎯 Fix Finals"}
              </button>
            </>
          )}
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

interface ConflictResolutionProps {
  match: any;
  onResolveConflict: (matchId: string, resolutionData: {
    clan1Score: number;
    clan2Score: number;
    playerPerformances: any[];
  }) => void;
  submitting: boolean;
}

function ConflictResolutionInterface({ match, onResolveConflict, submitting }: ConflictResolutionProps) {
  const [showResolutionForm, setShowResolutionForm] = useState(false);
  const [clan1Score, setClan1Score] = useState(0);
  const [clan2Score, setClan2Score] = useState(0);
  const [playerPerformances, setPlayerPerformances] = useState<any[]>([]);

  useEffect(() => {
    // Initialize form with data from one of the submissions
    if (match.resultsSubmissions?.clan1?.score) {
      setClan1Score(match.resultsSubmissions.clan1.score.clan1Score || 0);
      setClan2Score(match.resultsSubmissions.clan1.score.clan2Score || 0);
    } else if (match.conflictData?.submission1?.score) {
      setClan1Score(match.conflictData.submission1.score.clan1Score || 0);
      setClan2Score(match.conflictData.submission1.score.clan2Score || 0);
    }

    // Initialize player performances from both submissions
    const allPlayers = [];
    const submission1 = match.resultsSubmissions?.clan1 || match.conflictData?.submission1;
    const submission2 = match.resultsSubmissions?.clan2 || match.conflictData?.submission2;
    
    if (submission1?.playerPerformances) {
      submission1.playerPerformances.forEach((perf: any) => {
        allPlayers.push({
          userId: perf.userId,
          username: perf.username,
          clanId: match.team1?.id || match.clan1,
          clanName: match.team1?.name || 'Team 1',
          kills: perf.kills || 0,
          deaths: perf.deaths || 0,
          assists: perf.assists || 0,
          score: perf.score || 0,
          mvp: perf.mvp || false
        });
      });
    }
    
    if (submission2?.playerPerformances) {
      submission2.playerPerformances.forEach((perf: any) => {
        allPlayers.push({
          userId: perf.userId,
          username: perf.username,
          clanId: match.team2?.id || match.clan2,
          clanName: match.team2?.name || 'Team 2',
          kills: perf.kills || 0,
          deaths: perf.deaths || 0,
          assists: perf.assists || 0,
          score: perf.score || 0,
          mvp: perf.mvp || false
        });
      });
    }
    
    setPlayerPerformances(allPlayers);
  }, [match.conflictData, match.resultsSubmissions, match.team1, match.team2, match.clan1, match.clan2]);

  const updatePlayerPerformance = (index: number, field: string, value: any) => {
    const updated = [...playerPerformances];
    updated[index] = { ...updated[index], [field]: value };
    setPlayerPerformances(updated);
  };

  const handleSubmitResolution = () => {
    onResolveConflict(match._id, {
      clan1Score,
      clan2Score,
      playerPerformances
    });
    setShowResolutionForm(false);
  };

  if (!match.conflictData && !match.resultsSubmissions) return null;

  // Use detailed resultsSubmissions if available, otherwise fall back to conflictData
  const submission1 = match.resultsSubmissions?.clan1 || match.conflictData?.submission1;
  const submission2 = match.resultsSubmissions?.clan2 || match.conflictData?.submission2;

  return (
    <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-3">
      <div className="text-red-400 text-sm font-medium mb-3 flex items-center gap-2">
        ⚠️ RESULTS CONFLICT DETECTED
        <button
          onClick={() => setShowResolutionForm(!showResolutionForm)}
          className="ml-auto px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-md transition-colors"
        >
          {showResolutionForm ? 'Hide Resolution' : 'Resolve Conflict'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Submission 1 */}
        <div className="bg-black/20 border border-white/10 rounded-lg p-3">
          <div className="text-white font-medium mb-2">
            {match.team1?.name || 'Team 1'} Submission
          </div>
          <div className="text-sm text-gray-300 mb-2">
            Score: {submission1?.score?.clan1Score || 0} - {submission1?.score?.clan2Score || 0}
          </div>
          <div className="text-xs text-gray-400 mb-2">
            Submitted: {submission1?.submittedAt ? new Date(submission1.submittedAt).toLocaleString() : 'Unknown'}
          </div>
          {submission1?.playerPerformances && (
            <div className="space-y-1">
              <div className="text-xs text-gray-400 font-medium">Player Performances:</div>
              {submission1.playerPerformances.map((perf: any, idx: number) => (
                <div key={idx} className="text-xs text-gray-300">
                  {perf.username || `Player ${idx + 1}`}: {perf.kills || 0}K/{perf.deaths || 0}D/{perf.assists || 0}A (Score: {perf.score || 0})
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submission 2 */}
        <div className="bg-black/20 border border-white/10 rounded-lg p-3">
          <div className="text-white font-medium mb-2">
            {match.team2?.name || 'Team 2'} Submission
          </div>
          <div className="text-sm text-gray-300 mb-2">
            Score: {submission2?.score?.clan1Score || 0} - {submission2?.score?.clan2Score || 0}
          </div>
          <div className="text-xs text-gray-400 mb-2">
            Submitted: {submission2?.submittedAt ? new Date(submission2.submittedAt).toLocaleString() : 'Unknown'}
          </div>
          {submission2?.playerPerformances && (
            <div className="space-y-1">
              <div className="text-xs text-gray-400 font-medium">Player Performances:</div>
              {submission2.playerPerformances.map((perf: any, idx: number) => (
                <div key={idx} className="text-xs text-gray-300">
                  {perf.username || `Player ${idx + 1}`}: {perf.kills || 0}K/{perf.deaths || 0}D/{perf.assists || 0}A (Score: {perf.score || 0})
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showResolutionForm && (
        <div className="bg-black/30 border border-white/20 rounded-lg p-4">
          <div className="text-white font-medium mb-4">Enter Correct Results</div>
          
          {/* Score Input */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                {match.team1?.name || 'Team 1'} Score
              </label>
              <input
                type="number"
                value={clan1Score}
                onChange={(e) => setClan1Score(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                {match.team2?.name || 'Team 2'} Score
              </label>
              <input
                type="number"
                value={clan2Score}
                onChange={(e) => setClan2Score(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Player Performances */}
          {playerPerformances.length > 0 && (
            <div className="mb-6">
              <div className="text-white font-medium mb-3">Correct Player Performances</div>
              <div className="space-y-3">
                {playerPerformances.map((player, index) => (
                  <div key={index} className="bg-black/20 border border-white/10 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-white font-medium">
                        {player.username} ({player.clanName})
                      </div>
                      <label className="flex items-center gap-2 text-sm text-yellow-400">
                        <input
                          type="checkbox"
                          checked={player.mvp}
                          onChange={(e) => updatePlayerPerformance(index, 'mvp', e.target.checked)}
                          className="rounded"
                        />
                        MVP
                      </label>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Kills</label>
                        <input
                          type="number"
                          value={player.kills}
                          onChange={(e) => updatePlayerPerformance(index, 'kills', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Deaths</label>
                        <input
                          type="number"
                          value={player.deaths}
                          onChange={(e) => updatePlayerPerformance(index, 'deaths', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Assists</label>
                        <input
                          type="number"
                          value={player.assists}
                          onChange={(e) => updatePlayerPerformance(index, 'assists', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Score</label>
                        <input
                          type="number"
                          value={player.score}
                          onChange={(e) => updatePlayerPerformance(index, 'score', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleSubmitResolution}
              disabled={submitting}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
            >
              {submitting ? 'Resolving...' : 'Submit Resolution'}
            </button>
            <button
              onClick={() => setShowResolutionForm(false)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-md transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}