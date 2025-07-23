// Achievement definitions for tournament system

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: 'tournament' | 'performance' | 'milestone' | 'game-specific';
  requirements: {
    type: string;
    value: number;
    game?: string;
  };
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  description: string;
}

// Tournament Achievements
export const ACHIEVEMENTS: Achievement[] = [
  // General Tournament Achievements
  {
    id: 'first-tournament',
    name: 'Tournament Debut',
    description: 'Play in your first tournament',
    icon: '🎯',
    rarity: 'common',
    category: 'milestone',
    requirements: { type: 'tournaments_played', value: 1 }
  },
  {
    id: 'tournament-veteran',
    name: 'Tournament Veteran',
    description: 'Compete in 5 tournaments',
    icon: '🎖️',
    rarity: 'rare',
    category: 'milestone',
    requirements: { type: 'tournaments_played', value: 5 }
  },
  {
    id: 'tournament-champion',
    name: 'Champion',
    description: 'Win your first tournament',
    icon: '🏆',
    rarity: 'epic',
    category: 'tournament',
    requirements: { type: 'tournament_wins', value: 1 }
  },
  {
    id: 'triple-crown',
    name: 'Triple Crown',
    description: 'Win 3 tournaments',
    icon: '👑',
    rarity: 'legendary',
    category: 'tournament',
    requirements: { type: 'tournament_wins', value: 3 }
  },

  // Performance Achievements
  {
    id: 'sharpshooter',
    name: 'Sharpshooter',
    description: 'Achieve a K/D ratio of 2.0 or higher across all tournaments',
    icon: '🎯',
    rarity: 'rare',
    category: 'performance',
    requirements: { type: 'overall_kd', value: 2.0 }
  },
  {
    id: 'mvp-player',
    name: 'MVP Player',
    description: 'Earn 3 MVP awards',
    icon: '⭐',
    rarity: 'epic',
    category: 'performance',
    requirements: { type: 'mvp_count', value: 3 }
  },
  {
    id: 'unstoppable',
    name: 'Unstoppable Force',
    description: 'Get 100 total kills in tournaments',
    icon: '💀',
    rarity: 'rare',
    category: 'performance',
    requirements: { type: 'total_kills', value: 100 }
  },
  {
    id: 'perfect-run',
    name: 'Perfect Run',
    description: 'Win a tournament without losing a single match',
    icon: '✨',
    rarity: 'legendary',
    category: 'tournament',
    requirements: { type: 'perfect_tournament', value: 1 }
  },

  // Game-Specific Achievements
  {
    id: 'otg-champion',
    name: 'Off the Grid Champion',
    description: 'Win an Off the Grid tournament',
    icon: '🏝️',
    rarity: 'epic',
    category: 'game-specific',
    requirements: { type: 'game_tournament_win', value: 1, game: 'Off the Grid' }
  },
  {
    id: 'cs2-champion',
    name: 'Counter-Strike 2 Champion',
    description: 'Win a Counter-Strike 2 tournament',
    icon: '🔫',
    rarity: 'epic',
    category: 'game-specific',
    requirements: { type: 'game_tournament_win', value: 1, game: 'Counter-Strike 2' }
  },
  {
    id: 'valorant-champion',
    name: 'Valorant Champion',
    description: 'Win a Valorant tournament',
    icon: '🎯',
    rarity: 'epic',
    category: 'game-specific',
    requirements: { type: 'game_tournament_win', value: 1, game: 'Valorant' }
  },
  {
    id: 'apex-champion',
    name: 'Apex Legends Champion',
    description: 'Win an Apex Legends tournament',
    icon: '🏔️',
    rarity: 'epic',
    category: 'game-specific',
    requirements: { type: 'game_tournament_win', value: 1, game: 'Apex Legends' }
  },
  {
    id: 'fortnite-champion',
    name: 'Fortnite Champion',
    description: 'Win a Fortnite tournament',
    icon: '🏗️',
    rarity: 'epic',
    category: 'game-specific',
    requirements: { type: 'game_tournament_win', value: 1, game: 'Fortnite' }
  },
  {
    id: 'pubg-champion',
    name: 'PUBG Champion',
    description: 'Win a PUBG tournament',
    icon: '🪂',
    rarity: 'epic',
    category: 'game-specific',
    requirements: { type: 'game_tournament_win', value: 1, game: 'PUBG' }
  },

  // Win Streak Achievements
  {
    id: 'hot-streak',
    name: 'Hot Streak',
    description: 'Win 5 matches in a row',
    icon: '🔥',
    rarity: 'rare',
    category: 'performance',
    requirements: { type: 'win_streak', value: 5 }
  },
  {
    id: 'domination',
    name: 'Domination',
    description: 'Win 10 matches in a row',
    icon: '💪',
    rarity: 'legendary',
    category: 'performance',
    requirements: { type: 'win_streak', value: 10 }
  },

  // Milestone Achievements
  {
    id: 'level-5',
    name: 'Rising Star',
    description: 'Reach Level 5',
    icon: '🌟',
    rarity: 'common',
    category: 'milestone',
    requirements: { type: 'level', value: 5 }
  },
  {
    id: 'level-10',
    name: 'Seasoned Competitor',
    description: 'Reach Level 10',
    icon: '🌠',
    rarity: 'rare',
    category: 'milestone',
    requirements: { type: 'level', value: 10 }
  },
  {
    id: 'high-roller',
    name: 'High Roller',
    description: 'Earn $10,000 in total prize money',
    icon: '💰',
    rarity: 'legendary',
    category: 'milestone',
    requirements: { type: 'total_prize_money', value: 10000 }
  }
];

