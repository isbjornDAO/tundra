'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RootLayout } from '@/components/root-layout';
import { useTeam1Auth } from '@/hooks/use-team1-auth';
import { TournamentBracket } from '@/components/tournament-bracket';
import { useTournaments } from '@/hooks/use-tournaments';
import { type Team, type BracketMatch, GAMES } from '@/types/tournament';

// Mock data for different games
const mockGameData = {
  'CS2': {
    teams: [
      { id: '1', name: 'NA Legends', organizer: '0x123...', region: 'North America' },
      { id: '2', name: 'EU Titans', organizer: '0x456...', region: 'Europe West' },
      { id: '3', name: 'APAC Dragons', organizer: '0x789...', region: 'Asia Pacific' },
      { id: '4', name: 'SA Warriors', organizer: '0xabc...', region: 'South America' },
      { id: '5', name: 'ME Falcons', organizer: '0xdef...', region: 'Middle East' },
      { id: '6', name: 'OCE Sharks', organizer: '0x111...', region: 'Oceania' },
      { id: '7', name: 'Africa Lions', organizer: '0x222...', region: 'Africa' },
      { id: '8', name: 'CA Wolves', organizer: '0x333...', region: 'Central Asia' },
      { id: '9', name: 'SEA Eagles', organizer: '0x444...', region: 'Southeast Asia' },
      { id: '10', name: 'Caribbean Heat', organizer: '0x555...', region: 'Caribbean' },
      { id: '11', name: 'Nordic Frost', organizer: '0x666...', region: 'Nordic' },
      { id: '12', name: 'EU East Storm', organizer: '0x777...', region: 'Europe East' },
    ],
    status: 'active'
  },
  'Valorant': {
    teams: [
      { id: '1', name: 'Valorant Team 1', organizer: '0x123...', region: 'North America' },
      { id: '2', name: 'Valorant Team 2', organizer: '0x456...', region: 'Europe West' },
      { id: '3', name: 'Valorant Team 3', organizer: '0x789...', region: 'Asia Pacific' },
      { id: '4', name: 'Valorant Team 4', organizer: '0xabc...', region: 'South America' },
      { id: '5', name: 'Valorant Team 5', organizer: '0xdef...', region: 'Middle East' },
      { id: '6', name: 'Valorant Team 6', organizer: '0x111...', region: 'Oceania' },
      { id: '7', name: 'Valorant Team 7', organizer: '0x222...', region: 'Africa' },
      { id: '8', name: 'Valorant Team 8', organizer: '0x333...', region: 'Central Asia' },
      { id: '9', name: 'Valorant Team 9', organizer: '0x444...', region: 'Southeast Asia' },
      { id: '10', name: 'Valorant Team 10', organizer: '0x555...', region: 'Caribbean' },
      { id: '11', name: 'Valorant Team 11', organizer: '0x666...', region: 'Nordic' },
      { id: '12', name: 'Valorant Team 12', organizer: '0x777...', region: 'Europe East' },
    ],
    status: 'active'
  }
};

interface MatchSchedulingProps {
  match: BracketMatch;
  currentUserAddress: string;
  onScheduleUpdate: (matchId: string, scheduledTime: Date, organizerApproval: boolean) => void;
  onSubmitResult: (matchId: string, winner: Team) => void;
}

