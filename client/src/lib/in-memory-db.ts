// Temporary in-memory database for testing
interface Tournament {
  _id: string;
  game: string;
  maxTeams: number;
  registeredTeams: number;
  status: 'open' | 'full' | 'active' | 'completed';
  createdAt: Date;
  bracketId?: string;
}

interface Team {
  _id: string;
  name: string;
  tournamentId: string;
  organizer: string;
  region?: string;
  players?: Array<{ name: string; id: string }>;
  registeredAt: Date;
}

class InMemoryDB {
  private tournaments: Tournament[] = [];
  private teams: Team[] = [];
  private idCounter = 1;

  constructor() {
    // In development, preserve data across hot reloads
    if (process.env.NODE_ENV === "development") {
      const globalData = (global as any)._inMemoryDBData;
      if (globalData) {
        this.tournaments = globalData.tournaments || [];
        this.teams = globalData.teams || [];
        this.idCounter = globalData.idCounter || 1;
      }
    }
  }

  private saveToGlobal() {
    if (process.env.NODE_ENV === "development") {
      (global as any)._inMemoryDBData = {
        tournaments: this.tournaments,
        teams: this.teams,
        idCounter: this.idCounter
      };
    }
  }

  generateId(): string {
    return (this.idCounter++).toString();
  }

  // Tournament methods
  async insertTournament(data: Omit<Tournament, '_id'>): Promise<{ insertedId: string }> {
    const tournament: Tournament = {
      _id: this.generateId(),
      ...data
    };
    this.tournaments.push(tournament);
    this.saveToGlobal();
    return { insertedId: tournament._id };
  }

  async findTournaments(query: any = {}): Promise<Tournament[]> {
    let results = [...this.tournaments];
    
    if (query.game) {
      results = results.filter(t => t.game === query.game);
    }
    if (query.status) {
      if (Array.isArray(query.status.$in)) {
        results = results.filter(t => query.status.$in.includes(t.status));
      } else {
        results = results.filter(t => t.status === query.status);
      }
    }
    
    return results;
  }

  async findOneTournament(query: any): Promise<Tournament | null> {
    const results = await this.findTournaments(query);
    return results[0] || null;
  }

  // Team methods
  async insertTeam(data: Omit<Team, '_id'>): Promise<{ insertedId: string }> {
    const team: Team = {
      _id: this.generateId(),
      ...data
    };
    this.teams.push(team);
    
    // Update tournament registered teams count
    const tournament = this.tournaments.find(t => t._id === data.tournamentId);
    if (tournament) {
      tournament.registeredTeams++;
      if (tournament.registeredTeams >= tournament.maxTeams) {
        tournament.status = 'full';
      }
    }
    
    this.saveToGlobal();
    return { insertedId: team._id };
  }

  async findTeams(query: any = {}): Promise<Team[]> {
    let results = [...this.teams];
    
    if (query.tournamentId) {
      results = results.filter(t => t.tournamentId === query.tournamentId);
    }
    
    return results;
  }

  // Get stats
  async getTournamentStats() {
    return {
      totalTournaments: this.tournaments.length,
      activeTournaments: this.tournaments.filter(t => t.status === 'active').length,
      completedTournaments: this.tournaments.filter(t => t.status === 'completed').length,
      openTournaments: this.tournaments.filter(t => t.status === 'open').length,
      totalTeams: this.teams.length
    };
  }
}

export const inMemoryDB = new InMemoryDB();