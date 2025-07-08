'use client';

import { useState } from 'react';
import { 
  type PlayerStats, 
  type Achievement, 
  type TournamentResult,
  type Game,
  GAMES 
} from '@/types/tournament';

interface PlayerProfileProps {
  player: PlayerStats;
  achievements: Achievement[];
  tournamentHistory: TournamentResult[];
  onClose?: () => void;
}

interface TournamentEntry {
  id: string;
  game: Game;
  placement: number;
  teamName: string;
  prizePool?: string;
  date: Date;
  region: string;
}

// Default empty tournament history for new players
const defaultTournamentHistory: TournamentEntry[] = [];

function StatCard({ title, value, subtitle, icon, color = 'text-white' }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color?: string;
}) {
  return (
    <div className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors">
      <div className="flex items-center gap-3">
        <div className="text-2xl">{icon}</div>
        <div>
          <div className="text-gray-400 text-sm">{title}</div>
          <div className={`font-bold text-lg ${color}`}>{value}</div>
          {subtitle && <div className="text-gray-500 text-xs">{subtitle}</div>}
        </div>
      </div>
    </div>
  );
}

function TrophyRoomCard({ entry }: { entry: TournamentEntry }) {
  const getPlacementColor = (placement: number) => {
    if (placement === 1) return 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400';
    if (placement === 2) return 'bg-gray-400/20 border-gray-400/40 text-gray-300';
    if (placement === 3) return 'bg-orange-500/20 border-orange-500/40 text-orange-400';
    return 'bg-blue-500/20 border-blue-500/40 text-blue-400';
  };

  const getPlacementIcon = (placement: number) => {
    if (placement === 1) return '🥇';
    if (placement === 2) return '🥈';
    if (placement === 3) return '🥉';
    return '🏅';
  };

  return (
    <div className={`p-4 rounded-lg border ${getPlacementColor(entry.placement)} hover:scale-105 transition-transform`}>
      <div className="text-center">
        <div className="text-3xl mb-2">{getPlacementIcon(entry.placement)}</div>
        <h4 className="font-semibold text-sm mb-1">{entry.game}</h4>
        <p className="text-xs opacity-80 mb-2">#{entry.placement} • {entry.teamName}</p>
        <div className="text-xs opacity-60">
          <div>{entry.region}</div>
          <div>{entry.date.toLocaleDateString()}</div>
          {entry.prizePool && <div className="font-medium mt-1">{entry.prizePool}</div>}
        </div>
      </div>
    </div>
  );
}

function AchievementBadge({ achievement }: { achievement: Achievement }) {
  const getRarityColor = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'common': return 'border-gray-500/40 bg-gray-500/10';
      case 'rare': return 'border-blue-500/40 bg-blue-500/10';
      case 'epic': return 'border-purple-500/40 bg-purple-500/10';
      case 'legendary': return 'border-yellow-500/40 bg-yellow-500/10';
    }
  };

  const getRarityGlow = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'common': return '';
      case 'rare': return 'shadow-lg shadow-blue-500/20';
      case 'epic': return 'shadow-lg shadow-purple-500/20';
      case 'legendary': return 'shadow-lg shadow-yellow-500/30 animate-pulse';
    }
  };

  return (
    <div className={`p-3 rounded-lg border ${getRarityColor(achievement.rarity)} ${getRarityGlow(achievement.rarity)} hover:scale-105 transition-transform`}>
      <div className="text-center">
        <div className="text-2xl mb-1">{achievement.icon}</div>
        <h4 className="text-white font-semibold text-xs">{achievement.title}</h4>
        <p className="text-gray-400 text-xs mt-1 line-clamp-2">{achievement.description}</p>
        <div className="mt-2">
          <span className={`text-xs px-2 py-1 rounded-full capitalize ${
            achievement.rarity === 'common' ? 'bg-gray-500/20 text-gray-400' :
            achievement.rarity === 'rare' ? 'bg-blue-500/20 text-blue-400' :
            achievement.rarity === 'epic' ? 'bg-purple-500/20 text-purple-400' :
            'bg-yellow-500/20 text-yellow-400'
          }`}>
            {achievement.rarity}
          </span>
        </div>
      </div>
    </div>
  );
}

