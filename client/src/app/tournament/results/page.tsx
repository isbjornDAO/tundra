'use client';

import { useState, useEffect } from 'react';

// Prevent SSR for this page since it uses wagmi hooks
export const dynamic = 'force-dynamic';
import { AuthGuard } from '@/components/AuthGuard';
import { WagmiGuard } from '@/components/WagmiGuard';
import { Layout } from '@/components/Layout';
import { PlayerProfile } from '@/components/PlayerProfile';
import { 
  type Game, 
  type TournamentResult, 
  type PlayerStats,
  type LeaderboardEntry
} from '@/types/tournament';

// Mock data removed - now using real API data

// Mock team leaderboards removed - now using real API data

// Mock player leaderboards removed - now using real API data

// Top games for quick selection
const TOP_GAMES: Game[] = ['CS2', 'Valorant', 'League of Legends'];
const OTHER_GAMES: Game[] = ['Dota 2', 'Rocket League', 'Fortnite'];

function RecentTournamentCard({ result }: { result: TournamentResult }) {
  return (
    <div className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-white/20 transition-all hover:scale-[1.02]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-xl">🏆</div>
          <div>
            <h3 className="text-white font-semibold">{result.game}</h3>
            <p className="text-gray-400 text-xs">{result.completedAt.toLocaleDateString()}</p>
          </div>
        </div>
        {result.prizePool && (
          <div className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs font-medium">
            {result.prizePool}
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🥇</span>
          <span className="text-yellow-400 font-medium text-sm">{result.winner.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg">🥈</span>
          <span className="text-gray-300 font-medium text-sm">{result.runnerUp.name}</span>
        </div>
      </div>
    </div>
  );
}

function TeamLeaderboardCard({ entry }: { entry: LeaderboardEntry }) {
  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-orange-400';
    return 'text-gray-400';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getChangeIndicator = (change: number) => {
    if (change > 0) return <span className="text-green-400">↗ +{change}</span>;
    if (change < 0) return <span className="text-red-400">↘ {change}</span>;
    return <span className="text-gray-400">─</span>;
  };

  return (
    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`text-lg font-bold ${getRankColor(entry.rank)} min-w-[2.5rem]`}>
          {getRankIcon(entry.rank)}
        </div>
        
        <div>
          <h4 className="text-white font-semibold text-sm">{entry.teamName}</h4>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>{entry.points} pts</span>
            <span>{entry.wins}W/{entry.totalTournaments}T</span>
            <span>{entry.winRate}% WR</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {entry.recentForm.map((result, i) => (
            <div
              key={i}
              className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                result === 'W' ? 'bg-green-500 text-white' : 
                result === 'L' ? 'bg-red-500 text-white' : 
                'bg-gray-500 text-white'
              }`}
            >
              {result}
            </div>
          ))}
        </div>
        
        <div className="text-xs font-medium min-w-[2.5rem] text-right">
          {getChangeIndicator(entry.change)}
        </div>
      </div>
    </div>
  );
}

function PlayerLeaderboardCard({ player, rank, onViewProfile }: { player: PlayerStats; rank: number; onViewProfile: (player: PlayerStats) => void }) {
  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-orange-400';
    return 'text-gray-400';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors cursor-pointer" onClick={() => onViewProfile(player)}>
      <div className="flex items-center gap-3">
        <div className={`text-lg font-bold ${getRankColor(rank)} min-w-[2.5rem]`}>
          {getRankIcon(rank)}
        </div>
        
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
            {player.playerName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm">{player.playerName}</h4>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span>{player.wins} wins</span>
              <span>{player.totalTournaments} tournaments</span>
              <span>{player.winRate}% WR</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {player.recentForm.map((result, i) => (
            <div
              key={i}
              className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                result === 'W' ? 'bg-green-500 text-white' : 
                result === 'L' ? 'bg-red-500 text-white' : 
                'bg-gray-500 text-white'
              }`}
            >
              {result}
            </div>
          ))}
        </div>
        
        <div className="text-blue-400 text-xs">
          View →
        </div>
      </div>
    </div>
  );
}


