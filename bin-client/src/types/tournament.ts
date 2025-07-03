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
  status: "open" | "full" | "active" | "completed";
  bracket?: TournamentBracket;
  createdAt: Date;
}

export interface TournamentSummary {
  gameName: string;
  registeredTeams: number;
  maxTeams: number;
  status: string;
};

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
  organizer1Approved: boolean;
  organizer2Approved: boolean;
  winner?: Team;
  status: "pending" | "scheduled" | "completed";
}

export const GAMES = [
  "CS2",
  "Valorant",
  "League of Legends",
  "Dota 2",
  "Rocket League",
  "Fortnite",
] as const;

export type Game = (typeof GAMES)[number];

export const REGIONS = [
  "North America",
  "South America",
  "Europe West",
  "Europe East",
  "Asia Pacific",
  "Middle East",
  "Africa",
  "Oceania",
  "Central Asia",
  "Southeast Asia",
  "Caribbean",
  "Nordic",
] as const;

export type Region = (typeof REGIONS)[number];
