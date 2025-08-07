import { SUPPORTED_GAMES } from "@/lib/constants";

export type Game = (typeof SUPPORTED_GAMES)[number];

export type Region =
  | "North America"
  | "South America"
  | "Europe West"
  | "Europe East"
  | "Asia Pacific"
  | "Middle East"
  | "Africa"
  | "Oceania"
  | "Central Asia"
  | "Southeast Asia"
  | "Caribbean"
  | "Nordic";

export type Step = "game" | "team" | "players" | "confirm";

export interface User {
  _id?: string;
  walletAddress: string;
  username: string;
  displayName: string;
  email: string;
  country: string;
  avatar?: string;
  bio?: string;
  clan?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserProfile extends Omit<User, "username"> {
  bio: string;
  favoriteGame: string;
  playStyle: string;
  discord: string;
  steam: string;
  twitter: string;
  twitch: string;
}

export interface UserSignupData {
  walletAddress: string;
  username: string;
  displayName: string;
  email: string;
  country: string;
}

export interface UserUpdateData {
  displayName?: string;
  email?: string;
  avatar?: string;
  bio?: string;
  clan?: string;
}

export interface Player {
  id: string;
  name: string;
  steamId?: string;
}

export interface Clan {
  _id: string;
  name: string;
  tag: string;
  region: string;
  country?: string;
  description?: string;
  logo?: string;
  leader?: {
    displayName: string;
    username: string;
  };
  memberCount?: number;
  canJoin?: boolean;
  hasRequested?: boolean;
  stats?: {
    totalTournaments: number;
    wins: number;
    totalPrizeMoney: number;
  };
  members?: ClanMember[];
}

export interface ClanMember {
  _id: string;
  username: string;
  displayName: string;
  walletAddress: string;
  selected?: boolean;
}

export interface ClanMessage {
  _id: string;
  id?: string;
  content?: string;
  message?: string;
  sender:
    | {
        _id: string;
        displayName: string;
        username: string;
        walletAddress: string;
        avatar?: string;
      }
    | string;
  senderPhoto?: string;
  clan: string;
  messageType: "text" | "system" | "announcement";
  createdAt: Date;
  updatedAt: Date;
  timestamp?: Date;
}

export interface Team {
  id: string;
  _id?: string;
  name: string;
  region?: string;
  organizer: string;
  players: Player[];
  registeredAt?: Date;
}

export interface Match {
  _id?: string;
  id?: string;
  round?: string;
  type?: string;
  date?: Date;
  status:
    | "scheduling"
    | "ready"
    | "active"
    | "completed"
    | "pending"
    | "scheduled"
    | "upcoming"
    | "live";
  scheduledAt?: string;
  scheduledTime?: string;
  completedAt?: string;
  team1?: MatchTeam;
  team2?: MatchTeam;
  score?: MatchScore;
  winner?: { id: string; name: string } | string | null;
  organizer1Approved?: boolean;
  organizer2Approved?: boolean;
  playerPerformances?: PlayerPerformance[];
  timeProposals?: TimeProposal[];
  hostRegions?: string[];
  resultsSubmitted?: MatchResultSubmission[];
  opponent?: string;
  tournamentId?: string;
  game?: string;
  createdAt?: string;
}

interface MatchTeam {
  _id: string;
  name: string;
  region?: string;
  captain?: {
    username: string;
    walletAddress: string;
  };
  players?: Array<{
    username: string;
    walletAddress: string;
    role: string;
  }>;
}

interface MatchScore {
  team1Score: number;
  team2Score: number;
  submittedBy?: string[];
  confirmed?: boolean;
}

interface PlayerPerformance {
  userId: { _id: string; username: string };
  clanId: string;
  kills: number;
  deaths: number;
  assists: number;
  score: number;
  mvp: boolean;
}

interface TimeProposal {
  proposedBy: string;
  time: string;
  status: "pending" | "approved" | "rejected";
}

interface MatchResultSubmission {
  hostWalletAddress: string;
  hostRegion: string;
  winnerTeamId: string;
  winnerTeamName: string;
  submittedAt: string;
  notes?: string;
}

export interface Tournament {
  id: string;
  _id?: string;
  name?: string;
  game: string;
  region: string;
  city?: string;
  status: string;
  lat?: number;
  lng?: number;
  scheduledTime?: Date;
  createdAt?: Date;
  registeredTeams: number;
  maxTeams: number;
  teamCount?: number;
  bracketId?: string;
  tournaments?: Array<{
    id: string;
    registeredTeams: number;
    maxTeams: number;
    status: string;
    createdAt: Date;
    completedAt?: Date;
  }>;
}

export interface CompletedTournament extends Tournament {
  prizePool: number;
  completedAt: string;
  winner?: { _id: string; name: string; tag: string };
  runnerUp?: { _id: string; name: string; tag: string };
}

export interface TournamentStatus {
  _id: string;
  game: string;
  status: "open" | "full" | "active" | "completed";
  registeredTeams: number;
  maxTeams: number;
  prizePool?: number;
  userTeam?: {
    name: string;
    status: "registered" | "eliminated" | "active" | "winner";
    nextMatch?: {
      opponent: string;
      scheduledTime?: string;
      round: string;
    };
  };
  createdAt: string;
}

export interface TournamentEntry {
  id: string;
  game: Game;
  placement: number;
  teamName: string;
  prizePool?: string;
  date: Date;
  region: string;
}

export interface GameTournament {
  id: string;
  game: Game;
  registeredTeams: Team[];
  maxTeams: number;
  status: "open" | "full" | "active" | "completed";
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
  status: "active" | "completed";
}

export interface BracketMatch {
  id: string;
  team1: Team;
  team2: Team;
  round: "first" | "quarter" | "semi" | "final";
  scheduledTime?: Date;
  proposedTimes?: Date[];
  organizer1Approved: boolean;
  organizer2Approved: boolean;
  winner?: Team;
  status: "scheduling" | "ready" | "active" | "completed";
}

export interface TimeSlot {
  id: string;
  proposedBy: string;
  matchId: string;
  proposedTime: Date;
  status: "pending" | "accepted" | "rejected";
  createdAt: Date;
}

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
  recentForm: ("W" | "L" | "T")[];
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
  recentForm: ("W" | "L" | "T")[];
  achievements: Achievement[];
}

export interface MemberPerformance {
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
    matchResult: "win" | "loss";
    playedAt: string;
  }>;
  rank: number;
}

export interface PlayerProfile {
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
  badges: Badge[];
}

export interface Achievement {
  id: string;
  title: string;
  name?: string;
  description: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  unlockedAt?: Date;
  category?: "tournament" | "performance" | "milestone" | "game-specific";
  requirements?: {
    type: string;
    value: number;
    game?: string;
  };
  game?: Game;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  description: string;
}

export interface LeaderboardEntry {
  rank: number;
  teamId: string;
  teamName: string;
  points: number;
  wins: number;
  totalTournaments: number;
  winRate: number;
  recentForm: ("W" | "L" | "T")[];
  change: number;
}

export interface MatchTemplate {
  clan1: Clan | { name: string };
  clan2: Clan | { name: string };
  round: string;
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
