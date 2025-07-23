'use client';

import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { ProfileWindow } from '@/components/ProfileWindow';
import { SUPPORTED_GAMES } from '@/types/tournament';

interface CompletedTournament {
  _id: string;
  game: string;
  status: string;
  registeredTeams: number;
  maxTeams: number;
  prizePool: number;
  completedAt: string;
  winner?: {
    _id: string;
    name: string;
    tag: string;
  };
  runnerUp?: {
    _id: string;
    name: string;
    tag: string;
  };
}

interface TopPerformer {
  _id: string;
  username: string;
  walletAddress?: string;
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
  kd: number;
  tournamentsPlayed: number;
  mvpCount: number;
  clan?: {
    name: string;
    tag: string;
  };
}

interface TopClan {
  _id: string;
  name: string;
  tag: string;
  wins: number;
  tournamentsPlayed: number;
  winRate: number;
  totalPrizeMoney: number;
  avgPlacement: number;
}

export default function ResultsEnhanced() {
  const [mounted, setMounted] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string>('all');
  const [completedTournaments, setCompletedTournaments] = useState<CompletedTournament[]>([]);
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([]);
  const [topClans, setTopClans] = useState<TopClan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tournaments' | 'performers' | 'clans'>('tournaments');
  const [selectedUser, setSelectedUser] = useState<{ walletAddress?: string; displayName?: string } | null>(null);
  const [profileWindowOpen, setProfileWindowOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchCompletedTournaments();
    fetchTopPerformers();
    fetchTopClans();
  }, [selectedGame]);

  const openUserProfile = (performer: TopPerformer) => {
    setSelectedUser({
      walletAddress: performer.walletAddress,
      displayName: performer.username
    });
    setProfileWindowOpen(true);
  };

  const closeUserProfile = () => {
    setProfileWindowOpen(false);
    setSelectedUser(null);
  };

  const fetchCompletedTournaments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tournaments/mongo');
      const data = await response.json();
      
      let tournaments = data.tournaments || [];
      
      // Filter for completed tournaments
      tournaments = tournaments.filter((t: any) => t.status === 'completed');
      
      // Filter by game if selected
      if (selectedGame !== 'all') {
        tournaments = tournaments.filter((t: any) => t.game === selectedGame);
      }
      
      // Sort by completion date (most recent first)
      tournaments.sort((a: any, b: any) => 
        new Date(b.completedAt || b.updatedAt).getTime() - new Date(a.completedAt || a.updatedAt).getTime()
      );
      
      // For each tournament, fetch winner/runner-up info
      const enrichedTournaments = await Promise.all(
        tournaments.map(async (tournament: any) => {
          if (tournament.bracketId) {
            try {
              const matchesResponse = await fetch(`/api/tournaments/matches?bracketId=${tournament.bracketId}`);
              const matchesData = await matchesResponse.json();
              const matches = matchesData.matches || [];
              
              // Find final match to get winner/runner-up
              const finalMatch = matches.find((m: any) => m.round === 'final' && m.status === 'completed');
              if (finalMatch && finalMatch.score) {
                const winner = finalMatch.score.clan1Score > finalMatch.score.clan2Score 
                  ? finalMatch.clan1 
                  : finalMatch.clan2;
                const runnerUp = finalMatch.score.clan1Score > finalMatch.score.clan2Score 
                  ? finalMatch.clan2 
                  : finalMatch.clan1;
                
                return {
                  ...tournament,
                  winner,
                  runnerUp,
                  completedAt: finalMatch.completedAt || tournament.updatedAt
                };
              }
            } catch (error) {
              console.error('Error fetching tournament matches:', error);
            }
          }
          return tournament;
        })
      );
      
      setCompletedTournaments(enrichedTournaments);
    } catch (error) {
      console.error('Error fetching completed tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopPerformers = async () => {
    try {
      // This would ideally be a dedicated API endpoint
      // For now, we'll aggregate from completed tournament matches
      const response = await fetch('/api/tournaments/mongo');
      const data = await response.json();
      
      const allPerformances: any[] = [];
      const tournaments = data.tournaments?.filter((t: any) => t.status === 'completed') || [];
      
      for (const tournament of tournaments) {
        if (selectedGame !== 'all' && tournament.game !== selectedGame) continue;
        
        if (tournament.bracketId) {
          try {
            const matchesResponse = await fetch(`/api/tournaments/matches?bracketId=${tournament.bracketId}`);
            const matchesData = await matchesResponse.json();
            const matches = matchesData.matches || [];
            
            matches.forEach((match: any) => {
              if (match.playerPerformances) {
                allPerformances.push(...match.playerPerformances);
              }
            });
          } catch (error) {
            console.error('Error fetching match performances:', error);
          }
        }
      }
      
      // Aggregate performance data by user
      const userStats: any = {};
      allPerformances.forEach((perf: any) => {
        const userId = perf.userId?._id || perf.userId;
        const username = perf.userId?.username || 'Unknown';
        
        if (!userStats[userId]) {
          userStats[userId] = {
            _id: userId,
            username,
            walletAddress: perf.userId?.walletAddress,
            totalKills: 0,
            totalDeaths: 0,
            totalAssists: 0,
            tournamentsPlayed: new Set(),
            mvpCount: 0,
            clan: perf.clan
          };
        }
        
        userStats[userId].totalKills += perf.kills || 0;
        userStats[userId].totalDeaths += perf.deaths || 0;
        userStats[userId].totalAssists += perf.assists || 0;
        userStats[userId].tournamentsPlayed.add(perf.tournamentId);
        if (perf.mvp) userStats[userId].mvpCount++;
      });
      
      // Convert to array and calculate K/D
      const performers = Object.values(userStats).map((user: any) => ({
        ...user,
        tournamentsPlayed: user.tournamentsPlayed.size,
        kd: user.totalDeaths > 0 ? user.totalKills / user.totalDeaths : user.totalKills
      }));
      
      // Sort by K/D ratio and limit to top 10
      performers.sort((a: any, b: any) => b.kd - a.kd);
      setTopPerformers(performers.slice(0, 10));
      
    } catch (error) {
      console.error('Error fetching top performers:', error);
    }
  };

  const fetchTopClans = async () => {
    try {
      // Fetch completed tournaments directly
      const response = await fetch('/api/tournaments/mongo');
      const data = await response.json();
      
      let tournaments = data.tournaments || [];
      tournaments = tournaments.filter((t: any) => t.status === 'completed');
      
      if (selectedGame !== 'all') {
        tournaments = tournaments.filter((t: any) => t.game === selectedGame);
      }
      
      // Enrich tournaments with winner/runner-up data
      const enrichedTournaments = await Promise.all(
        tournaments.map(async (tournament: any) => {
          if (tournament.bracketId) {
            try {
              const matchesResponse = await fetch(`/api/tournaments/matches?bracketId=${tournament.bracketId}`);
              const matchesData = await matchesResponse.json();
              const matches = matchesData.matches || [];
              
              const finalMatch = matches.find((m: any) => m.round === 'final' && m.status === 'completed');
              if (finalMatch && finalMatch.score) {
                const winner = finalMatch.score.clan1Score > finalMatch.score.clan2Score 
                  ? finalMatch.clan1 
                  : finalMatch.clan2;
                const runnerUp = finalMatch.score.clan1Score > finalMatch.score.clan2Score 
                  ? finalMatch.clan2 
                  : finalMatch.clan1;
                
                return {
                  ...tournament,
                  winner,
                  runnerUp,
                  completedAt: finalMatch.completedAt || tournament.updatedAt
                };
              }
            } catch (error) {
              console.error('Error fetching tournament matches:', error);
            }
          }
          return tournament;
        })
      );
      
      // Calculate clan stats from enriched tournaments
      const clanStats: any = {};
      
      enrichedTournaments.forEach((tournament) => {
        // Winner gets 1st place, runner-up gets 2nd place
        if (tournament.winner) {
          const clanId = tournament.winner._id;
          if (!clanStats[clanId]) {
            clanStats[clanId] = {
              _id: clanId,
              name: tournament.winner.name,
              tag: tournament.winner.tag,
              wins: 0,
              tournamentsPlayed: 0,
              totalPrizeMoney: 0,
              placements: []
            };
          }
          clanStats[clanId].wins++;
          clanStats[clanId].tournamentsPlayed++;
          clanStats[clanId].totalPrizeMoney += tournament.prizePool * 0.6; // Assume 60% to winner
          clanStats[clanId].placements.push(1);
        }
        
        if (tournament.runnerUp) {
          const clanId = tournament.runnerUp._id;
          if (!clanStats[clanId]) {
            clanStats[clanId] = {
              _id: clanId,
              name: tournament.runnerUp.name,
              tag: tournament.runnerUp.tag,
              wins: 0,
              tournamentsPlayed: 0,
              totalPrizeMoney: 0,
              placements: []
            };
          }
          clanStats[clanId].tournamentsPlayed++;
          clanStats[clanId].totalPrizeMoney += tournament.prizePool * 0.3; // Assume 30% to runner-up
          clanStats[clanId].placements.push(2);
        }
      });
      
      // Calculate win rate and average placement
      const clans = Object.values(clanStats).map((clan: any) => ({
        ...clan,
        winRate: clan.tournamentsPlayed > 0 ? (clan.wins / clan.tournamentsPlayed) * 100 : 0,
        avgPlacement: clan.placements.length > 0 
          ? clan.placements.reduce((sum: number, place: number) => sum + place, 0) / clan.placements.length 
          : 0
      }));
      
      // Sort by wins first, then by win rate
      clans.sort((a: any, b: any) => {
        if (b.wins === a.wins) {
          return b.winRate - a.winRate;
        }
        return b.wins - a.wins;
      });
      
      setTopClans(clans.slice(0, 10));
      
    } catch (error) {
      console.error('Error fetching top clans:', error);
    }
  };

  if (!mounted || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg text-white">Loading tournament results...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Tournament Results & Statistics</h1>
          <p className="text-gray-400">Complete tournament history with top performers and clan rankings</p>
        </div>

        {/* Game Filter */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Filter by Game</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedGame('all')}
              className={`px-4 py-2 rounded-lg border transition-all ${
                selectedGame === 'all' 
                  ? 'border-blue-500 bg-blue-500/20 text-blue-400' 
                  : 'border-white/20 bg-white/5 hover:border-white/40 text-white'
              }`}
            >
              All Games
            </button>
            {SUPPORTED_GAMES.map((game: string) => (
              <button
                key={game}
                onClick={() => setSelectedGame(game)}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  selectedGame === game 
                    ? 'border-blue-500 bg-blue-500/20 text-blue-400' 
                    : 'border-white/20 bg-white/5 hover:border-white/40 text-white'
                }`}
              >
                {game}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex gap-2 bg-white/5 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('tournaments')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                activeTab === 'tournaments'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              🏆 Completed Tournaments
            </button>
            <button
              onClick={() => setActiveTab('performers')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                activeTab === 'performers'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              ⭐ Top Performers
            </button>
            <button
              onClick={() => setActiveTab('clans')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                activeTab === 'clans'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              👑 Top Clans
            </button>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'tournaments' && (
          <div className="space-y-6">
            <h3 className="text-2xl font-semibold text-white flex items-center gap-3">
              <span className="text-green-400">🏆</span>
              Completed Tournaments
              <span className="text-sm text-gray-400 font-normal">({completedTournaments.length})</span>
            </h3>
            
            {completedTournaments.length === 0 ? (
              <div className="text-center py-16 bg-white/5 rounded-xl">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-2xl font-bold text-white mb-2">No Completed Tournaments</h3>
                <p className="text-gray-400">No tournaments have been completed yet for {selectedGame === 'all' ? 'any game' : selectedGame}</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {completedTournaments.map((tournament) => (
                  <div key={tournament._id} className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-xl font-bold text-white mb-1">{tournament.game} Tournament</h4>
                        <div className="flex items-center gap-4 text-sm text-gray-300">
                          <span>{tournament.registeredTeams} Teams</span>
                          <span>{new Date(tournament.completedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-yellow-400">${tournament.prizePool?.toLocaleString() || '5,000'}</div>
                        <div className="text-xs text-gray-400">Prize Pool</div>
                      </div>
                    </div>
                    
                    {tournament.winner && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-green-500/20">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">🥇</div>
                          <div>
                            <div className="text-yellow-400 font-bold">{tournament.winner.name}</div>
                            <div className="text-xs text-gray-400">{tournament.winner.tag} • Champion</div>
                          </div>
                        </div>
                        {tournament.runnerUp && (
                          <div className="flex items-center gap-3">
                            <div className="text-2xl">🥈</div>
                            <div>
                              <div className="text-gray-300 font-bold">{tournament.runnerUp.name}</div>
                              <div className="text-xs text-gray-400">{tournament.runnerUp.tag} • Runner-up</div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'performers' && (
          <div className="space-y-6">
            <h3 className="text-2xl font-semibold text-white flex items-center gap-3">
              <span className="text-purple-400">⭐</span>
              Top Performers
              <span className="text-sm text-gray-400 font-normal">(by K/D Ratio)</span>
            </h3>
            
            {topPerformers.length === 0 ? (
              <div className="text-center py-16 bg-white/5 rounded-xl">
                <div className="text-6xl mb-4">⭐</div>
                <h3 className="text-2xl font-bold text-white mb-2">No Performance Data</h3>
                <p className="text-gray-400">No player performance data available yet</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {topPerformers.map((performer, index) => (
                  <div key={performer._id} className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${
                            index === 0 ? 'text-yellow-400' :
                            index === 1 ? 'text-gray-300' :
                            index === 2 ? 'text-amber-600' :
                            'text-white'
                          }`}>
                            #{index + 1}
                          </div>
                        </div>
                        <div>
                          <button
                            onClick={() => openUserProfile(performer)}
                            className="text-white font-bold text-lg hover:text-blue-400 transition-colors cursor-pointer text-left"
                          >
                            {performer.username}
                          </button>
                          {performer.clan && (
                            <div className="text-xs text-gray-400">{performer.clan.name} [{performer.clan.tag}]</div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <div className="text-xl font-bold text-green-400">{performer.kd.toFixed(2)}</div>
                          <div className="text-xs text-gray-400">K/D Ratio</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-400">{performer.totalKills}</div>
                          <div className="text-xs text-gray-400">Kills</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-red-400">{performer.totalDeaths}</div>
                          <div className="text-xs text-gray-400">Deaths</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-purple-400">{performer.mvpCount}</div>
                          <div className="text-xs text-gray-400">MVP Awards</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-300">{performer.tournamentsPlayed}</div>
                          <div className="text-xs text-gray-400">Tournaments</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'clans' && (
          <div className="space-y-6">
            <h3 className="text-2xl font-semibold text-white flex items-center gap-3">
              <span className="text-orange-400">👑</span>
              Top Clans
              <span className="text-sm text-gray-400 font-normal">(by Tournament Wins)</span>
            </h3>
            
            {topClans.length === 0 ? (
              <div className="text-center py-16 bg-white/5 rounded-xl">
                <div className="text-6xl mb-4">👑</div>
                <h3 className="text-2xl font-bold text-white mb-2">No Clan Data</h3>
                <p className="text-gray-400">No clan performance data available yet</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {topClans.map((clan, index) => (
                  <div key={clan._id} className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${
                            index === 0 ? 'text-yellow-400' :
                            index === 1 ? 'text-gray-300' :
                            index === 2 ? 'text-amber-600' :
                            'text-white'
                          }`}>
                            #{index + 1}
                          </div>
                        </div>
                        <div>
                          <div className="text-white font-bold text-lg">{clan.name}</div>
                          <div className="text-xs text-gray-400">[{clan.tag}]</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <div className="text-xl font-bold text-yellow-400">{clan.wins}</div>
                          <div className="text-xs text-gray-400">Wins</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-400">{clan.winRate.toFixed(1)}%</div>
                          <div className="text-xs text-gray-400">Win Rate</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-400">{clan.tournamentsPlayed}</div>
                          <div className="text-xs text-gray-400">Tournaments</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-purple-400">${clan.totalPrizeMoney.toLocaleString()}</div>
                          <div className="text-xs text-gray-400">Prize Money</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-orange-400">{clan.avgPlacement.toFixed(1)}</div>
                          <div className="text-xs text-gray-400">Avg Place</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Profile Window */}
      <ProfileWindow
        isOpen={profileWindowOpen}
        onClose={closeUserProfile}
        walletAddress={selectedUser?.walletAddress}
        displayName={selectedUser?.displayName}
      />
    </Layout>
  );
}