export function PlayerProfile({ player, achievements, onClose }: PlayerProfileProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'trophies' | 'achievements' | 'history'>('overview');

  const tabs = [
    { id: 'overview' as const, label: '📊 Overview', icon: '📊' },
    { id: 'trophies' as const, label: '🏆 Trophy Room', icon: '🏆' },
    { id: 'achievements' as const, label: '🎖️ Achievements', icon: '🎖️' },
    { id: 'history' as const, label: '📜 Match History', icon: '📜' }
  ];

  const gameStats = GAMES.map(game => {
    const gameEntries = mockTournamentHistory.filter(entry => entry.game === game);
    const wins = gameEntries.filter(entry => entry.placement === 1).length;
    const totalGames = gameEntries.length;
    
    return {
      game,
      totalTournaments: totalGames,
      wins,
      winRate: totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0,
      bestPlacement: totalGames > 0 ? Math.min(...gameEntries.map(entry => entry.placement)) : null
    };
  }).filter(stat => stat.totalTournaments > 0);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden border border-white/10">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                {player.playerName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{player.playerName}</h2>
                <p className="text-gray-400">Esports Player • Favorite: {player.favoriteGame}</p>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span className="text-yellow-400 font-medium">💰 ${player.totalPrizesMoney.toLocaleString()} earned</span>
                  <span className="text-green-400 font-medium">🏆 {player.wins} tournaments won</span>
                  <span className="text-blue-400 font-medium">📊 {player.winRate}% win rate</span>
                </div>
              </div>
            </div>
            
            {onClose && (
              <button 
                onClick={onClose}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-white/5 p-1 mx-6 mt-4 rounded-lg border border-white/10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Overall Stats */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Overall Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard title="Tournaments" value={player.totalTournaments} icon="🎮" />
                  <StatCard title="Win Rate" value={`${player.winRate}%`} icon="📈" color="text-green-400" />
                  <StatCard title="Best Placement" value={`#${player.bestPlacement}`} icon="🏅" color="text-yellow-400" />
                  <StatCard title="Total Matches" value={player.totalMatches} icon="⚔️" />
                </div>
              </div>

              {/* Game Breakdown */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Performance by Game</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {gameStats.map((stat) => (
                    <div key={stat.game} className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-white font-semibold">{stat.game}</h4>
                        <span className="text-gray-400 text-sm">{stat.totalTournaments} tournaments</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <div className="text-gray-400">Wins</div>
                          <div className="text-green-400 font-semibold">{stat.wins}</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Win Rate</div>
                          <div className="text-white font-semibold">{stat.winRate}%</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Best</div>
                          <div className="text-yellow-400 font-semibold">#{stat.bestPlacement}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Form */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Recent Form</h3>
                <div className="flex items-center gap-2">
                  {player.recentForm.map((result, i) => (
                    <div
                      key={i}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                        result === 'W' ? 'bg-green-500 text-white' : 
                        result === 'L' ? 'bg-red-500 text-white' : 
                        'bg-gray-500 text-white'
                      }`}
                    >
                      {result}
                    </div>
                  ))}
                  <span className="text-gray-400 text-sm ml-4">Last 5 tournaments</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'trophies' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Trophy Room</h3>
                <div className="text-gray-400 text-sm">{mockTournamentHistory.length} tournaments</div>
              </div>
              
              <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {mockTournamentHistory.map((entry) => (
                  <TrophyRoomCard key={entry.id} entry={entry} />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'achievements' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Achievement Collection</h3>
                <div className="text-gray-400 text-sm">{achievements.length} unlocked</div>
              </div>
              
              <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {achievements.map((achievement) => (
                  <AchievementBadge key={achievement.id} achievement={achievement} />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Tournament History</h3>
              
              <div className="space-y-3">
                {mockTournamentHistory.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`text-2xl ${
                        entry.placement === 1 ? 'text-yellow-400' :
                        entry.placement === 2 ? 'text-gray-300' :
                        entry.placement === 3 ? 'text-orange-400' :
                        'text-blue-400'
                      }`}>
                        {entry.placement === 1 ? '🥇' :
                         entry.placement === 2 ? '🥈' :
                         entry.placement === 3 ? '🥉' : '🏅'}
                      </div>
                      
                      <div>
                        <h4 className="text-white font-semibold">{entry.game} Tournament</h4>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span>#{entry.placement} • {entry.teamName}</span>
                          <span>{entry.region}</span>
                          <span>{entry.date.toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    {entry.prizePool && (
                      <div className="text-green-400 font-medium">
                        {entry.prizePool}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}