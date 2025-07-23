'use client';

import { useState, useEffect } from 'react';
import { ProfileWindow } from '@/components/ProfileWindow';

interface RecentMatchesProps {
  clanId: string;
}

export default function RecentMatches({ clanId }: RecentMatchesProps) {
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<{ walletAddress?: string; displayName?: string } | null>(null);
  const [profileWindowOpen, setProfileWindowOpen] = useState(false);

  useEffect(() => {
    const fetchRecentMatches = async () => {
      if (!clanId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch tournaments to get bracket IDs
        const tournamentsResponse = await fetch('/api/tournaments/mongo');
        const tournamentsData = await tournamentsResponse.json();
        
        if (tournamentsData.tournaments) {
          const completedMatches: any[] = [];
          
          // Get matches from all tournaments
          for (const tournament of tournamentsData.tournaments) {
            if (tournament.bracketId) {
              try {
                const matchesResponse = await fetch(`/api/tournaments/matches?bracketId=${tournament.bracketId}`);
                const matchesData = await matchesResponse.json();
                
                if (matchesData.matches) {
                  // Filter for completed matches where user's clan participated
                  const clanCompletedMatches = matchesData.matches.filter((match: any) => {
                    const isClan1 = match.clan1?._id?.toString() === clanId?.toString();
                    const isClan2 = match.clan2?._id?.toString() === clanId?.toString();
                    const isCompleted = match.status === 'completed';
                    
                    return (isClan1 || isClan2) && isCompleted;
                  });
                  
                  // Add tournament info to matches
                  clanCompletedMatches.forEach((match: any) => {
                    completedMatches.push({
                      ...match,
                      tournamentGame: tournament.game,
                      tournamentId: tournament._id
                    });
                  });
                }
              } catch (err) {
                console.error(`Error fetching matches for tournament ${tournament.game}:`, err);
              }
            }
          }
          
          // Sort by completion date (most recent first) and limit to 5
          const sortedMatches = completedMatches
            .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime())
            .slice(0, 5);
          
          setRecentMatches(sortedMatches);
        }
      } catch (error) {
        console.error('Error fetching recent matches:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentMatches();
  }, [clanId]);

  const openUserProfile = (user: any) => {
    setSelectedUser({
      walletAddress: user.walletAddress || user.userId?.walletAddress,
      displayName: user.username || user.userId?.username
    });
    setProfileWindowOpen(true);
  };

  const closeUserProfile = () => {
    setProfileWindowOpen(false);
    setSelectedUser(null);
  };

  if (loading) {
    return (
      <div className="card mb-8">
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <span className="text-green-400">📈</span>
          Recent Matches
        </h2>
        <div className="text-center py-8">
          <div className="text-gray-400">Loading recent matches...</div>
        </div>
      </div>
    );
  }

  if (recentMatches.length === 0) {
    return (
      <div className="card mb-8">
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <span className="text-green-400">📈</span>
          Recent Matches
        </h2>
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">No completed matches yet</div>
          <div className="text-sm text-gray-500">
            Complete tournament matches to see your clan's performance history
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card mb-8">
      <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
        <span className="text-green-400">📈</span>
        Recent Matches
      </h2>
      
      <div className="space-y-4">
        {recentMatches.map((match: any, index: number) => {
          // Determine if user's clan is clan1 or clan2
          const isUserClan1 = match.clan1?._id?.toString() === clanId?.toString();
          const userClan = isUserClan1 ? match.clan1 : match.clan2;
          const opponent = isUserClan1 ? match.clan2 : match.clan1;
          
          // Get scores
          const userScore = isUserClan1 ? match.score?.clan1Score : match.score?.clan2Score;
          const opponentScore = isUserClan1 ? match.score?.clan2Score : match.score?.clan1Score;
          
          // Determine if user's clan won
          const userWon = userScore > opponentScore;
          const isDraw = userScore === opponentScore;
          
          return (
            <div 
              key={`${match._id}-${index}`} 
              className={`border rounded-xl p-5 ${
                userWon 
                  ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30' 
                  : isDraw
                    ? 'bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30'
                    : 'bg-gradient-to-br from-red-500/10 to-pink-500/10 border-red-500/30'
              }`}
            >
              {/* Match Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-white">
                      {match.tournamentGame}
                    </h3>
                    <span className="text-sm bg-gray-700/50 text-gray-300 px-3 py-1 rounded-full">
                      {match.round?.charAt(0).toUpperCase() + match.round?.slice(1)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <div className="font-semibold text-blue-400 text-lg">{userClan?.name}</div>
                      <div className="text-xs text-gray-500">{userClan?.tag}</div>
                    </div>
                    <div className="text-gray-500 font-bold text-lg mx-2">VS</div>
                    <div className="text-center">
                      <div className="font-semibold text-orange-400 text-lg">{opponent?.name}</div>
                      <div className="text-xs text-gray-500">{opponent?.tag}</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  <div className={`text-xs px-3 py-1 rounded-full border ${
                    userWon 
                      ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                      : isDraw
                        ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                        : 'bg-red-500/20 text-red-400 border-red-500/30'
                  }`}>
                    {userWon ? '🏆 Victory' : isDraw ? '🤝 Draw' : '💀 Defeat'}
                  </div>
                  <div className="text-xs text-gray-400">
                    {match.completedAt && new Date(match.completedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Score Display */}
              <div className="bg-gray-800/30 rounded-lg p-4">
                <div className="flex justify-center items-center gap-6">
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${userWon ? 'text-green-400' : isDraw ? 'text-yellow-400' : 'text-gray-400'}`}>
                      {userScore}
                    </div>
                    <div className="text-sm text-gray-400 mt-1">{userClan?.name}</div>
                  </div>
                  <div className="text-gray-500 font-medium text-xl">-</div>
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${!userWon && !isDraw ? 'text-green-400' : isDraw ? 'text-yellow-400' : 'text-gray-400'}`}>
                      {opponentScore}
                    </div>
                    <div className="text-sm text-gray-400 mt-1">{opponent?.name}</div>
                  </div>
                </div>
                
                {/* Player Performance Summary */}
                {match.playerPerformances && match.playerPerformances.length > 0 && (
                  <div className="border-t border-gray-700 mt-4 pt-4">
                    <div className="text-xs text-gray-500 mb-2">Top Performers:</div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {/* User clan performers */}
                      <div>
                        <div className="text-blue-400 font-medium mb-1">{userClan?.name}</div>
                        {match.playerPerformances
                          .filter((perf: any) => {
                            const perfClanId = perf.clanId?.toString();
                            return perfClanId === userClan?._id?.toString();
                          })
                          .sort((a: any, b: any) => (b.kills || 0) - (a.kills || 0))
                          .slice(0, 2)
                          .map((perf: any, idx: number) => {
                            const kd = perf.deaths > 0 ? (perf.kills / perf.deaths).toFixed(1) : perf.kills;
                            return (
                              <div key={idx} className="flex justify-between items-center text-gray-400">
                                <button
                                  onClick={() => openUserProfile(perf.userId)}
                                  className="truncate mr-2 hover:text-blue-400 transition-colors cursor-pointer text-left"
                                >
                                  {perf.userId?.username || 'Player'}
                                </button>
                                <span className="font-mono whitespace-nowrap">
                                  <span className="text-green-400">{perf.kills}</span>
                                  <span className="text-gray-500">/</span>
                                  <span className="text-red-400">{perf.deaths}</span>
                                  <span className="text-gray-500 ml-1">({kd})</span>
                                </span>
                              </div>
                            );
                          })}
                      </div>
                      
                      {/* Opponent clan performers */}
                      <div>
                        <div className="text-orange-400 font-medium mb-1">{opponent?.name}</div>
                        {match.playerPerformances
                          .filter((perf: any) => {
                            const perfClanId = perf.clanId?.toString();
                            return perfClanId === opponent?._id?.toString();
                          })
                          .sort((a: any, b: any) => (b.kills || 0) - (a.kills || 0))
                          .slice(0, 2)
                          .map((perf: any, idx: number) => {
                            const kd = perf.deaths > 0 ? (perf.kills / perf.deaths).toFixed(1) : perf.kills;
                            return (
                              <div key={idx} className="flex justify-between items-center text-gray-400">
                                <button
                                  onClick={() => openUserProfile(perf.userId)}
                                  className="truncate mr-2 hover:text-blue-400 transition-colors cursor-pointer text-left"
                                >
                                  {perf.userId?.username || 'Player'}
                                </button>
                                <span className="font-mono whitespace-nowrap">
                                  <span className="text-green-400">{perf.kills}</span>
                                  <span className="text-gray-500">/</span>
                                  <span className="text-red-400">{perf.deaths}</span>
                                  <span className="text-gray-500 ml-1">({kd})</span>
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {recentMatches.length >= 5 && (
        <div className="text-center mt-4">
          <div className="text-xs text-gray-500">
            Showing 5 most recent matches
          </div>
        </div>
      )}
      
      {/* Profile Window */}
      <ProfileWindow
        isOpen={profileWindowOpen}
        onClose={closeUserProfile}
        walletAddress={selectedUser?.walletAddress}
        displayName={selectedUser?.displayName}
      />
    </div>
  );
}