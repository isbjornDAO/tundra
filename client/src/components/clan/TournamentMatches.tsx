'use client';

import { useState, useEffect, useCallback } from 'react';

interface Match {
  _id: string;
  round: string;
  team1?: {
    _id: string;
    name: string;
    captain: { username: string; walletAddress: string };
    players?: Array<{ username: string; walletAddress: string; role: string }>;
  } | null;
  team2?: {
    _id: string;
    name: string;
    captain: { username: string; walletAddress: string };
    players?: Array<{ username: string; walletAddress: string; role: string }>;
  } | null;
  status: string;
  scheduledAt?: string;
  score?: {
    team1Score: number;
    team2Score: number;
  };
  winner?: string | null;
  organizer1Approved?: boolean;
  organizer2Approved?: boolean;
  tournamentId: string;
  game: string;
}

interface Tournament {
  _id: string;
  game: string;
  status: string;
  registeredTeams: number;
  maxTeams: number;
  bracketId?: string;
}

interface TournamentMatchesProps {
  userAddress: string;
  clanId: string;
  isClanLeader: boolean;
}

export default function TournamentMatches({ userAddress, clanId, isClanLeader }: TournamentMatchesProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClanMatches();
  }, [fetchClanMatches]);

  const fetchClanMatches = useCallback(async () => {
    if (!clanId || !userAddress) return;
    
    setLoading(true);
    try {
      // Fetch tournaments where clan is participating
      const tournamentsResponse = await fetch('/api/tournaments/mongo');
      const tournamentsData = await tournamentsResponse.json();
      
      if (tournamentsData.tournaments) {
        setTournaments(tournamentsData.tournaments);
        
        // Fetch matches for tournaments with brackets
        const activeTournaments = tournamentsData.tournaments.filter((t: Tournament) => t.bracketId);
        const matchPromises = activeTournaments.map((tournament: Tournament) => 
          fetch(`/api/tournaments/matches?bracketId=${tournament.bracketId}`)
            .then(res => res.json())
            .then(data => ({
              tournament,
              matches: data.matches || []
            }))
        );
        
        const results = await Promise.all(matchPromises);
        
        // Filter matches where user's clan is participating
        const clanMatches: Match[] = [];
        results.forEach(({ tournament, matches }) => {
          matches.forEach((match: any) => {
            const isUserTeam1 = match.team1?.captain?.walletAddress?.toLowerCase() === userAddress?.toLowerCase();
            const isUserTeam2 = match.team2?.captain?.walletAddress?.toLowerCase() === userAddress?.toLowerCase();
            
            if (isUserTeam1 || isUserTeam2) {
              clanMatches.push({
                ...match,
                tournamentId: tournament._id,
                game: tournament.game
              });
            }
          });
        });
        
        setMatches(clanMatches);
      }
    } catch (error) {
      console.error('Error fetching clan matches:', error);
    } finally {
      setLoading(false);
    }
  }, [clanId, userAddress]);

  const handleProposeTime = async (matchId: string, time: string) => {
    try {
      const response = await fetch('/api/tournaments/matches/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          proposedTime: time,
          proposedBy: userAddress
        })
      });

      if (response.ok) {
        alert('Match time proposed successfully!');
        fetchClanMatches(); // Refresh matches
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to propose time');
      }
    } catch (error) {
      console.error('Error proposing time:', error);
      alert('Failed to propose time');
    }
  };

  const handleApproveTime = async (matchId: string) => {
    try {
      const response = await fetch('/api/tournaments/matches/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          action: 'approved',
          respondedBy: userAddress
        })
      });

      if (response.ok) {
        alert('Match time approved!');
        fetchClanMatches(); // Refresh matches
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to approve time');
      }
    } catch (error) {
      console.error('Error approving time:', error);
      alert('Failed to approve time');
    }
  };

  const getMatchStatusColor = (match: Match) => {
    if (match.status === 'completed') return 'text-green-400';
    if (match.status === 'scheduled') return 'text-blue-400';
    if (match.scheduledAt && new Date(match.scheduledAt) <= new Date()) return 'text-yellow-400';
    return 'text-gray-400';
  };

  const getMatchActionNeeded = (match: Match) => {
    if (match.status === 'completed') return null;
    if (match.status === 'pending' && match.team1 && match.team2) return 'Schedule match time';
    if (match.scheduledAt && new Date(match.scheduledAt) <= new Date()) return 'Submit results';
    if (match.status === 'scheduled') return 'Ready to play';
    return null;
  };

  if (loading) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="text-gray-400">Loading tournament matches...</div>
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="text-purple-400">🏆</span>
          Tournament Matches
        </h2>
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">No active tournament matches</div>
          <div className="text-sm text-gray-500">
            {isClanLeader 
              ? 'Register your clan for tournaments to see matches here'
              : 'Your clan leader can register for tournaments'
            }
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
        <span className="text-purple-400">🏆</span>
        Tournament Matches
        {!isClanLeader && (
          <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full">
            View Only
          </span>
        )}
      </h2>

      <div className="space-y-6">
        {matches.map((match) => {
          const opponent = match.team1?.captain.walletAddress.toLowerCase() === userAddress?.toLowerCase() 
            ? match.team2 : match.team1;
          const userTeam = match.team1?.captain.walletAddress.toLowerCase() === userAddress?.toLowerCase() 
            ? match.team1 : match.team2;
          
          const actionNeeded = getMatchActionNeeded(match);
          
          return (
            <div key={match._id} className="border border-white/10 rounded-lg p-6 bg-gray-800/30">
              {/* Match Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">
                      {match.game} • {match.round.charAt(0).toUpperCase() + match.round.slice(1)}
                    </h3>
                    <div className={`text-sm font-medium ${getMatchStatusColor(match)}`}>
                      {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
                    </div>
                  </div>
                  
                  <div className="text-gray-300 mb-1">
                    <span className="font-medium text-blue-400">{userTeam?.name}</span>
                    {' vs '}
                    <span className="font-medium text-red-400">{opponent?.name}</span>
                  </div>
                  
                  {match.scheduledAt && (
                    <div className="text-sm text-gray-400">
                      Scheduled: {new Date(match.scheduledAt).toLocaleString()}
                    </div>
                  )}
                </div>
                
                {actionNeeded && isClanLeader && (
                  <div className="text-right">
                    <div className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full border border-yellow-500/30">
                      Action Needed
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {actionNeeded}
                    </div>
                  </div>
                )}
              </div>

              {/* Opponent Info */}
              {opponent && (
                <div className="bg-gray-700/30 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium mb-1">Opponent: {opponent.name}</div>
                      <div className="text-sm text-gray-400">
                        Captain: {opponent.captain.username}
                      </div>
                    </div>
                    <div className="text-sm text-gray-400">
                      {opponent.players?.length || 0} players
                    </div>
                  </div>
                </div>
              )}

              {/* Match Management (Only for Clan Leaders) */}
              {isClanLeader ? (
                <div className="space-y-4">
                  {/* Time Coordination */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Time Coordination</h4>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-white font-medium">⏰ Match Time Coordination</h5>
                        <div className="text-xs text-blue-400">Your Match</div>
                      </div>
                      {match.status === 'pending' && (
                        <div className="space-y-3">
                          <div className="text-sm text-gray-300">
                            Coordinate with your opponent to schedule this match
                          </div>
                          <button
                            onClick={() => {
                              const time = prompt('Enter match time (YYYY-MM-DD HH:MM format):');
                              if (time) {
                                handleProposeTime(match._id, time);
                              }
                            }}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                          >
                            📅 Propose Match Time
                          </button>
                        </div>
                      )}
                      {match.scheduledAt && (
                        <div className="text-sm text-green-400">
                          ✅ Match scheduled for {new Date(match.scheduledAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Results Entry */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Results Entry</h4>
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                      {match.status === 'completed' ? (
                        <div className="text-sm text-green-400">
                          ✅ Match completed - {match.winner ? `Winner: ${match.winner}` : 'Results recorded'}
                        </div>
                      ) : match.scheduledAt && new Date(match.scheduledAt) <= new Date() ? (
                        <div className="space-y-3">
                          <div className="text-sm text-gray-300">
                            Match time has passed. Submit the results:
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const winner = userTeam?.name;
                                if (winner && confirm(`Mark ${winner} as winner?`)) {
                                  // Submit result logic here
                                  alert('Results submitted! (This would call the API)');
                                }
                              }}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                            >
                              We Won
                            </button>
                            <button
                              onClick={() => {
                                const winner = opponent?.name;
                                if (winner && confirm(`Mark ${winner} as winner?`)) {
                                  // Submit result logic here
                                  alert('Results submitted! (This would call the API)');
                                }
                              }}
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                            >
                              They Won
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400">
                          Results can be submitted after the scheduled match time
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* View-Only for Clan Members */
                <div className="bg-gray-700/20 rounded-lg p-4">
                  <div className="text-center text-gray-400">
                    <div className="text-sm mb-2">👀 View Only</div>
                    <div className="text-xs">
                      Your clan leader manages tournament matches
                    </div>
                    {actionNeeded && (
                      <div className="text-xs text-yellow-400 mt-2">
                        Leader action needed: {actionNeeded}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}