function MatchScheduling({ match, currentUserAddress, onScheduleUpdate, onSubmitResult }: MatchSchedulingProps) {
  const [proposedTime, setProposedTime] = useState('');
  const [isCurrentUserOrganizer, setIsCurrentUserOrganizer] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);

  useEffect(() => {
    setIsCurrentUserOrganizer(
      match.team1.organizer.toLowerCase() === currentUserAddress.toLowerCase() ||
      match.team2.organizer.toLowerCase() === currentUserAddress.toLowerCase()
    );
  }, [match, currentUserAddress]);

  const handleTimeProposal = () => {
    if (!proposedTime) return;
    const scheduledTime = new Date(proposedTime);
    onScheduleUpdate(match.id, scheduledTime, true);
    setShowTimeModal(false);
    setProposedTime('');
  };

  const handleApproval = () => {
    if (match.scheduledTime) {
      onScheduleUpdate(match.id, match.scheduledTime, true);
    }
  };

  const handleResultSubmission = (winner: Team) => {
    onSubmitResult(match.id, winner);
    setShowResultModal(false);
  };

  const isOrganizer1 = match.team1.organizer.toLowerCase() === currentUserAddress.toLowerCase();
  const isOrganizer2 = match.team2.organizer.toLowerCase() === currentUserAddress.toLowerCase();
  const userApproved = (isOrganizer1 && match.organizer1Approved) || (isOrganizer2 && match.organizer2Approved);
  const bothApproved = match.organizer1Approved && match.organizer2Approved;

  return (
    <>
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h4 className="heading-sm">
            {match.team1.name} vs {match.team2.name}
          </h4>
          <span className={
            match.status === 'completed' ? 'status-completed' :
              match.status === 'scheduled' ? 'status-active' : 'status-pending'
          }>
            {match.status.toUpperCase()}
          </span>
        </div>

        <div className="grid-2 mb-6">
          <div className="card-compact">
            <h5 className="text-blue-300 font-medium mb-2">{match.team1.name}</h5>
            <p className="text-muted">{match.team1.region}</p>
            <p className="text-muted">Organizer: {match.team1.organizer.slice(0, 8)}...{match.team1.organizer.slice(-4)}</p>
          </div>
          <div className="card-compact">
            <h5 className="text-purple-300 font-medium mb-2">{match.team2.name}</h5>
            <p className="text-muted">{match.team2.region}</p>
            <p className="text-muted">Organizer: {match.team2.organizer.slice(0, 8)}...{match.team2.organizer.slice(-4)}</p>
          </div>
        </div>

        {match.scheduledTime && (
          <div className="card-compact bg-blue-500/5 border-blue-500/20 mb-4">
            <p className="text-white font-medium mb-1">Scheduled Time:</p>
            <p className="text-blue-200">{match.scheduledTime.toLocaleString()}</p>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <span className={match.organizer1Approved ? 'status-completed' : 'status-pending'}>
            Team 1 Org: {match.organizer1Approved ? 'Approved' : 'Pending'}
          </span>
          <span className={match.organizer2Approved ? 'status-completed' : 'status-pending'}>
            Team 2 Org: {match.organizer2Approved ? 'Approved' : 'Pending'}
          </span>
        </div>

        {isCurrentUserOrganizer && match.status !== 'completed' && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowTimeModal(true)}
              className="btn btn-secondary btn-sm"
            >
              {match.scheduledTime ? 'Update Time' : 'Propose Time'}
            </button>

            {match.scheduledTime && !userApproved && (
              <button
                onClick={handleApproval}
                className="btn btn-primary btn-sm"
              >
                Approve Time
              </button>
            )}

            {bothApproved && match.status === 'scheduled' && (
              <button
                onClick={() => setShowResultModal(true)}
                className="btn btn-primary btn-sm"
              >
                Submit Result
              </button>
            )}
          </div>
        )}

        {match.winner && (
          <div className="card-compact bg-gray-500/5 border-gray-500/20 mt-4">
            <p className="text-gray-300 font-medium">🏆 Winner: {match.winner.name}</p>
          </div>
        )}
      </div>

      {/* Time Scheduling Modal */}
      {showTimeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card max-w-md w-full mx-4">
            <h3 className="heading-md mb-4">Schedule Match Time</h3>
            <div className="form-group">
              <label className="form-label">Match Date & Time</label>
              <input
                type="datetime-local"
                value={proposedTime}
                onChange={(e) => setProposedTime(e.target.value)}
                className="input-field"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleTimeProposal}
                disabled={!proposedTime}
                className="btn btn-primary flex-1"
              >
                Propose Time
              </button>
              <button
                onClick={() => setShowTimeModal(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Submission Modal */}
      {showResultModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card max-w-md w-full mx-4">
            <h3 className="heading-md mb-4">Submit Match Result</h3>
            <p className="text-body mb-6">Select the winning team:</p>
            <div className="space-y-3">
              <button
                onClick={() => handleResultSubmission(match.team1)}
                className="card-interactive w-full text-left"
              >
                <div className="font-medium text-white">{match.team1.name}</div>
                <div className="text-muted">{match.team1.region}</div>
              </button>
              <button
                onClick={() => handleResultSubmission(match.team2)}
                className="card-interactive w-full text-left"
              >
                <div className="font-medium text-white">{match.team2.name}</div>
                <div className="text-muted">{match.team2.region}</div>
              </button>
              <button
                onClick={() => setShowResultModal(false)}
                className="btn btn-secondary w-full"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function GameSelector({ selectedGame, onGameSelect }: { selectedGame: string; onGameSelect: (game: string) => void }) {
  return (
    <div className="section-tight">
      <h2 className="heading-md mb-6">Select Tournament</h2>
      <div className="grid-4">
        {GAMES.map((game) => {
          const hasData = game === 'CS2' || game === 'Valorant';
          return (
            <button
              key={game}
              onClick={() => hasData && onGameSelect(game)}
              disabled={!hasData}
              className={`card-interactive ${selectedGame === game ? 'card-selected' : ''
                } ${!hasData ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="text-center">
                <h3 className="heading-sm mb-2">{game}</h3>
                {hasData ? (
                  <span className="status-active">12/12 Full</span>
                ) : (
                  <span className="status-pending">Coming Soon</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TournamentBracketsContent() {
  const { address } = useTeam1Auth();
  const searchParams = useSearchParams();
  const tournamentId = searchParams.get('tournamentId');
  const gameParam = searchParams.get('game');
  
  const { data: tournamentsData } = useTournaments();
  const tournaments = tournamentsData?.tournaments || [];

  const [selectedGame, setSelectedGame] = useState(gameParam || 'CS2');
  const [matches, setMatches] = useState<BracketMatch[]>([]);

  // If tournamentId is provided, use the real bracket component
  if (tournamentId) {
    return (
      <RootLayout title="Tournament Bracket">
        <TournamentBracket tournamentId={tournamentId} />
      </RootLayout>
    );
  }

  useEffect(() => {
    if (selectedGame && mockGameData[selectedGame as keyof typeof mockGameData]) {
      const gameData = mockGameData[selectedGame as keyof typeof mockGameData];

      // Generate first round matches
      const firstRoundMatches: BracketMatch[] = [];
      for (let i = 0; i < 6; i++) {
        const team1 = gameData.teams[i * 2];
        const team2 = gameData.teams[i * 2 + 1];

        firstRoundMatches.push({
          id: `${selectedGame}-first-${i}`,
          team1: team1 as Team,
          team2: team2 as Team,
          round: 'first',
          organizer1Approved: Math.random() > 0.5,
          organizer2Approved: Math.random() > 0.5,
          status: Math.random() > 0.7 ? 'completed' : Math.random() > 0.5 ? 'scheduled' : 'pending',
          scheduledTime: Math.random() > 0.5 ? new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000) : undefined,
          winner: Math.random() > 0.7 ? (Math.random() > 0.5 ? team1 as Team : team2 as Team) : undefined
        });
      }

      setMatches(firstRoundMatches);
    }
  }, [selectedGame]);

  const handleScheduleUpdate = (matchId: string, scheduledTime: Date, organizerApproval: boolean) => {
    setMatches(prev => prev.map(match => {
      if (match.id === matchId) {
        const isOrganizer1 = match.team1.organizer.toLowerCase() === address?.toLowerCase();

        return {
          ...match,
          scheduledTime,
          organizer1Approved: isOrganizer1 ? organizerApproval : match.organizer1Approved,
          organizer2Approved: !isOrganizer1 ? organizerApproval : match.organizer2Approved,
          status: (match.organizer1Approved || isOrganizer1) && (match.organizer2Approved || !isOrganizer1)
            ? 'scheduled' as const
            : 'pending' as const
        };
      }
      return match;
    }));
  };

  const handleResultSubmission = (matchId: string, winner: Team) => {
    setMatches(prev => prev.map(match => {
      if (match.id === matchId) {
        return {
          ...match,
          winner,
          status: 'completed' as const
        };
      }
      return match;
    }));
  };

  return (
    <RootLayout title="Tournament Brackets">
      {/* Important Information */}
      <div className="card-compact bg-gray-500/5 border-gray-500/20 mb-8">
        <h4 className="text-gray-300 font-medium mb-4">🎮 Tournament Instructions</h4>
        <div className="grid-2 text-body text-sm">
          <ul className="space-y-2">
            <li>• Both team organizers must agree on match times</li>
            <li>• Matches are played on Avax Gaming Discord</li>
            <li>• Click &quot;Propose Time&quot; to schedule your match</li>
          </ul>
          <ul className="space-y-2">
            <li>• Submit results after completing matches</li>
            <li>• Winners advance to the next round</li>
            <li>• Contact opposing organizers via Discord</li>
          </ul>
        </div>
      </div>

      <GameSelector selectedGame={selectedGame} onGameSelect={setSelectedGame} />

      {selectedGame && mockGameData[selectedGame as keyof typeof mockGameData] && (
        <div className="section">
          <div className="card text-center mb-8">
            <h2 className="heading-md mb-4">{selectedGame} Tournament Bracket</h2>
            <span className="status-active">Status: Active - 12 Teams Registered</span>
          </div>

          <div className="section-tight">
            <h3 className="heading-md mb-6">First Round Matches</h3>
            <div className="grid-2">
              {matches.map((match) => (
                <MatchScheduling
                  key={match.id}
                  match={match}
                  currentUserAddress={address || ''}
                  onScheduleUpdate={handleScheduleUpdate}
                  onSubmitResult={handleResultSubmission}
                />
              ))}
            </div>
          </div>

        </div>
      )}
    </RootLayout>
  );
}

export default function TournamentBrackets() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TournamentBracketsContent />
    </Suspense>
  );
}