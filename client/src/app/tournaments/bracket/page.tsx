'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { WagmiGuard } from '@/components/WagmiGuard';
import { Layout } from '@/components/Layout';
import { useTeam1Auth } from '@/hooks/useTeam1Auth';
import { useTournaments, useBracket, useMatches } from '@/hooks/useTournaments';
import { type BracketMatch, GAMES } from '@/types/tournament';
import TimeCoordinationModule from '@/components/bracket/TimeCoordinationModule';
import ResultsEntryModule from '@/components/bracket/ResultsEntryModule';

function TournamentBracketsContent() {
  const [mounted, setMounted] = useState(false);
  const { address } = useTeam1Auth();
  const searchParams = useSearchParams();
  const gameParam = searchParams.get('game');
  const [selectedGame, setSelectedGame] = useState(gameParam || 'Valorant');
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: tournamentsData, isLoading: tournamentsLoading } = useTournaments();
  
  // Get current tournament from database
  const getCurrentTournament = () => {
    const tournaments = tournamentsData?.tournaments || [];
    return tournaments.find(t => 
      t.game === selectedGame && (t.status === 'active' || t.status === 'full')
    );
  };
  
  const getCurrentTournamentId = () => {
    const tournament = getCurrentTournament();
    return tournament?._id || '';
  };
  
  const getCurrentBracketId = () => {
    const tournament = getCurrentTournament();
    return tournament?.bracketId || '';
  };
  
  const { data: bracketData } = useBracket(getCurrentTournamentId());
  const { data: matchesData } = useMatches(getCurrentBracketId());
  
  const [timeSlots, setTimeSlots] = useState([]);

  // Fetch time slots when match is available
  useEffect(() => {
    const matches = matchesData?.matches || [];
    const firstMatchId = matches.length > 0 ? matches[0]._id : null;
    
    if (firstMatchId) {
      fetch(`/api/tournaments/matches/schedule?matchId=${firstMatchId}`)
        .then(res => res.json())
        .then(data => setTimeSlots(data.timeSlots || []))
        .catch(err => console.error('Failed to fetch time slots:', err));
    }
  }, [matchesData]);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const tournaments = tournamentsData?.tournaments || [];
  const activeTournament = getCurrentTournament();
  const finalTournament = activeTournament;
  const matches = matchesData?.matches || [];

  // Time proposal functions
  const handleProposeTime = async (matchId: string, time: string) => {
    if (!address || !time) return;
    
    setSubmitting(true);
    try {
      const response = await fetch('/api/tournaments/matches/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          proposedTime: time,
          proposedBy: address
        })
      });
      
      if (!response.ok) throw new Error('Failed to propose time');
      
      // Refresh time slots
      const matches = matchesData?.matches || [];
      const firstMatchId = matches.length > 0 ? matches[0]._id : null;
      if (firstMatchId) {
        const slotsRes = await fetch(`/api/tournaments/matches/schedule?matchId=${firstMatchId}`);
        const slotsData = await slotsRes.json();
        setTimeSlots(slotsData.timeSlots || []);
      }
    } catch (error) {
      console.error('Error proposing time:', error);
      alert('Failed to propose time');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveTime = async (matchId: string) => {
    if (!address) return;
    
    setSubmitting(true);
    try {
      const response = await fetch('/api/tournaments/matches/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          approvedBy: address
        })
      });
      
      if (!response.ok) throw new Error('Failed to approve time');
      
      // Refresh time slots and matches
      const matches = matchesData?.matches || [];
      const firstMatchId = matches.length > 0 ? matches[0]._id : null;
      if (firstMatchId) {
        const slotsRes = await fetch(`/api/tournaments/matches/schedule?matchId=${firstMatchId}`);
        const slotsData = await slotsRes.json();
        setTimeSlots(slotsData.timeSlots || []);
      }
      window.location.reload();
    } catch (error) {
      console.error('Error approving time:', error);
      alert('Failed to approve time');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectTime = async (timeSlotId: string) => {
    if (!address) return;
    
    setSubmitting(true);
    try {
      const response = await fetch('/api/tournaments/matches/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeSlotId,
          action: 'rejected',
          respondedBy: address
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reject time');
      }
      
      refreshData();
    } catch (error) {
      console.error('Error rejecting time:', error);
      alert(`Failed to reject time: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const refreshData = async () => {
    setRefreshKey(prev => prev + 1);
    // Refresh time slots
    const matches = matchesData?.matches || [];
    const firstMatchId = matches.length > 0 ? matches[0]._id : null;
    if (firstMatchId) {
      const slotsRes = await fetch(`/api/tournaments/matches/schedule?matchId=${firstMatchId}`);
      const slotsData = await slotsRes.json();
      setTimeSlots(slotsData.timeSlots || []);
    }
    window.location.reload();
  };

  // Check if user is participating in any match
  const userMatch = matches.find(match => 
    match.team1?.organizer?.toLowerCase() === address?.toLowerCase() ||
    match.team2?.organizer?.toLowerCase() === address?.toLowerCase()
  );

  const isUserTeam1 = userMatch && userMatch.team1?.organizer?.toLowerCase() === address?.toLowerCase();
  const isUserTeam2 = userMatch && userMatch.team2?.organizer?.toLowerCase() === address?.toLowerCase();

  return (
    <WagmiGuard>
      <Layout>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Tournament Brackets</h1>
          <p className="text-gray-400">View tournament progress and coordinate match times</p>
          
          {/* Quick Info Box */}
          <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <div className="text-blue-400 text-sm font-medium mb-2">For Clan Leaders:</div>
            <div className="text-xs text-gray-300 space-y-1">
              <div>• Register your clan for tournaments</div>
              <div>• Coordinate match times with opponents</div>
              <div>• Report match results after games</div>
            </div>
          </div>
        </div>

        {/* Game Selection */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Select Game</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {GAMES.map((game) => {
              const tournament = tournaments.find(t => t.game === game);
              const hasActiveTournament = tournament && (tournament.status === 'active' || tournament.status === 'full' || tournament.status === 'open');
              const isAvailable = hasActiveTournament;
              
              return (
                <button
                  key={game}
                  onClick={() => isAvailable && setSelectedGame(game)}
                  disabled={!isAvailable}
                  className={`p-4 rounded-lg border transition-all text-center ${
                    selectedGame === game 
                      ? 'border-blue-500 bg-blue-500/20 text-blue-400' 
                      : isAvailable
                      ? 'border-white/20 bg-white/5 hover:border-white/40 text-white'
                      : 'border-white/10 bg-white/5 opacity-50 cursor-not-allowed text-gray-500'
                  }`}
                >
                  <div className="font-medium mb-1">{game}</div>
                  <div className="text-xs">
                    {isAvailable ? (
                      <span className={`${
                        tournament.status === 'active' ? 'text-green-400' : 
                        tournament.status === 'full' ? 'text-yellow-400' : 
                        'text-blue-400'
                      }`}>
                        {tournament.registeredTeams}/{tournament.maxTeams} Teams
                      </span>
                    ) : (
                      <span className="text-gray-500">No Tournament</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {!finalTournament ? (
          /* No Tournament State */
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-2xl font-bold text-white mb-2">No Active Tournament</h3>
            <p className="text-gray-400 mb-8">There's currently no active tournament for {selectedGame}</p>
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 max-w-md mx-auto">
              <h4 className="text-white font-medium mb-3">What's Next?</h4>
              <ul className="text-sm text-gray-400 space-y-2">
                <li>• Watch for tournament announcements</li>
                <li>• Join Team1 Discord for updates</li>
                <li>• Register when tournaments open</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Tournament Info */}
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">{selectedGame} Tournament</h2>
                  <div className="flex items-center gap-6 text-sm text-gray-300">
                    <span>Single Elimination</span>
                    <span>{finalTournament.registeredTeams}/{finalTournament.maxTeams} Teams</span>
                    <span className="capitalize">{finalTournament.status}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl mb-1">🏆</div>
                  <div className="text-xl font-bold text-yellow-400">$5,000</div>
                  <div className="text-xs text-gray-400">Prize Pool</div>
                </div>
              </div>
            </div>

            {matches.length === 0 ? (
              /* No Matches State */
              <div className="text-center py-16">
                <div className="text-5xl mb-4">⚔️</div>
                <h3 className="text-xl font-bold text-white mb-2">Bracket Coming Soon</h3>
                <p className="text-gray-400 mb-6">Tournament organizers are preparing the bracket</p>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 max-w-lg mx-auto">
                  <p className="text-sm text-gray-400">Matches will appear here once the bracket is generated</p>
                </div>
              </div>
            ) : (
              /* Matches Display */
              <div className="space-y-8">
                <h3 className="text-xl font-semibold text-white">Tournament Bracket</h3>
                
                {/* Check if this is a simple 2-team tournament */}
                {finalTournament.maxTeams === 2 ? (
                  /* Simple 2-team match layout for Dota */
                  <div className="max-w-2xl mx-auto">
                    <div className="text-center mb-6">
                      <h4 className="text-lg font-semibold text-white border-l-4 border-purple-500 pl-4 inline-block">
                        Championship Match
                      </h4>
                    </div>
                    {matches.map((match) => {
                      const isMyMatch = match.team1?.organizer?.toLowerCase() === address?.toLowerCase() || 
                                       match.team2?.organizer?.toLowerCase() === address?.toLowerCase();
                      
                      return (
                        <div key={match._id} className={`rounded-lg border p-6 ${
                          isMyMatch ? 'bg-purple-500/5 border-purple-500/20' : 'bg-white/5 border-white/10'
                        }`}>
                          {/* Match Header */}
                          <div className="text-center mb-6">
                            <h4 className="text-lg font-semibold text-white">
                              {match.team1?.name} vs {match.team2?.name}
                            </h4>
                            <div className="text-sm text-gray-400 mt-1">Best of 3 • Single Elimination</div>
                          </div>

                          {/* Teams - Simplified for 2-team */}
                          <div className="space-y-4 mb-6">
                            {/* Team 1 */}
                            <div className={`p-4 rounded-lg border ${
                              match.team1?.organizer?.toLowerCase() === address?.toLowerCase()
                                ? 'bg-green-500/10 border-green-500/20'
                                : 'bg-white/5 border-white/10'
                            }`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="bg-blue-500/20 border border-blue-500/30 rounded px-3 py-2">
                                    <span className="text-blue-300 text-sm font-bold">
                                      {match.team1?.country || 'TEAM'}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="text-white font-medium">{match.team1?.name}</div>
                                    <div className="text-gray-400 text-xs">{match.team1?.region}</div>
                                  </div>
                                </div>
                                {match.winner?.name === match.team1?.name && (
                                  <span className="text-yellow-400 text-xl">🏆</span>
                                )}
                              </div>
                            </div>

                            {/* VS */}
                            <div className="flex items-center justify-center">
                              <div className="bg-white/10 rounded-full w-12 h-12 flex items-center justify-center border border-white/20">
                                <span className="text-white font-bold">VS</span>
                              </div>
                            </div>

                            {/* Team 2 */}
                            <div className={`p-4 rounded-lg border ${
                              match.team2?.organizer?.toLowerCase() === address?.toLowerCase()
                                ? 'bg-green-500/10 border-green-500/20'
                                : 'bg-white/5 border-white/10'
                            }`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="bg-purple-500/20 border border-purple-500/30 rounded px-3 py-2">
                                    <span className="text-purple-300 text-sm font-bold">
                                      {match.team2?.country || 'TEAM'}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="text-white font-medium">{match.team2?.name}</div>
                                    <div className="text-gray-400 text-xs">{match.team2?.region}</div>
                                  </div>
                                </div>
                                {match.winner?.name === match.team2?.name && (
                                  <span className="text-yellow-400 text-xl">🏆</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Match Status and Actions */}
                          <div className="space-y-4">
                            {/* Time Coordination */}
                            <TimeCoordinationModule
                              match={match}
                              userAddress={address || ''}
                              isUserMatch={isMyMatch}
                              onTimeProposed={handleProposeTime}
                              onTimeApproved={handleApproveTime}
                              onTimeRejected={handleRejectTime}
                              submitting={submitting}
                            />
                            
                            {/* Results Entry */}
                            <ResultsEntryModule
                              match={match}
                              onResultsSubmitted={refreshData}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Multi-round tournament bracket */
                  (() => {
                    const rounds = ['quarterfinal', 'semifinal', 'final'];
                    const matchesByRound = rounds.reduce((acc, round) => {
                      acc[round] = matches.filter(match => match.round === round);
                      return acc;
                    }, {} as Record<string, typeof matches>);
                    
                    return rounds.map(round => {
                      const roundMatches = matchesByRound[round];
                      if (roundMatches.length === 0) return null;
                      
                      const roundTitle = round === 'quarterfinal' ? 'Quarterfinals' : 
                                       round === 'semifinal' ? 'Semifinals' : 'Final';
                      
                      const roundColor = round === 'quarterfinal' ? 'border-blue-500' :
                                        round === 'semifinal' ? 'border-orange-500' : 'border-yellow-500';
                      
                      return (
                        <div key={round} className="space-y-4">
                          <div className="flex items-center gap-4">
                            <h4 className={`text-lg font-semibold text-white border-l-4 ${roundColor} pl-4`}>
                              {roundTitle}
                            </h4>
                            <div className="text-sm text-gray-400">
                              {roundMatches.length} match{roundMatches.length > 1 ? 'es' : ''}
                            </div>
                          </div>
                          <div className={`grid gap-4 ${
                            round === 'quarterfinal' ? 'grid-cols-1 lg:grid-cols-2' :
                            round === 'semifinal' ? 'grid-cols-1 lg:grid-cols-2' :
                            'grid-cols-1 max-w-2xl mx-auto'
                          }`}>
                          {roundMatches.map((match) => {
                  const isMyMatch = match.team1?.organizer?.toLowerCase() === address?.toLowerCase() || 
                                   match.team2?.organizer?.toLowerCase() === address?.toLowerCase();
                  
                  // Simplified status indicators for display only
                  const team1HasApproved = match.status === 'scheduled' || match.status === 'completed';
                  const team2HasApproved = match.status === 'scheduled' || match.status === 'completed';

                  return (
                    <div key={match._id} className={`rounded-lg border p-6 ${
                      isMyMatch ? 'bg-blue-500/5 border-blue-500/20' : 'bg-white/5 border-white/10'
                    }`}>
                      {/* Match Header */}
                      <div className="text-center mb-6">
                        <h4 className="text-lg font-semibold text-white">
                          {match.team1?._id && match.team2?._id ? (
                            `${match.team1.name} vs ${match.team2.name}`
                          ) : (
                            `${roundTitle.slice(0, -1)} Match`
                          )}
                        </h4>
                        {match.status === 'completed' && match.winner && (
                          <div className="mt-2 flex items-center justify-center gap-2">
                            <span className="text-yellow-400 text-xl">🏆</span>
                            <div className="bg-green-500/20 border border-green-500/30 rounded px-3 py-1">
                              <span className="text-green-300 text-sm font-bold">
                                {match.winner.name.match(/\[([^\]]+)\]/)?.[1] || match.winner.name.substring(0, 4).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-green-400 font-medium">
                              {match.winner.name.replace(/\[[^\]]+\]\s*/, '')} Wins!
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Teams */}
                      <div className="space-y-4 mb-6">
                        {/* Team 1 */}
                        <div className={`p-4 rounded-lg border ${
                          match.team1?.organizer?.toLowerCase() === address?.toLowerCase()
                            ? 'bg-green-500/10 border-green-500/20'
                            : 'bg-white/5 border-white/10'
                        }`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              {/* Clan Tag */}
                              <div className="bg-blue-500/20 border border-blue-500/30 rounded px-2 py-1">
                                <span className="text-blue-300 text-xs font-bold">
                                  {match.team1?.name ? match.team1.name.match(/\[([^\]]+)\]/)?.[1] || match.team1.name.substring(0, 4).toUpperCase() : 'TBD'}
                                </span>
                              </div>
                              
                              {/* Team Name */}
                              <div>
                                <div className="text-white font-medium">
                                  {match.team1?.name ? match.team1.name.replace(/\[[^\]]+\]\s*/, '') : 'To Be Determined'}
                                </div>
                                <div className="text-gray-400 text-xs">
                                  Leader: {match.team1?.organizer?.slice(0, 8)}...
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {match.winner?.id === match.team1?.id && (
                                <span className="text-yellow-400 text-xl">🏆</span>
                              )}
                              <div className="flex items-center gap-1">
                                <div className={`w-3 h-3 rounded-full ${
                                  team1HasApproved ? 'bg-green-400' : 'bg-gray-400'
                                }`} />
                                <span className="text-xs text-gray-400">
                                  {team1HasApproved ? 'Ready' : 'Pending'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* VS */}
                        <div className="flex items-center justify-center">
                          <div className="bg-white/10 rounded-full w-12 h-12 flex items-center justify-center border border-white/20">
                            <span className="text-white font-bold">VS</span>
                          </div>
                        </div>

                        {/* Team 2 */}
                        <div className={`p-4 rounded-lg border ${
                          match.team2?.organizer?.toLowerCase() === address?.toLowerCase()
                            ? 'bg-green-500/10 border-green-500/20'
                            : 'bg-white/5 border-white/10'
                        }`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              {/* Clan Tag */}
                              <div className="bg-purple-500/20 border border-purple-500/30 rounded px-2 py-1">
                                <span className="text-purple-300 text-xs font-bold">
                                  {match.team2?.name ? match.team2.name.match(/\[([^\]]+)\]/)?.[1] || match.team2.name.substring(0, 4).toUpperCase() : 'TBD'}
                                </span>
                              </div>
                              
                              {/* Team Name */}
                              <div>
                                <div className="text-white font-medium">
                                  {match.team2?.name ? match.team2.name.replace(/\[[^\]]+\]\s*/, '') : 'To Be Determined'}
                                </div>
                                <div className="text-gray-400 text-xs">
                                  Leader: {match.team2?.organizer?.slice(0, 8)}...
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {match.winner?.id === match.team2?.id && (
                                <span className="text-yellow-400 text-xl">🏆</span>
                              )}
                              <div className="flex items-center gap-1">
                                <div className={`w-3 h-3 rounded-full ${
                                  team2HasApproved ? 'bg-green-400' : 'bg-gray-400'
                                }`} />
                                <span className="text-xs text-gray-400">
                                  {team2HasApproved ? 'Ready' : 'Pending'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Match Status and Actions */}
                      <div className="space-y-4 mb-6">
                        {/* Time Coordination */}
                        <TimeCoordinationModule
                          match={match}
                          userAddress={address || ''}
                          isUserMatch={isMyMatch}
                          onTimeProposed={handleProposeTime}
                          onTimeApproved={handleApproveTime}
                          onTimeRejected={handleRejectTime}
                          submitting={submitting}
                        />
                        
                        {/* Results Entry */}
                        <ResultsEntryModule
                          match={match}
                          onResultsSubmitted={refreshData}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }).filter(Boolean);
      })()
    )}
              </div>
            )}
          </div>
        )}
      </Layout>
    </WagmiGuard>
  );
}

export default function TournamentBrackets() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TournamentBracketsContent />
    </Suspense>
  );
}