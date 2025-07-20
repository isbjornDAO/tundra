'use client';

import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { WagmiGuard } from '@/components/WagmiGuard';
import { useTeam1Auth } from '@/hooks/useTeam1Auth';
import { useTournaments, useMatches } from '@/hooks/useTournaments';

const GAMES = ['Off the Grid', 'Shatterline', 'Cozyverse', 'Rocket League', 'Fortnite', 'Apex Legends', 'Call of Duty'];

interface Match {
  _id: string;
  round: string;
  team1: { name: string; organizer: string };
  team2: { name: string; organizer: string };
  scheduledTime?: string;
  status: 'pending' | 'scheduled' | 'completed';
  results?: {
    team1Score: number;
    team2Score: number;
    submittedBy: string[];
    confirmed: boolean;
  };
}

interface Tournament {
  _id: string;
  game: string;
  status: string;
  registeredTeams: number;
  maxTeams: number;
  bracketId?: string;
}

function ResultsContent() {
  const [mounted, setMounted] = useState(false);
  const { address } = useTeam1Auth();
  const [selectedGame, setSelectedGame] = useState('all');
  const [submitting, setSubmitting] = useState(false);

  const { data: tournamentsData, isLoading: tournamentsLoading } = useTournaments();
  
  // Get tournaments and their matches
  const tournaments = (tournamentsData?.tournaments || []) as Tournament[];
  const activeTournaments = tournaments.filter(t => t.status === 'active' || t.status === 'completed');
  
  // Get matches for all tournaments or selected game
  const getMatchesForDisplay = () => {
    const relevantTournaments = selectedGame === 'all' 
      ? activeTournaments 
      : activeTournaments.filter(t => t.game === selectedGame);
    
    return relevantTournaments;
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Submit match results
  const handleSubmitResults = async (matchId: string, team1Score: number, team2Score: number) => {
    if (!address) return;
    
    setSubmitting(true);
    try {
      const response = await fetch('/api/tournaments/matches/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          team1Score,
          team2Score,
          submittedBy: address
        })
      });
      
      if (response.ok) {
        window.location.reload();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to submit results');
      }
    } catch (error) {
      console.error('Error submitting results:', error);
      alert('Failed to submit results');
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted || tournamentsLoading) {
    return (
      <WagmiGuard>
        <Layout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-lg text-white">Loading...</div>
          </div>
        </Layout>
      </WagmiGuard>
    );
  }

  const displayTournaments = getMatchesForDisplay();

  return (
    <WagmiGuard>
      <Layout>
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">Tournament Results</h1>
            <p className="text-gray-400">Submit match results and view tournament outcomes</p>
          </div>

          {/* Game Filter */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Filter by Game</h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setSelectedGame('all')}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  selectedGame === 'all' 
                    ? 'border-blue-500 bg-blue-500/20 text-blue-400' 
                    : 'border-white/20 bg-white/5 hover:border-white/40 text-white'
                }`}
              >
                All Games
              </button>
              {GAMES.map((game) => (
                <button
                  key={game}
                  onClick={() => setSelectedGame(game)}
                  className={`px-4 py-2 rounded-lg border transition-all ${
                    selectedGame === game 
                      ? 'border-blue-500 bg-blue-500/20 text-blue-400' 
                      : 'border-white/20 bg-white/5 hover:border-white/40 text-white'
                  }`}
                >
                  {game}
                </button>
              ))}
            </div>
          </div>

          {displayTournaments.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-2xl font-bold text-white mb-2">No Results Available</h3>
              <p className="text-gray-400">No tournaments with results to display</p>
            </div>
          ) : (
            <div className="space-y-8">
              {displayTournaments.map((tournament) => (
                <TournamentResultsSection 
                  key={tournament._id} 
                  tournament={tournament} 
                  userAddress={address}
                  onSubmitResults={handleSubmitResults}
                  submitting={submitting}
                />
              ))}
            </div>
          )}
        </div>
      </Layout>
    </WagmiGuard>
  );
}

// Tournament Results Section Component
function TournamentResultsSection({ 
  tournament, 
  userAddress, 
  onSubmitResults, 
  submitting 
}: { 
  tournament: Tournament;
  userAddress: string | undefined;
  onSubmitResults: (matchId: string, team1Score: number, team2Score: number) => void;
  submitting: boolean;
}) {
  const { data: matchesData } = useMatches(tournament.bracketId || '');
  const matches = (matchesData?.matches || []) as Match[];
  
  // Separate matches by status
  const completedMatches = matches.filter(m => m.status === 'completed');
  const scheduledMatches = matches.filter(m => m.status === 'scheduled' && m.scheduledTime && new Date(m.scheduledTime) < new Date());
  const pendingMatches = matches.filter(m => m.status === 'pending' || (m.status === 'scheduled' && m.scheduledTime && new Date(m.scheduledTime) > new Date()));

  return (
    <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-6">
      {/* Tournament Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">{tournament.game} Tournament</h2>
          <div className="flex items-center gap-4 text-sm text-gray-300">
            <span>{tournament.registeredTeams}/{tournament.maxTeams} Teams</span>
            <span className="capitalize">{tournament.status}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl mb-1">🏆</div>
          <div className="text-xl font-bold text-yellow-400">$5,000</div>
          <div className="text-xs text-gray-400">Prize Pool</div>
        </div>
      </div>

      {/* Matches Requiring Results */}
      {scheduledMatches.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">🔥 Matches Needing Results</h3>
          <div className="space-y-4">
            {scheduledMatches.map((match) => (
              <MatchResultsEntry 
                key={match._id}
                match={match}
                userAddress={userAddress}
                onSubmitResults={onSubmitResults}
                submitting={submitting}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Matches */}
      {completedMatches.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">✅ Completed Matches</h3>
          <div className="space-y-3">
            {completedMatches.map((match) => (
              <div key={match._id} className="bg-black/20 border border-white/10 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-white font-medium">{match.team1.name}</div>
                    <div className="text-2xl font-bold text-white">
                      {match.results?.team1Score} - {match.results?.team2Score}
                    </div>
                    <div className="text-white font-medium">{match.team2.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 text-sm font-medium">
                      {match.results?.confirmed ? 'Confirmed' : 'Pending Confirmation'}
                    </div>
                    <div className="text-xs text-gray-400 capitalize">{match.round}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Matches */}
      {pendingMatches.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">⏳ Upcoming Matches</h3>
          <div className="space-y-3">
            {pendingMatches.map((match) => (
              <div key={match._id} className="bg-black/20 border border-white/10 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-white font-medium">{match.team1.name}</div>
                    <div className="text-gray-400">vs</div>
                    <div className="text-white font-medium">{match.team2.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-yellow-400 text-sm font-medium">
                      {match.scheduledTime ? 'Scheduled' : 'Time TBD'}
                    </div>
                    <div className="text-xs text-gray-400 capitalize">{match.round}</div>
                  </div>
                </div>
                {match.scheduledTime && (
                  <div className="text-sm text-gray-300 mt-2">
                    {new Date(match.scheduledTime).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {matches.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          No matches available for this tournament
        </div>
      )}
    </div>
  );
}

// Match Results Entry Component
function MatchResultsEntry({ 
  match, 
  userAddress, 
  onSubmitResults, 
  submitting 
}: {
  match: Match;
  userAddress: string | undefined;
  onSubmitResults: (matchId: string, team1Score: number, team2Score: number) => void;
  submitting: boolean;
}) {
  const [team1Score, setTeam1Score] = useState('');
  const [team2Score, setTeam2Score] = useState('');
  
  const isTeamLeader = userAddress === match.team1.organizer || userAddress === match.team2.organizer;
  const hasSubmitted = match.results?.submittedBy.includes(userAddress || '') || false;

  const handleSubmit = () => {
    const score1 = parseInt(team1Score);
    const score2 = parseInt(team2Score);
    
    if (isNaN(score1) || isNaN(score2) || score1 < 0 || score2 < 0) {
      alert('Please enter valid scores');
      return;
    }
    
    onSubmitResults(match._id, score1, score2);
  };

  return (
    <div className="bg-black/20 border border-white/10 rounded-lg p-4">
      {/* Match Info */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="text-white font-medium">{match.team1.name}</div>
          <div className="text-gray-400">vs</div>
          <div className="text-white font-medium">{match.team2.name}</div>
        </div>
        <div className="text-right">
          <div className="text-orange-400 text-sm font-medium">Results Needed</div>
          <div className="text-xs text-gray-400 capitalize">{match.round}</div>
        </div>
      </div>

      {/* Match Time */}
      {match.scheduledTime && (
        <div className="text-sm text-gray-300 mb-4">
          Match Time: {new Date(match.scheduledTime).toLocaleString()}
        </div>
      )}

      {/* Results Entry */}
      {isTeamLeader && !hasSubmitted ? (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded p-4">
          <div className="text-orange-400 text-sm font-medium mb-3">Submit Match Results</div>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-white text-sm">{match.team1.name}:</span>
              <input
                type="number"
                min="0"
                value={team1Score}
                onChange={(e) => setTeam1Score(e.target.value)}
                className="w-16 bg-black/20 border border-white/20 rounded px-2 py-1 text-white text-center"
                placeholder="0"
              />
            </div>
            <div className="text-gray-400">-</div>
            <div className="flex items-center gap-2">
              <span className="text-white text-sm">{match.team2.name}:</span>
              <input
                type="number"
                min="0"
                value={team2Score}
                onChange={(e) => setTeam2Score(e.target.value)}
                className="w-16 bg-black/20 border border-white/20 rounded px-2 py-1 text-white text-center"
                placeholder="0"
              />
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting || !team1Score || !team2Score}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit Results'}
          </button>
          <div className="text-xs text-gray-400 mt-2">
            Both team leaders must submit matching scores for results to be confirmed
          </div>
        </div>
      ) : hasSubmitted ? (
        <div className="bg-green-500/10 border border-green-500/20 rounded p-3">
          <div className="text-green-400 text-sm font-medium">✅ You have submitted results</div>
          <div className="text-xs text-gray-400 mt-1">
            Waiting for the other team leader to confirm
          </div>
        </div>
      ) : !isTeamLeader ? (
        <div className="bg-gray-500/10 border border-gray-500/20 rounded p-3">
          <div className="text-gray-400 text-sm">Only team leaders can submit results</div>
        </div>
      ) : null}

      {/* Current Results (if any) */}
      {match.results && (
        <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded p-3">
          <div className="text-blue-400 text-sm font-medium mb-2">Current Results</div>
          <div className="text-white text-sm">
            {match.team1.name}: {match.results.team1Score} - {match.team2.name}: {match.results.team2Score}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Submitted by {match.results.submittedBy.length} team leader(s)
            {match.results.confirmed ? ' • Confirmed' : ' • Awaiting confirmation'}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResultsClient() {
  return <ResultsContent />;
}