export default function TournamentResults() {
  const [selectedGame, setSelectedGame] = useState<Game>('CS2');
  const [leaderboardType, setLeaderboardType] = useState<'teams' | 'players'>('teams');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStats | null>(null);
  const [data, setData] = useState({
    recentTournaments: [],
    teamLeaderboards: {},
    playerLeaderboards: {},
    loading: true
  });

  useEffect(() => {
    async function fetchLeaderboards() {
      try {
        const response = await fetch('/api/tournaments/leaderboards');
        if (response.ok) {
          const result = await response.json();
          setData({
            recentTournaments: result.recentTournaments || [],
            teamLeaderboards: result.teamLeaderboards || {},
            playerLeaderboards: result.playerLeaderboards || {},
            loading: false
          });
        }
      } catch (error) {
        console.error('Error fetching leaderboards:', error);
        setData(prev => ({ ...prev, loading: false }));
      }
    }
    fetchLeaderboards();
  }, []);

  return (
    <WagmiGuard>
      <AuthGuard>
        <Layout>
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Tournament Results</h1>
            <p className="text-gray-400">Recent tournaments and leaderboards</p>
          </div>

          {/* Recent Tournaments */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Recent Tournaments</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.loading ? (
                <div className="col-span-full text-center py-8">
                  <div className="text-white/60">Loading tournaments...</div>
                </div>
              ) : data.recentTournaments.length > 0 ? (
                data.recentTournaments.map((result) => (
                  <RecentTournamentCard key={result.id} result={result} />
                ))
              ) : (
                <div className="col-span-full text-center py-8">
                  <div className="text-gray-400 mb-2">No tournaments completed yet</div>
                  <p className="text-gray-500 text-sm">Recent tournament results will appear here.</p>
                </div>
              )}
            </div>
          </div>

          {/* Leaderboards */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Leaderboards</h2>
              
              {/* Teams/Players Toggle */}
              <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                <button
                  onClick={() => setLeaderboardType('teams')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    leaderboardType === 'teams'
                      ? 'bg-white/10 text-white border border-white/20'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Teams
                </button>
                <button
                  onClick={() => setLeaderboardType('players')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    leaderboardType === 'players'
                      ? 'bg-white/10 text-white border border-white/20'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Players
                </button>
              </div>
            </div>

            {/* Game Selection */}
            <div className="flex flex-wrap gap-3 mb-6">
              {/* Top Games as Buttons */}
              {TOP_GAMES.map(game => (
                <button
                  key={game}
                  onClick={() => setSelectedGame(game)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedGame === game
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/20'
                  }`}
                >
                  {game}
                </button>
              ))}
              
              {/* Other Games Dropdown */}
              <select
                value={OTHER_GAMES.includes(selectedGame) ? selectedGame : ''}
                onChange={(e) => e.target.value && setSelectedGame(e.target.value as Game)}
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white text-sm"
              >
                <option value="" className="bg-gray-900 text-white">More Games...</option>
                {OTHER_GAMES.map(game => (
                  <option key={game} value={game} className="bg-gray-900 text-white">
                    {game}
                  </option>
                ))}
              </select>
            </div>

            {/* Leaderboard Content */}
            <div className="bg-white/5 rounded-lg border border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  {selectedGame} - {leaderboardType === 'teams' ? 'Team' : 'Player'} Rankings
                </h3>
                <div className="text-gray-400 text-sm">
                  {leaderboardType === 'teams' 
                    ? `${data.teamLeaderboards[selectedGame]?.length || 0} teams`
                    : `${data.playerLeaderboards[selectedGame]?.length || 0} players`
                  }
                </div>
              </div>
              
              <div className="space-y-2">
                {data.loading ? (
                  <div className="text-center py-8">
                    <div className="text-white/60">Loading leaderboards...</div>
                  </div>
                ) : leaderboardType === 'teams' ? (
                  data.teamLeaderboards[selectedGame]?.length > 0 ? (
                    data.teamLeaderboards[selectedGame].map((entry) => (
                      <TeamLeaderboardCard key={entry.teamId} entry={entry} />
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-gray-400 mb-2">No team data available</div>
                      <p className="text-gray-500 text-sm">Teams will appear here once tournaments are completed.</p>
                    </div>
                  )
                ) : (
                  data.playerLeaderboards[selectedGame]?.length > 0 ? (
                    data.playerLeaderboards[selectedGame].map((player, index) => (
                      <PlayerLeaderboardCard 
                        key={player.playerId} 
                        player={player} 
                        rank={index + 1}
                        onViewProfile={setSelectedPlayer}
                      />
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-gray-400 mb-2">No player data available</div>
                      <p className="text-gray-500 text-sm">Players will appear here once tournaments are completed.</p>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Player Profile Modal */}
        {selectedPlayer && (
          <PlayerProfile
            player={selectedPlayer}
            achievements={[]}
            tournamentHistory={[]}
            onClose={() => setSelectedPlayer(null)}
          />
        )}
        </Layout>
      </AuthGuard>
    </WagmiGuard>
  );
}