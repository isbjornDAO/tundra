'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import { Layout } from '@/components/Layout';
import { useTeam1Auth } from '@/hooks/useTeam1Auth';
import { useTournaments, useBracket, useMatches, useProposeTime, useRespondToTime, useReportResult } from '@/hooks/useTournaments';
import { type Team, type BracketMatch, GAMES } from '@/types/tournament';

interface MatchCardProps {
  match: BracketMatch;
  currentUserAddress: string;
  onScheduleUpdate: (matchId: string, scheduledTime: Date, organizerApproval: boolean) => void;
  onSubmitResult: (matchId: string, winner: Team) => void;
  onClick: () => void;
}

function MatchCard({ match, currentUserAddress, onScheduleUpdate, onSubmitResult, onClick }: MatchCardProps) {
  const isOrganizer1 = match.team1.organizer.toLowerCase() === currentUserAddress.toLowerCase();
  const isOrganizer2 = match.team2.organizer.toLowerCase() === currentUserAddress.toLowerCase();
  const isCurrentUserOrganizer = isOrganizer1 || isOrganizer2;
  const bothApproved = match.organizer1Approved && match.organizer2Approved;
  const userApproved = (isOrganizer1 && match.organizer1Approved) || (isOrganizer2 && match.organizer2Approved);

  const getStatusColor = () => {
    if (match.status === 'completed') return 'border-green-500/50 bg-green-500/10';
    if (match.status === 'scheduled') return 'border-blue-500/50 bg-blue-500/10';
    if (isCurrentUserOrganizer && !bothApproved) return 'border-yellow-500/50 bg-yellow-500/10';
    return 'border-gray-500/30 bg-white/5';
  };

  const getActionMessage = () => {
    if (match.status === 'completed') return null;
    if (isCurrentUserOrganizer) {
      if (!match.scheduledTime) return 'Propose a match time';
      if (!userApproved) return 'Approve the scheduled time';
      if (!bothApproved) return 'Waiting for opponent approval';
      if (match.status === 'scheduled') return 'Submit match results';
    }
    return null;
  };

  const actionMessage = getActionMessage();

  return (
    <div
      onClick={onClick}
      className={`relative cursor-pointer transition-all duration-200 hover:scale-[1.02] ${getStatusColor()} border-2 rounded-lg p-4 min-h-[160px] flex flex-col justify-between ${isCurrentUserOrganizer ? 'ring-1 ring-white/10' : ''}`}
    >
      {/* Status Badge */}
      <div className="absolute top-3 right-3">
        {match.status === 'completed' && (
          <div className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
            <span>✓</span> Complete
          </div>
        )}
        {match.status === 'scheduled' && (
          <div className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
            <span>📅</span> Scheduled
          </div>
        )}
        {match.status === 'pending' && (
          <div className="bg-gray-500/20 text-gray-400 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
            <span>⏳</span> Pending
          </div>
        )}
      </div>

      {/* Teams */}
      <div className="space-y-2 mt-6">
        <div className={`flex items-center justify-between p-3 rounded-lg transition-all ${
          match.winner?.id === match.team1.id ? 'bg-green-500/20 border border-green-500/40' : 'bg-white/5 hover:bg-white/10'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${match.organizer1Approved ? 'bg-green-400' : 'bg-gray-400'}`} />
            <div className="flex flex-col">
              <span className="text-white font-medium text-sm">{match.team1.name}</span>
              <span className="text-gray-400 text-xs">{match.team1.region}</span>
            </div>
          </div>
          {match.winner?.id === match.team1.id && <span className="text-green-400 text-lg">🏆</span>}
        </div>
        
        <div className="text-center text-gray-400 text-xs font-medium">VS</div>
        
        <div className={`flex items-center justify-between p-3 rounded-lg transition-all ${
          match.winner?.id === match.team2.id ? 'bg-green-500/20 border border-green-500/40' : 'bg-white/5 hover:bg-white/10'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${match.organizer2Approved ? 'bg-green-400' : 'bg-gray-400'}`} />
            <div className="flex flex-col">
              <span className="text-white font-medium text-sm">{match.team2.name}</span>
              <span className="text-gray-400 text-xs">{match.team2.region}</span>
            </div>
          </div>
          {match.winner?.id === match.team2.id && <span className="text-green-400 text-lg">🏆</span>}
        </div>
      </div>

      {/* Time/Actions */}
      <div className="mt-4 space-y-2">
        {match.scheduledTime ? (
          <div className="text-center bg-white/5 rounded-lg p-2">
            <div className="text-xs text-gray-400 mb-1">Scheduled for</div>
            <div className="text-xs text-white font-medium">
              {new Date(match.scheduledTime).toLocaleDateString()} at {new Date(match.scheduledTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </div>
          </div>
        ) : (
          <div className="text-center text-xs text-gray-400 bg-white/5 rounded-lg p-2">
            Time not set
          </div>
        )}
        
        {actionMessage && (
          <div className="text-center">
            <div className="text-xs text-yellow-400 font-medium bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2">
              👆 {actionMessage}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TournamentBracketsContent() {
  const { address } = useTeam1Auth();
  const searchParams = useSearchParams();
  const gameParam = searchParams.get('game');
  
  const [selectedGame, setSelectedGame] = useState(gameParam || 'CS2');
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null);
  
  // Fetch tournaments
  const { data: tournamentsData } = useTournaments();
  const tournaments = tournamentsData?.tournaments || [];
  
  // Find active tournament for selected game
  const activeTournament = tournaments.find(t => 
    t.game === selectedGame && (t.status === 'active' || t.status === 'full')
  );
  
  // Fetch bracket and matches for active tournament
  const { data: bracketData } = useBracket(activeTournament?._id || '');
  const { data: matchesData } = useMatches(bracketData?.bracket?._id || '');
  
  const matches = matchesData?.matches || [];
  const bracket = bracketData?.bracket;
  
  const proposeTimeMutation = useProposeTime();
  const respondToTimeMutation = useRespondToTime();
  const reportResultMutation = useReportResult();

  // User's matches and action items
  const userMatches = matches.filter(match => 
    match.team1.organizer.toLowerCase() === address?.toLowerCase() || 
    match.team2.organizer.toLowerCase() === address?.toLowerCase()
  );
  
  const pendingActions = userMatches.filter(match => {
    if (match.status === 'completed') return false;
    const isOrganizer1 = match.team1.organizer.toLowerCase() === address?.toLowerCase();
    const isOrganizer2 = match.team2.organizer.toLowerCase() === address?.toLowerCase();
    const userApproved = (isOrganizer1 && match.organizer1Approved) || (isOrganizer2 && match.organizer2Approved);
    return !userApproved || (match.status === 'scheduled' && match.organizer1Approved && match.organizer2Approved);
  });

  const tournamentStats = {
    totalMatches: matches.length,
    completedMatches: matches.filter(m => m.status === 'completed').length,
    scheduledMatches: matches.filter(m => m.status === 'scheduled').length,
    pendingMatches: matches.filter(m => m.status === 'pending').length
  };

  // Group matches by round
  const matchesByRound = matches.reduce((acc, match) => {
    if (!acc[match.round]) acc[match.round] = [];
    acc[match.round].push(match);
    return acc;
  }, {} as Record<string, BracketMatch[]>);

  const handleScheduleUpdate = async (matchId: string, scheduledTime: Date, organizerApproval: boolean) => {
    try {
      await proposeTimeMutation.mutateAsync({
        matchId,
        proposedTime: scheduledTime.toISOString(),
        proposedBy: address || ''
      });
    } catch (error) {
      console.error('Failed to propose time:', error);
    }
  };

  const handleResultSubmission = async (matchId: string, winner: Team) => {
    try {
      await reportResultMutation.mutateAsync({
        matchId,
        winnerId: winner.id,
        reportedBy: address || ''
      });
    } catch (error) {
      console.error('Failed to submit result:', error);
    }
  };

  const GameSelector = () => (
    <div className="flex items-center gap-4 overflow-x-auto pb-2">
      {GAMES.map((game) => {
        const tournament = tournaments.find(t => t.game === game);
        const hasActiveTournament = tournament && (tournament.status === 'active' || tournament.status === 'full');
        
        return (
          <button
            key={game}
            onClick={() => hasActiveTournament && setSelectedGame(game)}
            disabled={!hasActiveTournament}
            className={`flex-shrink-0 px-4 py-2 rounded-lg border transition-all ${
              selectedGame === game 
                ? 'border-white/40 bg-white/10' 
                : 'border-white/20 bg-white/5 hover:bg-white/10'
            } ${!hasActiveTournament ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="text-center">
              <h3 className="text-sm font-medium text-white mb-1">{game}</h3>
              {hasActiveTournament ? (
                <span className="text-xs text-green-400 font-medium">
                  {tournament.registeredTeams}/{tournament.maxTeams} Teams
                </span>
              ) : (
                <span className="text-xs text-gray-400">No Active Tournament</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );

  if (!activeTournament) {
    return (
      <AuthGuard>
        <Layout>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-bold text-white">Tournament Brackets</h2>
            <GameSelector />
          </div>
          
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4 text-4xl">🏆</div>
            <h3 className="text-white font-medium mb-2">No Active Tournament</h3>
            <p className="text-gray-400 text-sm mb-4">
              There's no active tournament for {selectedGame} at the moment.
            </p>
            <button 
              onClick={() => window.location.href = '/tournament/register'}
              className="btn btn-primary"
            >
              Register for Next Tournament
            </button>
          </div>
        </Layout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Layout>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-bold text-white">{selectedGame} Tournament</h2>
          <GameSelector />
        </div>

        {/* User Dashboard */}
        {address && userMatches.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">Your Matches</h3>
            
            {/* Action Items */}
            {pendingActions.length > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                  <h4 className="text-yellow-400 font-medium">Action Required ({pendingActions.length})</h4>
                </div>
                <div className="space-y-2">
                  {pendingActions.map(match => {
                    const isOrganizer1 = match.team1.organizer.toLowerCase() === address.toLowerCase();
                    const userApproved = (isOrganizer1 && match.organizer1Approved) || (!isOrganizer1 && match.organizer2Approved);
                    const opponent = isOrganizer1 ? match.team2.name : match.team1.name;
                    
                    let actionText = '';
                    if (!match.scheduledTime) actionText = 'Propose a match time';
                    else if (!userApproved) actionText = 'Approve the scheduled time';
                    else if (match.status === 'scheduled') actionText = 'Submit match results';
                    else actionText = 'Waiting for opponent approval';
                    
                    return (
                      <div key={match.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => setSelectedMatch(match)}>
                        <div className="flex items-center gap-3">
                          <div className="text-sm text-white font-medium">vs {opponent}</div>
                          <div className="text-xs text-gray-400">{actionText}</div>
                        </div>
                        <div className="text-xs text-yellow-400">Click to manage →</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* User Match Summary */}
            <div className="bg-white/5 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-white font-medium">Your Tournament Progress</h4>
                <div className="text-sm text-gray-400">{userMatches.filter(m => m.status === 'completed').length}/{userMatches.length} Complete</div>
              </div>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-gray-300">{userMatches.filter(m => m.status === 'completed').length} Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="text-gray-300">{userMatches.filter(m => m.status === 'scheduled').length} Scheduled</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span className="text-gray-300">{userMatches.filter(m => m.status === 'pending').length} Pending</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tournament Overview */}
        <div className="bg-white/5 rounded-lg p-4 mb-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Tournament Overview</h3>
              <p className="text-gray-400 text-sm">
                Single Elimination • {activeTournament.registeredTeams} Teams • 
                {tournamentStats.totalMatches > 0 ? ` ${Math.round((tournamentStats.completedMatches / tournamentStats.totalMatches) * 100)}% Complete` : ' Starting Soon'}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-green-500/10 rounded-lg p-3">
              <div className="text-lg font-semibold text-green-400">{tournamentStats.completedMatches}</div>
              <div className="text-xs text-green-400">Complete</div>
            </div>
            <div className="bg-blue-500/10 rounded-lg p-3">
              <div className="text-lg font-semibold text-blue-400">{tournamentStats.scheduledMatches}</div>
              <div className="text-xs text-blue-400">Scheduled</div>
            </div>
            <div className="bg-gray-500/10 rounded-lg p-3">
              <div className="text-lg font-semibold text-gray-400">{tournamentStats.pendingMatches}</div>
              <div className="text-xs text-gray-400">Pending</div>
            </div>
          </div>
        </div>

        {/* Bracket Visualization */}
        <div className="space-y-8">
          {['first', 'quarter', 'semi', 'final'].map(round => {
            const roundMatches = matchesByRound[round] || [];
            if (roundMatches.length === 0) return null;
            
            const roundTitles = {
              first: 'Round 1 - First Round',
              quarter: 'Round 2 - Quarter Finals',
              semi: 'Round 3 - Semi Finals',
              final: 'Round 4 - Finals'
            };
            
            return (
              <div key={round}>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-white">{roundTitles[round]}</h4>
                  <div className="text-sm text-gray-400">{roundMatches.length} matches</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {roundMatches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      currentUserAddress={address || ''}
                      onScheduleUpdate={handleScheduleUpdate}
                      onSubmitResult={handleResultSubmission}
                      onClick={() => setSelectedMatch(match)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Show tournament completion */}
        {activeTournament.status === 'completed' && (
          <div className="text-center py-8 mt-8 border-t border-white/10">
            <div className="text-yellow-400 mb-4 text-4xl">🏆</div>
            <h5 className="text-white font-medium mb-2">Tournament Complete!</h5>
            {activeTournament.winner && (
              <p className="text-gray-400 text-sm">
                Winner: <span className="text-green-400 font-medium">{activeTournament.winner.name}</span>
              </p>
            )}
          </div>
        )}
      </Layout>
    </AuthGuard>
  );
}

export default function TournamentBrackets() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TournamentBracketsContent />
    </Suspense>
  );
}