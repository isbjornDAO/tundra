export interface Player {
  id: string;
  name: string;
  steamId?: string;
}

export interface Team {
  id: string;
  name: string;
  players: Player[];
  organizer: string; // Team1 member wallet address
  region?: string;
  registeredAt: Date;
}

export interface GameTournament {
  id: string;
  game: Game;
  registeredTeams: Team[];
  maxTeams: number;
  status: 'open' | 'full' | 'active' | 'completed';
  bracket?: TournamentBracket;
  region: Region;
  createdAt: Date;
}

export interface TournamentBracket {
  id: string;
  gameId: string;
  teams: Team[];
  matches: BracketMatch[];
  winner?: Team;
  status: 'active' | 'completed';
}

export interface BracketMatch {
  id: string;
  team1: Team;
  team2: Team;
  round: 'first' | 'quarter' | 'semi' | 'final';
  scheduledTime?: Date;
  proposedTimes?: Date[];
  organizer1Approved: boolean;
  organizer2Approved: boolean;
  winner?: Team;
  status: 'scheduling' | 'ready' | 'active' | 'completed';
}

export interface TimeSlot {
  id: string;
  proposedBy: string;
  matchId: string;
  proposedTime: Date;
  status: "pending" | "accepted" | "rejected";
  createdAt: Date;
}

export interface TournamentSummary {
  game: string;
  registeredTeams: number;
  maxTeams: number;
  status: string;
  region: string;
  _id: string;
  createdAt: Date;
}

export const SUPPORTED_GAMES = [
  'Off the Grid',
  'Shatterline',
  'Call of Duty: Warzone',
  'Counter-Strike 2',
  'Valorant',
  'Apex Legends',
  'Overwatch 2',
  'Rainbow Six Siege'
] as const;

export type Game = typeof SUPPORTED_GAMES[number];

export const REGIONS = [
  'North America',
  'South America', 
  'Europe West',
  'Europe East',
  'Asia Pacific',
  'Middle East',
  'Africa',
  'Oceania',
  'Central Asia',
  'Southeast Asia',
  'Caribbean',
  'Nordic'
] as const;

export type Region = typeof REGIONS[number];

// Results and Stats Types
export interface TournamentResult {
  id: string;
  tournament: GameTournament;
  winner: Team;
  runnerUp: Team;
  participants: Team[];
  completedAt: Date;
  prizePool?: string;
  region: Region;
  game: Game;
}

export interface PlayerStats {
  playerId: string;
  playerName: string;
  totalTournaments: number;
  wins: number;
  runnerUps: number;
  topThrees: number;
  totalMatches: number;
  matchWins: number;
  winRate: number;
  averageScore: number;
  bestPlacement: number;
  favoriteGame: Game;
  totalPrizesMoney: number;
  recentForm: ('W' | 'L' | 'T')[];
  achievements: Achievement[];
}

export interface TeamStats {
  teamId: string;
  teamName: string;
  totalTournaments: number;
  wins: number;
  runnerUps: number;
  topThrees: number;
  totalMatches: number;
  matchWins: number;
  winRate: number;
  bestPlacement: number;
  totalPrizesMoney: number;
  currentRanking: number;
  members: Player[];
  recentForm: ('W' | 'L' | 'T')[];
  achievements: Achievement[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt: Date;
  game?: Game;
}

export interface LeaderboardEntry {
  rank: number;
  teamId: string;
  teamName: string;
  points: number;
  wins: number;
  totalTournaments: number;
  winRate: number;
  recentForm: ('W' | 'L' | 'T')[];
  change: number; // +/- position change
}