// Badge definitions (simpler than achievements, awarded for participation)
export const BADGES: Badge[] = [
  // Participation Badges
  {
    id: 'otg-competitor',
    name: 'Off the Grid Competitor',
    icon: '🏝️',
    rarity: 'common',
    description: 'Participated in an Off the Grid tournament'
  },
  {
    id: 'cs2-competitor',
    name: 'CS2 Competitor', 
    icon: '🔫',
    rarity: 'common',
    description: 'Participated in a Counter-Strike 2 tournament'
  },
  {
    id: 'valorant-competitor',
    name: 'Valorant Competitor',
    icon: '🎯',
    rarity: 'common',
    description: 'Participated in a Valorant tournament'
  },
  {
    id: 'apex-competitor',
    name: 'Apex Competitor',
    icon: '🏔️',
    rarity: 'common',
    description: 'Participated in an Apex Legends tournament'
  },
  {
    id: 'fortnite-competitor',
    name: 'Fortnite Competitor',
    icon: '🏗️',
    rarity: 'common',
    description: 'Participated in a Fortnite tournament'
  },
  {
    id: 'pubg-competitor',
    name: 'PUBG Competitor',
    icon: '🪂',
    rarity: 'common',
    description: 'Participated in a PUBG tournament'
  },

  // Special Event Badges
  {
    id: 'founding-member',
    name: 'Founding Member',
    icon: '🏛️',
    rarity: 'legendary',
    description: 'Participated in the first tournaments on the platform'
  },
  {
    id: 'comeback-kid',
    name: 'Comeback Kid',
    icon: '🔄',
    rarity: 'rare',
    description: 'Won a match after losing the first round'
  },
  {
    id: 'team-player',
    name: 'Team Player',
    icon: '🤝',
    rarity: 'common',
    description: 'High assist count relative to kills'
  },
  {
    id: 'survivor',
    name: 'Survivor',
    icon: '🛡️',
    rarity: 'rare',
    description: 'Lowest death count in a tournament'
  }
];

// Function to check if a user has earned an achievement
export function checkAchievement(achievement: Achievement, userStats: any, tournamentHistory: any[]): boolean {
  switch (achievement.requirements.type) {
    case 'tournaments_played':
      return userStats.totalTournaments >= achievement.requirements.value;
    
    case 'tournament_wins':
      return userStats.wins >= achievement.requirements.value;
    
    case 'overall_kd':
      return userStats.kd >= achievement.requirements.value;
    
    case 'mvp_count':
      return userStats.mvpCount >= achievement.requirements.value;
    
    case 'total_kills':
      return userStats.totalKills >= achievement.requirements.value;
    
    case 'level':
      return userStats.level >= achievement.requirements.value;
    
    case 'total_prize_money':
      return userStats.totalPrizeMoney >= achievement.requirements.value;
    
    case 'game_tournament_win':
      return tournamentHistory.some(t => 
        t.tournament.game === achievement.requirements.game &&
        t.stats.winRate === 100 &&
        t.matches.some(m => m.round === 'final' && m.isWin)
      );
    
    case 'perfect_tournament':
      return tournamentHistory.some(t => 
        t.stats.winRate === 100 && 
        t.matches.length > 1
      );
    
    case 'win_streak':
      // Calculate longest win streak from recent form
      let maxStreak = 0;
      let currentStreak = 0;
      userStats.recentForm?.forEach((result: string) => {
        if (result === 'W') {
          currentStreak++;
          maxStreak = Math.max(maxStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      });
      return maxStreak >= achievement.requirements.value;
    
    default:
      return false;
  }
}

// Function to check which badges a user has earned
export function checkBadges(userStats: any, tournamentHistory: any[]): string[] {
  const earnedBadges: string[] = [];
  
  // Game participation badges
  const gamesPlayed = new Set(tournamentHistory.map(t => t.tournament.game));
  
  if (gamesPlayed.has('Off the Grid')) earnedBadges.push('otg-competitor');
  if (gamesPlayed.has('Counter-Strike 2')) earnedBadges.push('cs2-competitor');
  if (gamesPlayed.has('Valorant')) earnedBadges.push('valorant-competitor');
  if (gamesPlayed.has('Apex Legends')) earnedBadges.push('apex-competitor');
  if (gamesPlayed.has('Fortnite')) earnedBadges.push('fortnite-competitor');
  if (gamesPlayed.has('PUBG')) earnedBadges.push('pubg-competitor');
  
  // Founding member badge (first 2 tournaments - exact string match)
  const foundingTournamentIds = ['687dbcd33e6c1b61936ee10c', '688014f97c61a02b4e53b25d'];
  const hasFoundingTournament = tournamentHistory.some(t => 
    foundingTournamentIds.includes(String(t.tournament.id))
  );
  if (hasFoundingTournament) {
    earnedBadges.push('founding-member');
  }
  
  // Team player badge (high assist ratio)
  const assistRatio = userStats.totalAssists / (userStats.totalKills || 1);
  if (assistRatio > 0.5) earnedBadges.push('team-player');
  
  // Survivor badge (low death rate)
  const deathRate = userStats.totalDeaths / (userStats.totalMatches || 1);
  if (deathRate < 10 && userStats.totalMatches > 0) earnedBadges.push('survivor');
  
  return earnedBadges;
}

// Get all achievements and badges for a user
export function getUserAchievements(userStats: any, tournamentHistory: any[]) {
  const achievements = ACHIEVEMENTS.filter(achievement => 
    checkAchievement(achievement, userStats, tournamentHistory)
  );
  
  const badgeIds = checkBadges(userStats, tournamentHistory);
  const badges = BADGES.filter(badge => badgeIds.includes(badge.id));
  
  return { achievements, badges };
}