'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { WagmiGuard } from '@/components/WagmiGuard';
import { Layout } from '@/components/Layout';
import { useTeam1Auth } from '@/hooks/useTeam1Auth';
import { useTournaments, useBracket, useMatches } from '@/hooks/useTournaments';
import { type BracketMatch, GAMES } from '@/types/tournament';

function TournamentBracketsContent() {
  const [mounted, setMounted] = useState(false);
  const { address } = useTeam1Auth();
  const searchParams = useSearchParams();
  const gameParam = searchParams.get('game');
  const [selectedGame, setSelectedGame] = useState(gameParam || 'CS2');
  const [proposedTime, setProposedTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: tournamentsData, isLoading: tournamentsLoading } = useTournaments();
  
  // For CS2, use known IDs directly
  const cs2TournamentId = '68745d57a6abf1c233fd9f8b';
  const cs2BracketId = '687465d6d3016c387dfbd9cc';
  
  const { data: bracketData } = useBracket(selectedGame === 'CS2' ? cs2TournamentId : '');
  const { data: matchesData } = useMatches(selectedGame === 'CS2' ? cs2BracketId : '');
  
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
  const activeTournament = tournaments.find(t => 
    t.game === selectedGame && (t.status === 'active' || t.status === 'full')
  );

  // Mock tournament for CS2 if not found
  const mockCS2Tournament = selectedGame === 'CS2' ? {
    _id: cs2TournamentId,
    game: 'CS2',
    status: 'active',
    bracketId: cs2BracketId,
    maxTeams: 2,
    registeredTeams: 2,
    region: 'Global'
  } : null;

  const finalTournament = activeTournament || mockCS2Tournament;
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
      setProposedTime('');
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
      
      // Refresh time slots
      const matches = matchesData?.matches || [];
      const firstMatchId = matches.length > 0 ? matches[0]._id : null;
      if (firstMatchId) {
        const slotsRes = await fetch(`/api/tournaments/matches/schedule?matchId=${firstMatchId}`);
        const slotsData = await slotsRes.json();
        setTimeSlots(slotsData.timeSlots || []);
      }
      window.location.reload();
    } catch (error) {
      console.error('Error rejecting time:', error);
      alert(`Failed to reject time: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
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
              const hasActiveTournament = tournament && (tournament.status === 'active' || tournament.status === 'full');
              const isCS2WithFallback = game === 'CS2';
              const isAvailable = hasActiveTournament || isCS2WithFallback;
              
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
                      hasActiveTournament ? (
                        <span className="text-green-400">
                          {tournament.registeredTeams}/{tournament.maxTeams} Teams
                        </span>
                      ) : (
                        <span className="text-blue-400">2/2 Teams</span>
                      )
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
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white">Tournament Matches</h3>
                
                {matches.map((match) => {
                  const isMyMatch = match.team1?.organizer?.toLowerCase() === address?.toLowerCase() || 
                                   match.team2?.organizer?.toLowerCase() === address?.toLowerCase();
                  const myProposals = timeSlots.filter(slot => 
                    slot.proposedBy.toLowerCase() === address?.toLowerCase() && 
                    (slot.status === 'pending' || slot.status === 'accepted')
                  );
                  const opponentProposals = timeSlots.filter(slot => 
                    slot.proposedBy.toLowerCase() !== address?.toLowerCase() && slot.status === 'pending'
                  );
                  
                  // Find who proposed the current scheduled time
                  const scheduledProposal = timeSlots.find(slot => 
                    slot.status === 'accepted' || 
                    (match.scheduledTime && new Date(slot.proposedTime).getTime() === new Date(match.scheduledTime).getTime())
                  );
                  
                  // Determine actual approval status based on time slots
                  // A team is "ready" only if they have an ACTIVE (accepted or pending) proposal, not rejected ones
                  const team1ActiveProposals = timeSlots.filter(slot => 
                    slot.proposedBy.toLowerCase() === match.team1?.organizer?.toLowerCase() && 
                    (slot.status === 'pending' || slot.status === 'accepted')
                  );
                  const team2ActiveProposals = timeSlots.filter(slot => 
                    slot.proposedBy.toLowerCase() === match.team2?.organizer?.toLowerCase() && 
                    (slot.status === 'pending' || slot.status === 'accepted')
                  );
                  
                  const team1HasApproved = team1ActiveProposals.length > 0 || 
                                          (scheduledProposal?.respondedBy?.toLowerCase() === match.team1?.organizer?.toLowerCase());
                  const team2HasApproved = team2ActiveProposals.length > 0 || 
                                          (scheduledProposal?.respondedBy?.toLowerCase() === match.team2?.organizer?.toLowerCase());

                  return (
                    <div key={match._id} className={`rounded-lg border p-6 ${
                      isMyMatch ? 'bg-blue-500/5 border-blue-500/20' : 'bg-white/5 border-white/10'
                    }`}>
                      {/* Match Header */}
                      <div className="text-center mb-6">
                        <h4 className="text-lg font-semibold text-white">Final Match</h4>
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

                      {/* Match Status */}
                      <div className="text-center mb-6">
                        {match.status === 'pending' && (
                          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                            <div className="text-yellow-400 font-medium">
                              ⏳ Waiting for match time coordination
                            </div>
                          </div>
                        )}
                        {match.status === 'scheduled' && match.scheduledTime && (
                          <>
                            {team1HasApproved && team2HasApproved ? (
                              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                                <div className="text-blue-400 font-medium">
                                  📅 Match Confirmed: {new Date(match.scheduledTime).toLocaleDateString()} at{' '}
                                  {new Date(match.scheduledTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', timeZoneName: 'short'})}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">Both teams are ready to play</div>
                              </div>
                            ) : (
                              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                                <div className="text-yellow-400 font-medium">
                                  📅 Time Proposed: {new Date(match.scheduledTime).toLocaleDateString()} at{' '}
                                  {new Date(match.scheduledTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', timeZoneName: 'short'})}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                  Proposed by {scheduledProposal?.proposedBy.slice(0, 8)}... • 
                                  Waiting for {!team1HasApproved && !team2HasApproved ? 'both teams' : 
                                              !team1HasApproved ? match.team1?.name : match.team2?.name} to confirm
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        {match.status === 'completed' && (
                          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                            <div className="text-green-400 font-medium">
                              ✅ Match Completed
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Team Coordination (Only for participants) */}
                      {isMyMatch && match.status !== 'completed' && !(team1HasApproved && team2HasApproved) && (
                        <div className="border-t border-white/10 pt-6">
                          <h5 className="text-white font-medium mb-4">Match Coordination</h5>
                          
                          {/* Modern side by side layout for proposals */}
                          <div className="grid md:grid-cols-2 gap-6">
                            {/* Propose Time Section */}
                            {match.status !== 'completed' && (
                              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5 shadow-lg">
                                <div className="flex items-center gap-2 mb-4">
                                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                  <h6 className="text-white font-semibold text-sm">
                                    {myProposals.length > 0 ? 'Change Proposed Time' : 'Propose Match Time'}
                                  </h6>
                                </div>
                                
                                <div className="space-y-3">
                                  <div className="flex gap-3">
                                    <input
                                      type="datetime-local"
                                      value={proposedTime}
                                      onChange={(e) => setProposedTime(e.target.value)}
                                      className="flex-1 px-3 py-2.5 bg-slate-800/60 border border-slate-600/50 rounded-lg text-white text-sm focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-colors"
                                      min={new Date().toISOString().slice(0, 16)}
                                    />
                                    <button
                                      onClick={() => handleProposeTime(match._id, proposedTime)}
                                      disabled={!proposedTime || submitting}
                                      className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-800 disabled:to-blue-900 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-60"
                                    >
                                      {submitting ? (
                                        <div className="flex items-center gap-2">
                                          <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>
                                          <span>Saving...</span>
                                        </div>
                                      ) : (
                                        myProposals.length > 0 ? '📝 Update' : '📅 Propose'
                                      )}
                                    </button>
                                  </div>
                                  
                                  {/* My Proposals Status */}
                                  {myProposals.length > 0 ? (
                                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                                        <span className="text-blue-300 text-xs font-medium">Your Active Proposal</span>
                                      </div>
                                      {myProposals.map((proposal) => (
                                        <div key={proposal._id} className="text-white text-sm">
                                          <div className="font-medium">
                                            {new Date(proposal.proposedTime).toLocaleDateString('en-US', { 
                                              weekday: 'short', month: 'short', day: 'numeric' 
                                            })} at{' '}
                                            {new Date(proposal.proposedTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', timeZoneName: 'short'})}
                                          </div>
                                          <div className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                            proposal.status === 'accepted' ? 'bg-green-500/20 text-green-300' :
                                            proposal.status === 'rejected' ? 'bg-red-500/20 text-red-300' : 
                                            'bg-yellow-500/20 text-yellow-300'
                                          }`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${
                                              proposal.status === 'accepted' ? 'bg-green-400' :
                                              proposal.status === 'rejected' ? 'bg-red-400' : 'bg-yellow-400'
                                            }`}></div>
                                            {proposal.status === 'accepted' ? 'Accepted' :
                                             proposal.status === 'rejected' ? 'Declined' : 'Pending'}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="border-2 border-dashed border-slate-600/50 rounded-lg p-4 text-center">
                                      <div className="text-2xl mb-1">⏰</div>
                                      <div className="text-slate-400 text-sm">Waiting for your time proposal</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Opponent Proposals Section */}
                            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5 shadow-lg">
                              <div className="flex items-center gap-2 mb-4">
                                <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                                <h6 className="text-white font-semibold text-sm">Opponent's Proposal</h6>
                              </div>
                              
                              {opponentProposals.length > 0 ? (
                                <div className="space-y-3">
                                  {opponentProposals.map((proposal) => (
                                    <div key={proposal._id} className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                                      <div className="mb-3">
                                        <div className="text-white font-medium text-sm mb-1">
                                          {new Date(proposal.proposedTime).toLocaleDateString('en-US', { 
                                            weekday: 'short', month: 'short', day: 'numeric' 
                                          })} at{' '}
                                          {new Date(proposal.proposedTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', timeZoneName: 'short'})}
                                        </div>
                                        <div className="text-slate-400 text-xs">
                                          Proposed by {proposal.proposedBy.slice(0, 8)}...
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => handleApproveTime(match._id)}
                                          disabled={submitting}
                                          className="flex-1 px-3 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-green-800 disabled:to-green-900 text-white text-xs font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-60"
                                        >
                                          {submitting ? '⏳ Accepting...' : '✅ Accept'}
                                        </button>
                                        <button
                                          onClick={() => handleRejectTime(proposal._id)}
                                          disabled={submitting}
                                          className="flex-1 px-3 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-red-800 disabled:to-red-900 text-white text-xs font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-60"
                                        >
                                          {submitting ? '⏳ Declining...' : '❌ Decline'}
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="border-2 border-dashed border-slate-600/50 rounded-lg p-6 text-center">
                                  <div className="text-2xl mb-2">👥</div>
                                  <div className="text-slate-400 text-sm mb-1">Waiting for opponent's proposal</div>
                                  <div className="text-slate-500 text-xs">They need to suggest a match time</div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                        </div>
                      )}
                    </div>
                  );
                })}
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