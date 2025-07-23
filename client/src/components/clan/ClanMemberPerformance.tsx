'use client';

import { useState, useEffect } from 'react';
import { ProfileWindow } from '@/components/ProfileWindow';

interface ClanMemberPerformanceProps {
  clanId: string;
}

interface MemberPerformance {
  _id: string;
  username: string;
  displayName: string;
  walletAddress: string;
  stats: {
    level: number;
    xp: number;
    matchesPlayed: number;
    matchesWon: number;
    averageScore: number;
    winRate: number;
    avgKills: number;
    avgDeaths: number;
    kd: number;
  };
  recentPerformance: Array<{
    matchId: string;
    score: number;
    kills: number;
    deaths: number;
    assists: number;
    xpEarned: number;
    matchResult: 'win' | 'loss';
    playedAt: string;
  }>;
  rank: number;
}

export default function ClanMemberPerformance({ clanId }: ClanMemberPerformanceProps) {
  const [members, setMembers] = useState<MemberPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<MemberPerformance | null>(null);
  const [sortBy, setSortBy] = useState<'xp' | 'winRate' | 'kd' | 'averageScore'>('xp');
  const [profileWindowOpen, setProfileWindowOpen] = useState(false);

  useEffect(() => {
    const fetchMemberPerformance = async () => {
      if (!clanId) return;
      
      setLoading(true);
      try {
        const response = await fetch(`/api/clans/${clanId}/members/performance`);
        if (response.ok) {
          const data = await response.json();
          setMembers(data.members || []);
        }
      } catch (error) {
        console.error('Error fetching member performance:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMemberPerformance();
  }, [clanId]);

  const openMemberProfile = (member: MemberPerformance) => {
    setSelectedMember(member);
    setProfileWindowOpen(true);
  };

  const closeMemberProfile = () => {
    setProfileWindowOpen(false);
    setSelectedMember(null);
  };

  const sortedMembers = [...members].sort((a, b) => {
    switch (sortBy) {
      case 'xp':
        return b.stats.xp - a.stats.xp;
      case 'winRate':
        return b.stats.winRate - a.stats.winRate;
      case 'kd':
        return b.stats.kd - a.stats.kd;
      case 'averageScore':
        return b.stats.averageScore - a.stats.averageScore;
      default:
        return 0;
    }
  });

  const getXPToNextLevel = (currentXP: number, level: number) => {
    const nextLevelXP = level * 1000;
    return Math.max(0, nextLevelXP - currentXP);
  };

  const getXPProgress = (currentXP: number, level: number) => {
    const currentLevelXP = (level - 1) * 1000;
    const nextLevelXP = level * 1000;
    const progress = ((currentXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
    return Math.min(100, Math.max(0, progress));
  };

  if (loading) {
    return (
      <div className="card mb-8">
        <div className="text-center py-8">
          <div className="text-gray-400">Loading member performance...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <span className="text-purple-400">⭐</span>
          Member Performance & XP
        </h2>
        <div className="flex gap-2">
          {[
            { key: 'xp', label: 'XP' },
            { key: 'winRate', label: 'Win %' },
            { key: 'kd', label: 'K/D' },
            { key: 'averageScore', label: 'Avg Score' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortBy(key as any)}
              className={`px-3 py-1 rounded-lg text-sm transition-all ${
                sortBy === key
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20'
                  : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {members.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">No performance data yet</div>
          <div className="text-sm text-gray-500">
            Member performance will be tracked after participating in matches
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedMembers.map((member, index) => (
            <div 
              key={member._id} 
              className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800/70 transition-all cursor-pointer"
              onClick={() => setSelectedMember(selectedMember?._id === member._id ? null : member)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Rank Badge */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                    index === 1 ? 'bg-gray-400/20 text-gray-300' :
                    index === 2 ? 'bg-orange-500/20 text-orange-400' :
                    'bg-gray-600/20 text-gray-400'
                  }`}>
                    {index + 1}
                  </div>

                  {/* Player Info */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {member.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <button
                        onClick={() => openMemberProfile(member)}
                        className="text-white font-medium hover:text-blue-400 transition-colors cursor-pointer text-left"
                      >
                        {member.displayName || member.username}
                      </button>
                      <div className="text-gray-400 text-sm">@{member.username}</div>
                    </div>
                  </div>

                  {/* Level & XP */}
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-1">
                    <div className="text-purple-400 font-bold text-sm">
                      Level {member.stats.level}
                    </div>
                    <div className="text-xs text-gray-400">
                      {member.stats.xp.toLocaleString()} XP
                    </div>
                  </div>
                </div>

                {/* Stats Overview */}
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-white font-semibold">{member.stats.matchesPlayed}</div>
                    <div className="text-gray-400 text-xs">Matches</div>
                  </div>
                  <div className="text-center">
                    <div className="text-green-400 font-semibold">{member.stats.winRate}%</div>
                    <div className="text-gray-400 text-xs">Win Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-blue-400 font-semibold">{member.stats.kd}</div>
                    <div className="text-gray-400 text-xs">K/D</div>
                  </div>
                  <div className="text-center">
                    <div className="text-yellow-400 font-semibold">{member.stats.averageScore}</div>
                    <div className="text-gray-400 text-xs">Avg Score</div>
                  </div>
                </div>
              </div>

              {/* XP Progress Bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-400">Level {member.stats.level} Progress</span>
                  <span className="text-purple-400">
                    {getXPToNextLevel(member.stats.xp, member.stats.level)} XP to next level
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getXPProgress(member.stats.xp, member.stats.level)}%` }}
                  />
                </div>
              </div>

              {/* Expanded Details */}
              {selectedMember?._id === member._id && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Detailed Stats */}
                    <div>
                      <h4 className="text-white font-medium mb-3">Detailed Stats</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total Matches:</span>
                          <span className="text-white">{member.stats.matchesPlayed}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Wins:</span>
                          <span className="text-green-400">{member.stats.matchesWon}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Losses:</span>
                          <span className="text-red-400">{member.stats.matchesPlayed - member.stats.matchesWon}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Avg Kills:</span>
                          <span className="text-green-400">{member.stats.avgKills}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Avg Deaths:</span>
                          <span className="text-red-400">{member.stats.avgDeaths}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">K/D Ratio:</span>
                          <span className="text-blue-400">{member.stats.kd}</span>
                        </div>
                      </div>
                    </div>

                    {/* Recent Performance */}
                    <div>
                      <h4 className="text-white font-medium mb-3">Recent Matches</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {member.recentPerformance.length > 0 ? (
                          member.recentPerformance.slice(0, 5).map((match, idx) => (
                            <div key={idx} className="bg-gray-800/30 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className={`px-2 py-1 rounded text-xs font-medium ${
                                  match.matchResult === 'win' 
                                    ? 'bg-green-500/20 text-green-400' 
                                    : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {match.matchResult === 'win' ? 'WIN' : 'LOSS'}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {new Date(match.playedAt).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div className="text-center">
                                  <div className="text-white font-medium">{match.score}</div>
                                  <div className="text-gray-400">Score</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-green-400">{match.kills}/{match.deaths}</div>
                                  <div className="text-gray-400">K/D</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-purple-400">+{match.xpEarned}</div>
                                  <div className="text-gray-400">XP</div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-400 text-sm">No recent matches</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Profile Window */}
      <ProfileWindow
        isOpen={profileWindowOpen}
        onClose={closeMemberProfile}
        walletAddress={selectedMember?.walletAddress}
        displayName={selectedMember?.displayName}
      />
    </div>
  );
}