'use client';

import { useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { Layout } from '@/components/Layout';
import { PlayerProfile } from '@/components/PlayerProfile';
import { 
  type Game, 
  type TournamentResult, 
  type PlayerStats,
  type LeaderboardEntry
} from '@/types/tournament';

// Mock data for recent tournaments
const mockRecentTournaments: TournamentResult[] = [
  {
    id: '1',
    tournament: {
      id: 't1',
      game: 'CS2',
      registeredTeams: [],
      maxTeams: 16,
      status: 'completed',
      createdAt: new Date('2024-01-01')
    },
    winner: { id: '1', name: 'Team Alpha', players: [], organizer: '0x123', region: 'North America', registeredAt: new Date() },
    runnerUp: { id: '2', name: 'Team Beta', players: [], organizer: '0x456', region: 'Europe West', registeredAt: new Date() },
    participants: [],
    completedAt: new Date('2024-01-25'),
    prizePool: '$5,000',
    region: 'North America',
    game: 'CS2'
  },
  {
    id: '2',
    tournament: {
      id: 't2',
      game: 'Valorant',
      registeredTeams: [],
      maxTeams: 12,
      status: 'completed',
      createdAt: new Date('2024-01-10')
    },
    winner: { id: '3', name: 'Storm Riders', players: [], organizer: '0x789', region: 'Asia Pacific', registeredAt: new Date() },
    runnerUp: { id: '4', name: 'Phoenix Squad', players: [], organizer: '0xabc', region: 'Europe West', registeredAt: new Date() },
    participants: [],
    completedAt: new Date('2024-01-22'),
    prizePool: '$3,000',
    region: 'Asia Pacific',
    game: 'Valorant'
  },
  {
    id: '3',
    tournament: {
      id: 't3',
      game: 'League of Legends',
      registeredTeams: [],
      maxTeams: 8,
      status: 'completed',
      createdAt: new Date('2024-01-05')
    },
    winner: { id: '5', name: 'Rift Masters', players: [], organizer: '0xdef', region: 'Europe West', registeredAt: new Date() },
    runnerUp: { id: '6', name: 'Nexus Kings', players: [], organizer: '0x789', region: 'North America', registeredAt: new Date() },
    participants: [],
    completedAt: new Date('2024-01-20'),
    prizePool: '$4,500',
    region: 'Europe West',
    game: 'League of Legends'
  }
];

// Combined leaderboard data for teams and players
const mockTeamLeaderboards: Record<Game, LeaderboardEntry[]> = {
  'CS2': [
    { rank: 1, teamId: '1', teamName: 'Team Alpha', points: 2500, wins: 15, totalTournaments: 20, winRate: 75, recentForm: ['W', 'W', 'W', 'L', 'W'], change: 2 },
    { rank: 2, teamId: '2', teamName: 'Team Beta', points: 2350, wins: 12, totalTournaments: 18, winRate: 67, recentForm: ['W', 'L', 'W', 'W', 'L'], change: -1 },
    { rank: 3, teamId: '5', teamName: 'Cyber Knights', points: 2200, wins: 10, totalTournaments: 16, winRate: 63, recentForm: ['L', 'W', 'W', 'W', 'W'], change: 1 },
    { rank: 4, teamId: '6', teamName: 'Digital Warriors', points: 2100, wins: 8, totalTournaments: 15, winRate: 53, recentForm: ['W', 'W', 'L', 'L', 'W'], change: 0 },
    { rank: 5, teamId: '7', teamName: 'Elite Gamers', points: 2000, wins: 7, totalTournaments: 14, winRate: 50, recentForm: ['L', 'L', 'W', 'W', 'L'], change: -2 }
  ],
  'Valorant': [
    { rank: 1, teamId: '3', teamName: 'Storm Riders', points: 2400, wins: 13, totalTournaments: 17, winRate: 76, recentForm: ['W', 'W', 'W', 'W', 'L'], change: 0 },
    { rank: 2, teamId: '4', teamName: 'Phoenix Squad', points: 2300, wins: 11, totalTournaments: 16, winRate: 69, recentForm: ['W', 'L', 'W', 'W', 'W'], change: 1 },
    { rank: 3, teamId: '8', teamName: 'Viper Strike', points: 2150, wins: 9, totalTournaments: 14, winRate: 64, recentForm: ['L', 'W', 'W', 'L', 'W'], change: -1 },
    { rank: 4, teamId: '9', teamName: 'Phantom Force', points: 2050, wins: 8, totalTournaments: 13, winRate: 62, recentForm: ['W', 'W', 'L', 'W', 'L'], change: 2 },
    { rank: 5, teamId: '10', teamName: 'Sage Masters', points: 1950, wins: 6, totalTournaments: 12, winRate: 50, recentForm: ['L', 'L', 'L', 'W', 'W'], change: -1 }
  ],
  'League of Legends': [
    { rank: 1, teamId: '11', teamName: 'Rift Masters', points: 2800, wins: 18, totalTournaments: 22, winRate: 82, recentForm: ['W', 'W', 'W', 'W', 'W'], change: 0 },
    { rank: 2, teamId: '12', teamName: 'Nexus Kings', points: 2600, wins: 14, totalTournaments: 19, winRate: 74, recentForm: ['W', 'W', 'L', 'W', 'W'], change: 1 },
    { rank: 3, teamId: '13', teamName: 'Baron Slayers', points: 2400, wins: 12, totalTournaments: 17, winRate: 71, recentForm: ['W', 'L', 'W', 'W', 'L'], change: -1 }
  ],
  'Dota 2': [
    { rank: 1, teamId: '14', teamName: 'Ancient Guardians', points: 2700, wins: 16, totalTournaments: 21, winRate: 76, recentForm: ['W', 'W', 'W', 'L', 'W'], change: 0 },
    { rank: 2, teamId: '15', teamName: 'Radiant Squad', points: 2500, wins: 13, totalTournaments: 18, winRate: 72, recentForm: ['W', 'W', 'W', 'W', 'L'], change: 1 }
  ],
  'Rocket League': [
    { rank: 1, teamId: '16', teamName: 'Boost Legends', points: 2300, wins: 11, totalTournaments: 15, winRate: 73, recentForm: ['W', 'W', 'L', 'W', 'W'], change: 0 },
    { rank: 2, teamId: '17', teamName: 'Aerial Aces', points: 2100, wins: 9, totalTournaments: 14, winRate: 64, recentForm: ['L', 'W', 'W', 'W', 'L'], change: 1 }
  ],
  'Fortnite': [
    { rank: 1, teamId: '18', teamName: 'Victory Royale', points: 2200, wins: 10, totalTournaments: 16, winRate: 63, recentForm: ['W', 'W', 'W', 'L', 'W'], change: 0 },
    { rank: 2, teamId: '19', teamName: 'Build Masters', points: 2000, wins: 8, totalTournaments: 14, winRate: 57, recentForm: ['W', 'L', 'W', 'W', 'L'], change: 1 }
  ]
};

const mockPlayerLeaderboards: Record<Game, PlayerStats[]> = {
  'CS2': [
    { playerId: 'p1', playerName: 'ProGamer_2024', totalTournaments: 25, wins: 8, runnerUps: 5, topThrees: 12, totalMatches: 150, matchWins: 110, winRate: 73, averageScore: 85, bestPlacement: 1, favoriteGame: 'CS2', totalPrizesMoney: 15000, recentForm: ['W', 'W', 'L', 'W', 'W'], achievements: [] },
    { playerId: 'p2', playerName: 'EliteShooter', totalTournaments: 22, wins: 6, runnerUps: 4, topThrees: 10, totalMatches: 130, matchWins: 95, winRate: 73, averageScore: 82, bestPlacement: 1, favoriteGame: 'CS2', totalPrizesMoney: 12500, recentForm: ['W', 'L', 'W', 'W', 'L'], achievements: [] },
    { playerId: 'p3', playerName: 'HeadShotKing', totalTournaments: 20, wins: 5, runnerUps: 3, topThrees: 8, totalMatches: 120, matchWins: 85, winRate: 71, averageScore: 80, bestPlacement: 1, favoriteGame: 'CS2', totalPrizesMoney: 10000, recentForm: ['W', 'W', 'W', 'L', 'W'], achievements: [] }
  ],
  'Valorant': [
    { playerId: 'p4', playerName: 'ValorantAce', totalTournaments: 18, wins: 4, runnerUps: 3, topThrees: 7, totalMatches: 100, matchWins: 72, winRate: 72, averageScore: 78, bestPlacement: 1, favoriteGame: 'Valorant', totalPrizesMoney: 8500, recentForm: ['W', 'W', 'L', 'W', 'L'], achievements: [] },
    { playerId: 'p5', playerName: 'AgentMaster', totalTournaments: 16, wins: 3, runnerUps: 2, topThrees: 6, totalMatches: 90, matchWins: 63, winRate: 70, averageScore: 76, bestPlacement: 1, favoriteGame: 'Valorant', totalPrizesMoney: 7000, recentForm: ['L', 'W', 'W', 'W', 'L'], achievements: [] }
  ],
  'League of Legends': [
    { playerId: 'p6', playerName: 'RiftChampion', totalTournaments: 24, wins: 7, runnerUps: 4, topThrees: 11, totalMatches: 140, matchWins: 102, winRate: 73, averageScore: 83, bestPlacement: 1, favoriteGame: 'League of Legends', totalPrizesMoney: 13000, recentForm: ['W', 'W', 'W', 'W', 'L'], achievements: [] }
  ],
  'Dota 2': [
    { playerId: 'p7', playerName: 'DotaPro', totalTournaments: 19, wins: 5, runnerUps: 3, topThrees: 8, totalMatches: 110, matchWins: 78, winRate: 71, averageScore: 79, bestPlacement: 1, favoriteGame: 'Dota 2', totalPrizesMoney: 9500, recentForm: ['W', 'W', 'L', 'W', 'W'], achievements: [] }
  ],
  'Rocket League': [
    { playerId: 'p8', playerName: 'RocketAce', totalTournaments: 15, wins: 3, runnerUps: 2, topThrees: 5, totalMatches: 80, matchWins: 56, winRate: 70, averageScore: 75, bestPlacement: 1, favoriteGame: 'Rocket League', totalPrizesMoney: 6500, recentForm: ['W', 'L', 'W', 'W', 'L'], achievements: [] }
  ],
  'Fortnite': [
    { playerId: 'p9', playerName: 'VictoryRoyaler', totalTournaments: 17, wins: 4, runnerUps: 2, topThrees: 6, totalMatches: 95, matchWins: 65, winRate: 68, averageScore: 74, bestPlacement: 1, favoriteGame: 'Fortnite', totalPrizesMoney: 7500, recentForm: ['W', 'W', 'L', 'W', 'W'], achievements: [] }
  ]
};

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

  return (
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
              {mockRecentTournaments.map((result) => (
                <RecentTournamentCard key={result.id} result={result} />
              ))}
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
                    ? `${mockTeamLeaderboards[selectedGame]?.length || 0} teams`
                    : `${mockPlayerLeaderboards[selectedGame]?.length || 0} players`
                  }
                </div>
              </div>
              
              <div className="space-y-2">
                {leaderboardType === 'teams' ? (
                  mockTeamLeaderboards[selectedGame]?.length > 0 ? (
                    mockTeamLeaderboards[selectedGame].map((entry) => (
                      <TeamLeaderboardCard key={entry.teamId} entry={entry} />
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-gray-400 mb-2">No team data available</div>
                      <p className="text-gray-500 text-sm">Teams will appear here once tournaments are completed.</p>
                    </div>
                  )
                ) : (
                  mockPlayerLeaderboards[selectedGame]?.length > 0 ? (
                    mockPlayerLeaderboards[selectedGame].map((player, index) => (
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
  );
}