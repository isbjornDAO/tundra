'use client';

import { useQuery } from '@tanstack/react-query';

interface PlayerProfileData {
  organizer: string;
  totalTournaments: number;
  activeTournaments: number;
  completedTournaments: number;
  tournamentWins: number;
  tournamentRunnerUps: number;
  totalMatches: number;
  completedMatches: number;
  matchWins: number;
  winRate: number;
  recentForm: string[];
  gameStats: {
    [gameName: string]: {
      played: number;
      wins: number;
      runnerUps: number;
    };
  };
  recentMatches: unknown[];
}

interface PlayerProfile {
  playerName: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  totalPrizesMoney: number;
  wins: number;
  totalTournaments: number;
  winRate: number;
  trophies: Array<{
    id: string;
    name: string;
    icon: string;
    date: string;
  }>;
  badges: Array<{
    id: string;
    name: string;
    icon: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
  }>;
}

const fetchPlayerStats = async (walletAddress: string): Promise<PlayerProfileData> => {
  const response = await fetch(`/api/tournaments/stats?organizer=${walletAddress}`);
  if (!response.ok) {
    throw new Error('Failed to fetch player stats');
  }
  return response.json();
};

const generateBadges = (stats: PlayerProfileData) => {
  const badges = [];
  
  // Early Adopter badge
  badges.push({
    id: 'early-adopter',
    name: 'Early Adopter',
    icon: '🚀',
    rarity: 'rare' as const
  });

  // Tournament participation badges
  if (stats.totalTournaments >= 1) {
    badges.push({
      id: 'competitor',
      name: 'Competitor',
      icon: '⚔️',
      rarity: 'common' as const
    });
  }

  if (stats.totalTournaments >= 5) {
    badges.push({
      id: 'veteran',
      name: 'Veteran',
      icon: '🎖️',
      rarity: 'rare' as const
    });
  }

  if (stats.totalTournaments >= 10) {
    badges.push({
      id: 'champion',
      name: 'Champion',
      icon: '👑',
      rarity: 'epic' as const
    });
  }

  // Win-based badges
  if (stats.tournamentWins >= 1) {
    badges.push({
      id: 'winner',
      name: 'Winner',
      icon: '🏆',
      rarity: 'rare' as const
    });
  }

  if (stats.tournamentWins >= 3) {
    badges.push({
      id: 'dominator',
      name: 'Dominator',
      icon: '⚡',
      rarity: 'epic' as const
    });
  }

  if (stats.tournamentWins >= 5) {
    badges.push({
      id: 'legend',
      name: 'Legend',
      icon: '🌟',
      rarity: 'legendary' as const
    });
  }

  // Win rate badges
  if (stats.winRate >= 50) {
    badges.push({
      id: 'consistent',
      name: 'Consistent',
      icon: '📈',
      rarity: 'rare' as const
    });
  }

  if (stats.winRate >= 75) {
    badges.push({
      id: 'elite',
      name: 'Elite',
      icon: '💎',
      rarity: 'epic' as const
    });
  }

  return badges;
};

const generateTrophies = (stats: PlayerProfileData) => {
  const trophies = [];
  
  // Create trophies based on wins and achievements
  if (stats.tournamentWins >= 1) {
    trophies.push({
      id: 'first-win',
      name: 'First Victory',
      icon: '🥇',
      date: new Date().toISOString() // Would be actual date from match data
    });
  }

  if (stats.tournamentRunnerUps >= 1) {
    trophies.push({
      id: 'runner-up',
      name: 'Runner-up',
      icon: '🥈',
      date: new Date().toISOString()
    });
  }

  if (stats.totalMatches >= 10) {
    trophies.push({
      id: 'active-player',
      name: 'Active Player',
      icon: '🎮',
      date: new Date().toISOString()
    });
  }

  return trophies;
};

const transformStatsToProfile = (stats: PlayerProfileData, displayName?: string): PlayerProfile => {
  // Calculate level based on total tournaments and wins
  const level = Math.floor(stats.totalTournaments / 2) + stats.tournamentWins + 1;
  const xp = (stats.totalTournaments * 100) + (stats.tournamentWins * 500) + (stats.matchWins * 50);
  const xpToNextLevel = (level + 1) * 300;

  // Estimate prize money (would come from actual tournament data)
  const estimatedPrizesMoney = (stats.tournamentWins * 1000) + (stats.tournamentRunnerUps * 500);

  return {
    playerName: displayName || 'Anonymous Player',
    level,
    xp,
    xpToNextLevel,
    totalPrizesMoney: estimatedPrizesMoney,
    wins: stats.tournamentWins,
    totalTournaments: stats.totalTournaments,
    winRate: Math.round(stats.winRate || 0),
    trophies: generateTrophies(stats),
    badges: generateBadges(stats)
  };
};

export const usePlayerProfile = (walletAddress?: string, displayName?: string) => {
  const {
    data: statsData,
    error,
    isLoading
  } = useQuery({
    queryKey: ['playerStats', walletAddress],
    queryFn: () => fetchPlayerStats(walletAddress!),
    enabled: !!walletAddress,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const profileData = statsData ? transformStatsToProfile(statsData, displayName) : null;

  return {
    data: profileData,
    error,
    isLoading
  };
};