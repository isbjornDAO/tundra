'use client';

import { useState } from 'react';
import { 
  type TeamStats, 
  type Achievement, 
  type Player
} from '@/types/tournament';

interface TeamProfileProps {
  team: TeamStats;
  onClose?: () => void;
}

// Mock team data for demo
const mockTeamData: TeamStats = {
  teamId: '1',
  teamName: 'Team Alpha',
  totalTournaments: 20,
  wins: 15,
  runnerUps: 3,
  topThrees: 18,
  totalMatches: 120,
  matchWins: 85,
  winRate: 75,
  bestPlacement: 1,
  totalPrizesMoney: 45000,
  currentRanking: 1,
  members: [
    { id: 'p1', name: 'ProGamer_2024' },
    { id: 'p2', name: 'EliteShooter' },
    { id: 'p3', name: 'StrategyKing' },
    { id: 'p4', name: 'QuickScope' },
    { id: 'p5', name: 'TeamCaptain' }
  ],
  recentForm: ['W', 'W', 'L', 'W', 'W'],
  achievements: [
    { id: '1', title: 'Champions League Winner', description: 'Won the Off the Grid Champions League', icon: '🏆', rarity: 'legendary', unlockedAt: new Date('2024-01-15') },
    { id: '2', title: 'Perfect Season', description: 'Won 10 tournaments in a row', icon: '🔥', rarity: 'epic', unlockedAt: new Date('2024-01-01') }
  ]
};

const mockTeamHistory = [
  { id: '1', tournament: 'Off the Grid Champions', placement: 1, prize: '$5,000', date: new Date('2024-01-15') },
  { id: '2', tournament: 'Winter Cup Off the Grid', placement: 3, prize: '$1,500', date: new Date('2024-01-01') },
  { id: '3', tournament: 'Regional Masters', placement: 1, prize: '$3,000', date: new Date('2023-12-20') },
  { id: '4', tournament: 'Holiday Tournament', placement: 2, prize: '$2,000', date: new Date('2023-12-10') },
  { id: '5', tournament: 'Fall Championship', placement: 1, prize: '$4,000', date: new Date('2023-11-25') }
];

function StatCard({ title, value, subtitle, icon, color = 'text-white' }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color?: string;
}) {
  return (
    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
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

function MemberCard({ member }: { member: Player }) {
  return (
    <div className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
          {member.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h4 className="text-white font-semibold text-sm">{member.name}</h4>
          <p className="text-gray-400 text-xs">Team Member</p>
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

  return (
    <div className={`p-3 rounded-lg border ${getRarityColor(achievement.rarity)} hover:scale-105 transition-transform`}>
      <div className="text-center">
        <div className="text-2xl mb-1">{achievement.icon}</div>
        <h4 className="text-white font-semibold text-xs">{achievement.title}</h4>
        <p className="text-gray-400 text-xs mt-1">{achievement.description}</p>
      </div>
    </div>
  );
}

export function TeamProfile({ onClose }: TeamProfileProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'achievements' | 'history'>('overview');

  const tabs = [
    { id: 'overview' as const, label: '📊 Overview' },
    { id: 'members' as const, label: '👥 Members' },
    { id: 'achievements' as const, label: '🎖️ Achievements' },
    { id: 'history' as const, label: '📜 History' }
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden border border-white/10">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                {mockTeamData.teamName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{mockTeamData.teamName}</h2>
                <p className="text-gray-400">Esports Team • Rank #{mockTeamData.currentRanking}</p>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span className="text-yellow-400 font-medium">💰 ${mockTeamData.totalPrizesMoney.toLocaleString()} earned</span>
                  <span className="text-green-400 font-medium">🏆 {mockTeamData.wins} wins</span>
                  <span className="text-blue-400 font-medium">📊 {mockTeamData.winRate}% win rate</span>
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
                <h3 className="text-lg font-semibold text-white mb-4">Team Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard title="Tournaments" value={mockTeamData.totalTournaments} icon="🎮" />
                  <StatCard title="Win Rate" value={`${mockTeamData.winRate}%`} icon="📈" color="text-green-400" />
                  <StatCard title="Best Placement" value={`#${mockTeamData.bestPlacement}`} icon="🏅" color="text-yellow-400" />
                  <StatCard title="Current Rank" value={`#${mockTeamData.currentRanking}`} icon="⭐" color="text-blue-400" />
                </div>
              </div>

              {/* Performance Breakdown */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Performance Breakdown</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <h4 className="text-white font-semibold mb-3">Tournament Placements</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">1st Place</span>
                        <span className="text-yellow-400 font-semibold">{mockTeamData.wins}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">2nd Place</span>
                        <span className="text-gray-300 font-semibold">{mockTeamData.runnerUps}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Top 3</span>
                        <span className="text-orange-400 font-semibold">{mockTeamData.topThrees}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <h4 className="text-white font-semibold mb-3">Match Performance</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Matches</span>
                        <span className="text-white font-semibold">{mockTeamData.totalMatches}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Match Wins</span>
                        <span className="text-green-400 font-semibold">{mockTeamData.matchWins}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Match Losses</span>
                        <span className="text-red-400 font-semibold">{mockTeamData.totalMatches - mockTeamData.matchWins}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <h4 className="text-white font-semibold mb-3">Recent Form</h4>
                    <div className="flex gap-2 justify-center">
                      {mockTeamData.recentForm.map((result, i) => (
                        <div
                          key={i}
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            result === 'W' ? 'bg-green-500 text-white' : 
                            result === 'L' ? 'bg-red-500 text-white' : 
                            'bg-gray-500 text-white'
                          }`}
                        >
                          {result}
                        </div>
                      ))}
                    </div>
                    <p className="text-gray-400 text-xs text-center mt-2">Last 5 tournaments</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Team Members</h3>
                <div className="text-gray-400 text-sm">{mockTeamData.members.length} members</div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {mockTeamData.members.map((member) => (
                  <MemberCard key={member.id} member={member} />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'achievements' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Team Achievements</h3>
                <div className="text-gray-400 text-sm">{mockTeamData.achievements.length} unlocked</div>
              </div>
              
              <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {mockTeamData.achievements.map((achievement) => (
                  <AchievementBadge key={achievement.id} achievement={achievement} />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Tournament History</h3>
              
              <div className="space-y-3">
                {mockTeamHistory.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
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
                        <h4 className="text-white font-semibold">{entry.tournament}</h4>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span>#{entry.placement} Place</span>
                          <span>{entry.date.toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-green-400 font-medium">
                      {entry.prize}
                    </div>
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