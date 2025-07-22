'use client';

import { useState, useEffect, useMemo } from 'react';

interface TournamentMatchesProps {
  userAddress: string;
  clanId: string;
  isClanLeader: boolean;
}

export default function TournamentMatchesSimple({ userAddress, clanId, isClanLeader }: TournamentMatchesProps) {
  const [matches, setMatches] = useState<any[]>([]);
  
  // Debug logging
  console.log('🔍 TournamentMatchesSimple props:', { userAddress, clanId, isClanLeader });
  const [timeProposals, setTimeProposals] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedTimes, setSelectedTimes] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [submittedResults, setSubmittedResults] = useState<Record<string, boolean>>({});
  const [matchRosters, setMatchRosters] = useState<Record<string, any>>({});
  
  // Reset function to clear submitted results (for testing)
  const resetSubmittedResults = (matchId: string) => {
    setSubmittedResults(prev => {
      const newState = { ...prev };
      delete newState[matchId];
      return newState;
    });
    // Also clear the result scores for that match
    setResultScores(prev => {
      const newState = { ...prev };
      delete newState[matchId];
      return newState;
    });
  };
  const [resultScores, setResultScores] = useState<Record<string, { 
    userScore: string; 
    opponentScore: string;
    userPlayerStats: Record<string, { kills: string; deaths: string }>;
    opponentPlayerStats: Record<string, { kills: string; deaths: string }>;
  }>>({});

  const updatePlayerStats = (matchId: string, team: 'user' | 'opponent', playerId: string, field: 'kills' | 'deaths', value: string) => {
    setResultScores(prev => {
      const currentMatch = prev[matchId] || {
        userScore: '',
        opponentScore: '',
        userPlayerStats: {},
        opponentPlayerStats: {}
      };
      
      const teamStatsKey = team === 'user' ? 'userPlayerStats' : 'opponentPlayerStats';
      const currentPlayerStats = currentMatch[teamStatsKey][playerId] || { kills: '', deaths: '' };
      
      return {
        ...prev,
        [matchId]: {
          ...currentMatch,
          [teamStatsKey]: {
            ...currentMatch[teamStatsKey],
            [playerId]: {
              ...currentPlayerStats,
              [field]: value
            }
          }
        }
      };
    });
  };


  useEffect(() => {
    const fetchMatches = async () => {
      console.log('🎯 TournamentMatchesSimple - Props received:', { userAddress, clanId, isClanLeader });
      
      if (!clanId || !userAddress) {
        console.log('❌ Missing required props - clanId:', clanId, 'userAddress:', userAddress);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch tournaments
        const tournamentsResponse = await fetch('/api/tournaments/mongo');
        const tournamentsData = await tournamentsResponse.json();
        console.log('🏆 Tournaments response:', tournamentsData);
        
        if (tournamentsData.tournaments) {
          // Find tournaments with brackets
          const activeTournaments = tournamentsData.tournaments.filter((t: any) => t.bracketId);
          console.log('🎯 Active tournaments with brackets:', activeTournaments);
          const clanMatches: any[] = [];
          
          
          for (const tournament of activeTournaments) {
            try {
              const matchesResponse = await fetch(`/api/tournaments/matches?bracketId=${tournament.bracketId}`);
              const matchesData = await matchesResponse.json();
              console.log(`⚔️ Matches for tournament ${tournament.game}:`, matchesData);
              
              if (matchesData.matches) {
                
                // Filter matches where user's clan is participating (support both old team1/team2 and new clan1/clan2 formats)
                const userMatches = matchesData.matches.filter((match: any) => {
                  // New format: clan1/clan2 - compare clan IDs directly
                  const isClan1 = match.clan1?._id?.toString() === clanId?.toString();
                  const isClan2 = match.clan2?._id?.toString() === clanId?.toString();
                  console.log(`🔍 Match filter check - Match: ${match._id}, clan1: ${match.clan1?._id}, clan2: ${match.clan2?._id}, userClanId: ${clanId}, isClan1: ${isClan1}, isClan2: ${isClan2}`);
                  
                  // Old format: team1/team2 with captain
                  const isTeam1 = match.team1?.captain?.walletAddress?.toLowerCase() === userAddress?.toLowerCase();
                  const isTeam2 = match.team2?.captain?.walletAddress?.toLowerCase() === userAddress?.toLowerCase();
                  
                  
                  const isMatch = isClan1 || isClan2 || isTeam1 || isTeam2;
                  console.log(`✅ Match ${match._id} result: ${isMatch}`);
                  return isMatch;
                });
                
                console.log(`📊 Found ${userMatches.length} user matches in ${tournament.game}`);
                
                // Add tournament info to matches and normalize status
                userMatches.forEach((match: any) => {
                  // Convert old statuses to new ones
                  let normalizedStatus = match.status;
                  if (match.status === 'time_proposed' || match.status === 'pending') {
                    normalizedStatus = 'scheduling';
                  }
                  
                  clanMatches.push({
                    ...match,
                    status: normalizedStatus,
                    tournamentGame: tournament.game,
                    tournamentId: tournament._id
                  });
                });
              }
            } catch (err) {
              console.error(`Error fetching matches for tournament ${tournament.game}:`, err);
            }
          }
          
          console.log('🏁 Setting matches in component:', clanMatches.length, 'matches');
          setMatches(clanMatches);
          
          // Fetch rosters for each match
          const rosterPromises = clanMatches.map(async (match: any) => {
            try {
              const rosterResponse = await fetch(`/api/tournaments/matches/roster?matchId=${match._id}`);
              if (rosterResponse.ok) {
                const rosterData = await rosterResponse.json();
                return { matchId: match._id, rosters: rosterData.rosters };
              }
            } catch (err) {
              console.error(`Error fetching roster for match ${match._id}:`, err);
            }
            return { matchId: match._id, rosters: { clan1: [], clan2: [] } };
          });
          
          const rosterResults = await Promise.all(rosterPromises);
          const rostersMap: any = {};
          rosterResults.forEach(result => {
            rostersMap[result.matchId] = result.rosters;
          });
          setMatchRosters(rostersMap);
          
          // Fetch time proposals for each match (only one proposal per match)
          const proposalPromises = clanMatches.map(async (match: any) => {
            try {
              const proposalResponse = await fetch(`/api/tournaments/matches/schedule?matchId=${match._id}`);
              if (proposalResponse.ok) {
                const proposalData = await proposalResponse.json();
                // Return all proposals, we'll filter for pending ones later
                const proposals = proposalData.timeSlots || [];
                return { matchId: match._id, proposals: proposals };
              }
            } catch (err) {
              console.error(`Error fetching proposals for match ${match._id}:`, err);
            }
            return { matchId: match._id, proposals: [] };
          });
          
          const proposalResults = await Promise.all(proposalPromises);
          const proposalsMap: any = {};
          proposalResults.forEach(result => {
            proposalsMap[result.matchId] = result.proposals;
          });
          setTimeProposals(proposalsMap);
        }
      } catch (error) {
        console.error('Error fetching matches:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [clanId, userAddress]);

  const handleProposeTime = async (matchId: string, proposedTime: string) => {
    try {
      const response = await fetch('/api/tournaments/matches/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          proposedTime,
          proposedBy: userAddress,
          replaceExisting: true // Ensure only one proposal per match
        })
      });

      if (response.ok) {
        alert('Match time proposed successfully!');
        
        // Add a small delay to ensure database is updated
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Refresh matches to show updated status
        const fetchMatches = async () => {
          if (!clanId || !userAddress) return;
          try {
            setLoading(true);
            const tournamentsResponse = await fetch('/api/tournaments/mongo');
            const tournamentsData = await tournamentsResponse.json();
            
            if (tournamentsData.tournaments) {
              const activeTournaments = tournamentsData.tournaments.filter((t: any) => t.bracketId);
              const clanMatches: any[] = [];
              
              for (const tournament of activeTournaments) {
                try {
                  const matchesResponse = await fetch(`/api/tournaments/matches?bracketId=${tournament.bracketId}`);
                  const matchesData = await matchesResponse.json();
                  
                  if (matchesData.matches) {
                    const userMatches = matchesData.matches.filter((match: any) => {
                      const isClan1 = match.clan1?._id === clanId || match.clan1?.leader?.toLowerCase() === userAddress?.toLowerCase();
                      const isClan2 = match.clan2?._id === clanId || match.clan2?.leader?.toLowerCase() === userAddress?.toLowerCase();
                      return isClan1 || isClan2;
                    });
                    
                    userMatches.forEach((match: any) => {
                      // Convert old statuses to new ones
                      let normalizedStatus = match.status;
                      if (match.status === 'time_proposed' || match.status === 'pending') {
                        normalizedStatus = 'scheduling';
                      }
                      
                      clanMatches.push({
                        ...match,
                        status: normalizedStatus,
                        tournamentGame: tournament.game,
                        tournamentId: tournament._id
                      });
                    });
                  }
                } catch (err) {
                  console.error(`Error fetching matches for tournament ${tournament.game}:`, err);
                }
              }
              
              setMatches(clanMatches);
            }
          } catch (error) {
            console.error('Error fetching matches:', error);
          } finally {
            setLoading(false);
          }
        };
        await fetchMatches();
        console.log('Matches refreshed after proposal');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to propose time');
      }
    } catch (error) {
      console.error('Error proposing time:', error);
      alert('Failed to propose time');
    }
  };

  const handleTimeResponse = async (timeSlotId: string, action: 'accepted' | 'rejected') => {
    if (!userAddress) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      const response = await fetch('/api/tournaments/matches/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeSlotId,
          action,
          respondedBy: userAddress
        })
      });

      if (response.ok) {
        alert(`Time proposal ${action} successfully!`);
        // Refresh matches to show updated status
        const fetchMatches = async () => {
          if (!clanId || !userAddress) return;
          try {
            setLoading(true);
            const tournamentsResponse = await fetch('/api/tournaments/mongo');
            const tournamentsData = await tournamentsResponse.json();
            
            if (tournamentsData.tournaments) {
              const activeTournaments = tournamentsData.tournaments.filter((t: any) => t.bracketId);
              const clanMatches: any[] = [];
              
              for (const tournament of activeTournaments) {
                try {
                  const matchesResponse = await fetch(`/api/tournaments/matches?bracketId=${tournament.bracketId}`);
                  const matchesData = await matchesResponse.json();
                  
                  if (matchesData.matches) {
                    const userMatches = matchesData.matches.filter((match: any) => {
                      const isClan1 = match.clan1?._id === clanId || match.clan1?.leader?.toLowerCase() === userAddress?.toLowerCase();
                      const isClan2 = match.clan2?._id === clanId || match.clan2?.leader?.toLowerCase() === userAddress?.toLowerCase();
                      return isClan1 || isClan2;
                    });
                    
                    userMatches.forEach((match: any) => {
                      // Convert old statuses to new ones
                      let normalizedStatus = match.status;
                      if (match.status === 'time_proposed' || match.status === 'pending') {
                        normalizedStatus = 'scheduling';
                      }
                      
                      clanMatches.push({
                        ...match,
                        status: normalizedStatus,
                        tournamentGame: tournament.game,
                        tournamentId: tournament._id
                      });
                    });
                  }
                } catch (err) {
                  console.error(`Error fetching matches for tournament ${tournament.game}:`, err);
                }
              }
              
              setMatches(clanMatches);
              
              // Fetch time proposals for each match
              const proposalPromises = clanMatches.map(async (match: any) => {
                try {
                  const proposalResponse = await fetch(`/api/tournaments/matches/schedule?matchId=${match._id}`);
                  if (proposalResponse.ok) {
                    const proposalData = await proposalResponse.json();
                    const proposals = proposalData.timeSlots || [];
                    return { matchId: match._id, proposals: proposals };
                  }
                } catch (err) {
                  console.error(`Error fetching proposals for match ${match._id}:`, err);
                }
                return { matchId: match._id, proposals: [] };
              });
              
              const proposalResults = await Promise.all(proposalPromises);
              const proposalsMap: any = {};
              proposalResults.forEach(result => {
                proposalsMap[result.matchId] = result.proposals;
              });
              setTimeProposals(proposalsMap);
            }
          } catch (error) {
            console.error('Error fetching matches:', error);
          } finally {
            setLoading(false);
          }
        };
        await fetchMatches();
      } else {
        const data = await response.json();
        alert(data.error || `Failed to ${action} time proposal`);
      }
    } catch (error) {
      console.error(`Error ${action}ing time proposal:`, error);
      alert(`Failed to ${action} time proposal`);
    }
  };


  if (loading) {
    return (
      <div className="card mb-8">
        <div className="text-center py-8">
          <div className="text-gray-400">Loading tournament matches...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card mb-8">
      <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
        <span className="text-purple-400">🏆</span>
        Tournament Matches
        {!isClanLeader && (
          <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full">
            View Only
          </span>
        )}
      </h2>

      {matches.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">No active tournament matches</div>
          <div className="text-sm text-gray-500">
            {isClanLeader 
              ? 'Register your clan for tournaments to see matches here'
              : 'Your clan leader can register for tournaments'
            }
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {matches.map((match: any, index: number) => {
            // Early return if match is null/undefined
            if (!match) {
              return null;
            }
            
            // Support both old (team1/team2) and new (clan1/clan2) formats
            let opponent, userClan, isUserClan1;
            
            if (match.clan1 || match.clan2) {
              // New format: clan1/clan2
              isUserClan1 = match.clan1?._id === clanId || match.clan1?.leader?.toLowerCase() === userAddress?.toLowerCase();
              opponent = isUserClan1 ? match.clan2 : match.clan1;
              userClan = isUserClan1 ? match.clan1 : match.clan2;
            } else {
              // Old format: team1/team2 - treat teams as clans
              const isUserTeam1 = match.team1?.captain?.walletAddress?.toLowerCase() === userAddress?.toLowerCase();
              opponent = isUserTeam1 ? match.team2 : match.team1;
              userClan = isUserTeam1 ? match.team1 : match.team2;
              isUserClan1 = isUserTeam1; // Use the same variable name for consistency
            }
            
            // Only one proposal at a time - get the most recent pending one
            const matchProposals = timeProposals?.[match?._id] || [];
            const activeProposal = matchProposals.find((p: any) => p.status === 'pending') || null;
            
            
            const isMyProposal = activeProposal?.proposedBy?.toLowerCase() === userAddress?.toLowerCase();
            
            const needsScheduling = match?.status === 'scheduling' && !match?.scheduledAt && !activeProposal;
            const needsResponse = match?.status === 'scheduling' && activeProposal && !isMyProposal;
            const waitingForResponse = match?.status === 'scheduling' && activeProposal && isMyProposal;
            // Check if match is live (active status or ready with passed time)
            const isLive = match?.status === 'active' || (match?.scheduledAt && new Date(match.scheduledAt) <= new Date() && match?.status === 'ready');
            const needsResults = match?.status === 'active' || (match?.scheduledAt && new Date(match.scheduledAt) <= new Date() && (match?.status === 'ready' || match?.status === 'active')) && match?.status !== 'completed';
            const isResultsPending = match?.status === 'results_pending';
            const isResultsConflict = match?.status === 'results_conflict';
            const hasUserClanSubmitted = match?.resultsSubmissions?.[isUserClan1 ? 'clan1' : 'clan2']?.submitted || false;
            // For backwards compatibility, if match is completed but doesn't have resultsSubmissions tracking,
            // and this clan hasn't submitted via the frontend, allow submission
            const isLegacyCompletedMatch = match?.status === 'completed' && !match?.resultsSubmissions;
            
            // Don't allow submissions if match is completed or in conflict (unless legacy)
            const isMatchFinalized = match?.status === 'completed' || match?.status === 'results_conflict';
            const canSubmitResults = ((needsResults || isResultsPending || isLegacyCompletedMatch) && !hasUserClanSubmitted && !(submittedResults?.[match?._id]) && (!isMatchFinalized || isLegacyCompletedMatch));
            
            console.log('Debug Match Status:', {
              matchId: match?._id,
              status: match?.status,
              isResultsPending,
              isResultsConflict,
              isUserClan1,
              hasUserClanSubmitted,
              canSubmitResults,
              resultsSubmissions: match?.resultsSubmissions,
              needsResults,
              submittedResults: submittedResults?.[match?._id],
              isLegacyCompletedMatch,
              isMatchFinalized
            });
            
            // Roster management
            const matchRoster = matchRosters?.[match?._id] || { clan1: [], clan2: [] };
            const userClanRoster = isUserClan1 ? matchRoster.clan1 : matchRoster.clan2;
            const opponentClanRoster = isUserClan1 ? matchRoster.clan2 : matchRoster.clan1;
            const hasUserRoster = userClanRoster && userClanRoster.length > 0;
            const hasOpponentRoster = opponentClanRoster && opponentClanRoster.length > 0;
            
            return (
              <div key={`match-${match?._id}-${match?.status}-${!!activeProposal}`} className="border border-white/10 rounded-xl bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm overflow-hidden">
                {/* Match Header */}
                <div className="bg-gray-900/50 p-5 border-b border-white/10">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-bold text-white">
                          {match.tournamentGame}
                        </h3>
                        <span className="text-sm bg-gray-700/50 text-gray-300 px-3 py-1 rounded-full">
                          {match.round?.charAt(0).toUpperCase() + match.round?.slice(1)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <div className="font-semibold text-blue-400 text-lg">{userClan?.name}</div>
                          <div className="text-xs text-gray-500">{userClan?.tag}</div>
                        </div>
                        <div className="text-gray-500 font-bold text-lg mx-2">VS</div>
                        <div className="text-center">
                          <div className="font-semibold text-orange-400 text-lg">{opponent?.name}</div>
                          <div className="text-xs text-gray-500">{opponent?.tag}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      {(needsScheduling || needsResponse || waitingForResponse) && (
                        <div className="text-xs bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full border border-blue-500/30 text-center">
                          {waitingForResponse ? 'Awaiting Response' : 'Scheduling'}
                        </div>
                      )}
                      {isLive && (
                        <div className="text-xs bg-red-500/20 text-red-400 px-3 py-1 rounded-full border border-red-500/30 text-center animate-pulse">
                          🔴 LIVE
                        </div>
                      )}
                      {canSubmitResults && !isLive && !submittedResults?.[match?._id] && (
                        <div className="text-xs bg-green-500/20 text-green-400 px-3 py-1 rounded-full border border-green-500/30 text-center">
                          Results Needed
                        </div>
                      )}
                      {hasUserClanSubmitted && isResultsPending && (
                        <div className="text-xs bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full border border-blue-500/30 text-center">
                          Results Submitted - Awaiting Opponent
                        </div>
                      )}
                      {isResultsConflict && (
                        <div className="text-xs bg-red-500/20 text-red-400 px-3 py-1 rounded-full border border-red-500/30 text-center">
                          ⚠️ Results Conflict - Admin Review Required
                        </div>
                      )}
                      {(needsResults || canSubmitResults) && submittedResults?.[match?._id] && (
                        <div className="text-xs bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full border border-blue-500/30 text-center">
                          Results Submitted
                        </div>
                      )}
                      {match?.status === 'completed' && (
                        <div className="text-xs bg-gray-600/20 text-gray-400 px-3 py-1 rounded-full border border-gray-600/30 text-center">
                          Completed
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-6">

                {/* Active Proposal Display */}
                {activeProposal && (
                  <div className={`mb-4 p-4 rounded-lg border ${
                    isMyProposal 
                      ? 'bg-blue-500/10 border-blue-500/30'
                      : 'bg-orange-500/10 border-orange-500/30'
                  }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`w-2 h-2 rounded-full ${isMyProposal ? 'bg-blue-400' : 'bg-orange-400'}`}></div>
                              <span className={`font-semibold ${isMyProposal ? 'text-blue-400' : 'text-orange-400'}`}>
                                {isMyProposal ? 'You proposed' : `${opponent?.name} proposed`}
                              </span>
                            </div>
                            <div className="text-white font-medium text-base">
                              {new Date(activeProposal.proposedTime).toLocaleDateString('en-US', { 
                                weekday: 'short',
                                month: 'short', 
                                day: 'numeric' 
                              })} at{' '}
                              {new Date(activeProposal.proposedTime).toLocaleTimeString([], {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </div>
                          </div>
                          {!isMyProposal && (
                            <div className="flex gap-3">
                              <button
                                onClick={() => handleTimeResponse(activeProposal._id, 'accepted')}
                                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 hover:scale-105"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleTimeResponse(activeProposal._id, 'rejected')}
                                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 hover:scale-105"
                              >
                                Decline
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                )}
                
                {/* Confirmed Time Display */}
                {match.scheduledAt && !needsResults && match.status !== 'completed' && (
                      <div className={`mb-4 p-4 rounded-xl border ${isLive 
                        ? 'bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/30' 
                        : 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30'}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-red-400 animate-pulse' : 'bg-green-400 animate-pulse'}`}></div>
                              <span className={`font-semibold ${isLive ? 'text-red-400' : 'text-green-400'}`}>
                                {isLive ? 'Match Live Now!' : 'Match Confirmed'}
                              </span>
                            </div>
                            <div className="text-white font-medium text-base">
                              {new Date(match.scheduledAt).toLocaleDateString('en-US', { 
                                weekday: 'short',
                                month: 'short', 
                                day: 'numeric' 
                              })} at{' '}
                              {new Date(match.scheduledAt).toLocaleTimeString([], {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-400">Status</div>
                            <div className={`text-sm font-medium ${isLive ? 'text-red-400' : 'text-white'}`}>
                              {isLive ? '🔴 LIVE' : 'Ready to Play'}
                            </div>
                          </div>
                        </div>
                      </div>
                )}

                {/* Match Rosters */}
                {(hasUserRoster || hasOpponentRoster) && (
                  <div className="mb-4">
                    <h4 className="text-white font-medium mb-3">Competing Players</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* User Clan Roster */}
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                        <h5 className="text-blue-400 font-medium mb-3">{userClan?.name}</h5>
                        {hasUserRoster ? (
                          <div className="space-y-2">
                            {userClanRoster.map((player: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                                  {player.username?.[0]?.toUpperCase() || '?'}
                                </div>
                                <span className="text-white">{player.username}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-gray-400 text-sm">Players will be listed when match is ready</div>
                        )}
                      </div>

                      {/* Opponent Clan Roster */}
                      <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                        <h5 className="text-orange-400 font-medium mb-3">{opponent?.name}</h5>
                        {hasOpponentRoster ? (
                          <div className="space-y-2">
                            {opponentClanRoster.map((player: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs">
                                  {player.username?.[0]?.toUpperCase() || '?'}
                                </div>
                                <span className="text-white">{player.username}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-gray-400 text-sm">Players will be listed when match is ready</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons for Clan Leaders */}
                {isClanLeader && (
                  <div className="space-y-4">
                    {needsScheduling && (
                      <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                          <h5 className="text-blue-400 font-semibold">Propose Match Time</h5>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Select Match Time</label>
                            <input
                              type="datetime-local"
                              value={selectedTimes[match._id] || ''}
                              onChange={(e) => setSelectedTimes(prev => ({ ...prev, [match._id]: e.target.value }))}
                              className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 backdrop-blur-sm"
                            />
                          </div>
                          <button
                            onClick={async () => {
                              const selectedTime = selectedTimes[match._id];
                              if (!selectedTime) {
                                alert('Please select a time first');
                                return;
                              }
                              
                              setSubmitting(prev => ({ ...prev, [match._id]: true }));
                              try {
                                const proposedTime = new Date(selectedTime).toISOString();
                                await handleProposeTime(match._id, proposedTime);
                                // Clear the selected time after successful submission
                                setSelectedTimes(prev => ({ ...prev, [match._id]: '' }));
                              } finally {
                                setSubmitting(prev => ({ ...prev, [match._id]: false }));
                              }
                            }}
                            disabled={!selectedTimes[match._id] || submitting[match._id]}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
                          >
                            {submitting[match._id] ? 'Proposing...' : 'Propose Time'}
                          </button>
                          <div className="text-xs text-gray-400 bg-gray-800/20 rounded-lg p-2">
                            💡 Both clan leaders need to agree on the time
                          </div>
                        </div>
                      </div>
                    )}

                    
                    {canSubmitResults && !submittedResults[match._id] && match?.status !== 'completed' && match?.status !== 'results_conflict' && (
                      <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-2 h-2 rounded-full bg-green-400"></div>
                          <h5 className="font-semibold text-green-400">Submit Match Results</h5>
                        </div>
                        
                        <div className="space-y-4">
                          {/* Team Scores Section */}
                          <div className="bg-gray-800/30 rounded-lg p-4">
                            <div className="text-sm text-gray-400 mb-3">Enter the team scores:</div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-blue-400 mb-2">
                                  {userClan?.name} Total
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={resultScores[match._id]?.userScore || ''}
                                  onChange={(e) => setResultScores(prev => ({
                                    ...prev,
                                    [match._id]: {
                                      ...prev[match._id],
                                      userScore: e.target.value,
                                      userPlayerStats: prev[match._id]?.userPlayerStats || {},
                                      opponentPlayerStats: prev[match._id]?.opponentPlayerStats || {}
                                    }
                                  }))}
                                  className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg p-3 text-white placeholder-gray-500 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-orange-400 mb-2">
                                  {opponent?.name} Total
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={resultScores[match._id]?.opponentScore || ''}
                                  onChange={(e) => setResultScores(prev => ({
                                    ...prev,
                                    [match._id]: {
                                      ...prev[match._id],
                                      opponentScore: e.target.value,
                                      userPlayerStats: prev[match._id]?.userPlayerStats || {},
                                      opponentPlayerStats: prev[match._id]?.opponentPlayerStats || {}
                                    }
                                  }))}
                                  className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg p-3 text-white placeholder-gray-500 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                />
                              </div>
                            </div>
                          </div>
                          
                          {/* Individual Player Scores Section */}
                          <div className="bg-gray-800/30 rounded-lg p-4">
                            <div className="text-sm text-gray-400 mb-3">Enter individual player scores:</div>
                            
                            {/* User Team Players */}
                            <div className="mb-4">
                              <h6 className="text-blue-400 font-medium mb-2">{userClan?.name} K/D Stats</h6>
                              <div className="space-y-2">
                                <div className="grid grid-cols-4 gap-2 text-xs text-gray-500 font-medium px-2">
                                  <div className="col-span-2">Player</div>
                                  <div className="text-center">Kills</div>
                                  <div className="text-center">Deaths</div>
                                </div>
                                {(hasUserRoster ? userClanRoster : []).map((player: any, idx: number) => {
                                  const playerId = String(player.userId?._id || player.userId || player._id || `user-${idx}`);
                                  const stats = resultScores[match._id]?.userPlayerStats?.[playerId] || { kills: '', deaths: '' };
                                  console.log('User Player ID Debug:', { playerId, player, stats });
                                  return (
                                    <div key={playerId} className="grid grid-cols-4 gap-2 items-center bg-gray-800/20 rounded-lg p-2">
                                      <div className="col-span-2">
                                        <div className="text-sm text-gray-300 truncate">
                                          {player.userId?.username || player.username}
                                        </div>
                                      </div>
                                      <input
                                        type="number"
                                        min="0"
                                        placeholder="K"
                                        value={stats.kills}
                                        onChange={(e) => updatePlayerStats(match._id, 'user', playerId, 'kills', e.target.value)}
                                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded px-2 py-1 text-white placeholder-gray-500 text-center text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
                                      />
                                      <input
                                        type="number"
                                        min="0"
                                        placeholder="D"
                                        value={stats.deaths}
                                        onChange={(e) => updatePlayerStats(match._id, 'user', playerId, 'deaths', e.target.value)}
                                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded px-2 py-1 text-white placeholder-gray-500 text-center text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50"
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            
                            {/* Opponent Team Players */}
                            <div>
                              <h6 className="text-orange-400 font-medium mb-2">{opponent?.name} K/D Stats</h6>
                              <div className="space-y-2">
                                <div className="grid grid-cols-4 gap-2 text-xs text-gray-500 font-medium px-2">
                                  <div className="col-span-2">Player</div>
                                  <div className="text-center">Kills</div>
                                  <div className="text-center">Deaths</div>
                                </div>
                                {(hasOpponentRoster ? opponentClanRoster : []).map((player: any, idx: number) => {
                                  const playerId = String(player.userId?._id || player.userId || player._id || `opponent-${idx}`);
                                  const stats = resultScores[match._id]?.opponentPlayerStats?.[playerId] || { kills: '', deaths: '' };
                                  console.log('Opponent Player ID Debug:', { playerId, player, stats });
                                  return (
                                    <div key={playerId} className="grid grid-cols-4 gap-2 items-center bg-gray-800/20 rounded-lg p-2">
                                      <div className="col-span-2">
                                        <div className="text-sm text-gray-300 truncate">
                                          {player.userId?.username || player.username}
                                        </div>
                                      </div>
                                      <input
                                        type="number"
                                        min="0"
                                        placeholder="K"
                                        value={stats.kills}
                                        onChange={(e) => updatePlayerStats(match._id, 'opponent', playerId, 'kills', e.target.value)}
                                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded px-2 py-1 text-white placeholder-gray-500 text-center text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
                                      />
                                      <input
                                        type="number"
                                        min="0"
                                        placeholder="D"
                                        value={stats.deaths}
                                        onChange={(e) => updatePlayerStats(match._id, 'opponent', playerId, 'deaths', e.target.value)}
                                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded px-2 py-1 text-white placeholder-gray-500 text-center text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50"
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => {
                              const scores = resultScores[match._id];
                              if (!scores?.userScore || !scores?.opponentScore) {
                                alert('Please enter scores for both teams');
                                return;
                              }
                              
                              const userScore = parseInt(scores.userScore);
                              const opponentScore = parseInt(scores.opponentScore);
                              
                              if (userScore === opponentScore) {
                                alert('Scores cannot be equal. Please enter the final result.');
                                return;
                              }
                              
                              // Validate K/D stats if provided
                              const userKDStats = scores.userPlayerStats || {};
                              const opponentKDStats = scores.opponentPlayerStats || {};
                              
                              // Calculate total kills for validation (optional)
                              const userTotalKills = Object.values(userKDStats).reduce((sum, stats: any) => {
                                return sum + (stats.kills ? parseInt(stats.kills) : 0);
                              }, 0);
                              
                              const opponentTotalKills = Object.values(opponentKDStats).reduce((sum, stats: any) => {
                                return sum + (stats.kills ? parseInt(stats.kills) : 0);
                              }, 0);
                              
                              // Check if K/D stats were entered
                              const hasUserKDStats = Object.values(userKDStats).some((stats: any) => stats.kills || stats.deaths);
                              const hasOpponentKDStats = Object.values(opponentKDStats).some((stats: any) => stats.kills || stats.deaths);
                              
                              // Basic validation: ensure all players have both K and D if any stats are entered
                              if (hasUserKDStats) {
                                const incompleteUserStats = Object.values(userKDStats).some((stats: any) => 
                                  (stats.kills && !stats.deaths) || (!stats.kills && stats.deaths)
                                );
                                if (incompleteUserStats) {
                                  alert(`Please enter both kills and deaths for all ${userClan?.name} players`);
                                  return;
                                }
                              }
                              
                              if (hasOpponentKDStats) {
                                const incompleteOppStats = Object.values(opponentKDStats).some((stats: any) => 
                                  (stats.kills && !stats.deaths) || (!stats.kills && stats.deaths)
                                );
                                if (incompleteOppStats) {
                                  alert(`Please enter both kills and deaths for all ${opponent?.name} players`);
                                  return;
                                }
                              }
                              
                              const winner = userScore > opponentScore ? userClan?.name : opponent?.name;
                              
                              // Get participating players for profile data
                              const userPlayers = userClan?.members || [];
                              const opponentPlayers = opponent?.members || [];
                              
                              let playerInfo = '';
                              if (userPlayers.length > 0 || opponentPlayers.length > 0) {
                                playerInfo = '\n\nParticipating Players:';
                                if (userPlayers.length > 0) {
                                  playerInfo += `\n${userClan?.name}: ${userPlayers.map((p: any) => p.username || p.name).join(', ')}`;
                                }
                                if (opponentPlayers.length > 0) {
                                  playerInfo += `\n${opponent?.name}: ${opponentPlayers.map((p: any) => p.username || p.name).join(', ')}`;
                                }
                              }
                              
                              let kdSummary = '';
                              if (hasUserKDStats || hasOpponentKDStats) {
                                kdSummary = '\n\nK/D Stats:';
                                if (hasUserKDStats) {
                                  kdSummary += `\n${userClan?.name} - Total Kills: ${userTotalKills}`;
                                }
                                if (hasOpponentKDStats) {
                                  kdSummary += `\n${opponent?.name} - Total Kills: ${opponentTotalKills}`;
                                }
                              }
                              
                              const confirmMessage = `Submit results?\n\n${userClan?.name}: ${userScore}\n${opponent?.name}: ${opponentScore}\n\nWinner: ${winner}${playerInfo}${kdSummary}\n\nNote: Both teams must submit matching scores for results to be finalized.\nIndividual player stats will be recorded for profile data.`;
                              
                              if (confirm(confirmMessage)) {
                                // Submit results to the API
                                setSubmittedResults(prev => ({ ...prev, [match._id]: true }));
                                
                                // Prepare player performances data
                                const playerPerformances = [];
                                
                                // Add user team player performances
                                if (hasUserKDStats) {
                                  Object.entries(userKDStats).forEach(([playerId, stats]: [string, any]) => {
                                    if (stats.kills || stats.deaths) {
                                      // Find player in roster
                                      const rosterPlayer = userClanRoster.find((p: any) => p.userId === playerId);
                                      if (rosterPlayer) {
                                        playerPerformances.push({
                                          userId: rosterPlayer.userId,
                                          clanId: match.clan1?._id === clanId ? match.clan1._id : match.clan2._id,
                                          score: Math.floor(parseInt(stats.kills || '0') * 100 + parseInt(stats.assists || '0') * 50 - parseInt(stats.deaths || '0') * 25),
                                          kills: parseInt(stats.kills || '0'),
                                          deaths: parseInt(stats.deaths || '0'),
                                          assists: 0,
                                          mvp: false
                                        });
                                      }
                                    }
                                  });
                                }
                                
                                // Add opponent team player performances (if available)
                                if (hasOpponentKDStats) {
                                  Object.entries(opponentKDStats).forEach(([playerId, stats]: [string, any]) => {
                                    if (stats.kills || stats.deaths) {
                                      // Find player in opponent roster
                                      const rosterPlayer = opponentClanRoster.find((p: any) => p.userId === playerId);
                                      if (rosterPlayer) {
                                        playerPerformances.push({
                                          userId: rosterPlayer.userId,
                                          clanId: match.clan1?._id === clanId ? match.clan2._id : match.clan1._id,
                                          score: Math.floor(parseInt(stats.kills || '0') * 100 + parseInt(stats.assists || '0') * 50 - parseInt(stats.deaths || '0') * 25),
                                          kills: parseInt(stats.kills || '0'),
                                          deaths: parseInt(stats.deaths || '0'),
                                          assists: 0,
                                          mvp: false
                                        });
                                      }
                                    }
                                  });
                                }
                                
                                // Submit to API
                                fetch('/api/tournaments/matches/results', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    matchId: match._id,
                                    clan1Score: match.clan1?._id === clanId ? userScore : opponentScore,
                                    clan2Score: match.clan1?._id === clanId ? opponentScore : userScore,
                                    playerPerformances,
                                    submittedBy: userAddress
                                  })
                                }).then(async response => {
                                  const data = await response.json();
                                  if (response.ok) {
                                    alert(data.message || 'Results submitted successfully!');
                                    // Refresh the page to show updated match status
                                    window.location.reload();
                                  } else {
                                    alert(data.error || 'Failed to submit results');
                                    setSubmittedResults(prev => ({ ...prev, [match._id]: false }));
                                  }
                                }).catch(error => {
                                  console.error('Error submitting results:', error);
                                  alert('Failed to submit results');
                                  setSubmittedResults(prev => ({ ...prev, [match._id]: false }));
                                });
                              }
                            }}
                            disabled={!resultScores[match._id]?.userScore || !resultScores[match._id]?.opponentScore}
                            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
                          >
                            Submit Results
                          </button>
                          
                          <div className="space-y-2">
                            <div className="text-xs text-gray-400 bg-gray-800/20 rounded-lg p-2">
                              💡 Both teams must submit matching scores for results to count
                            </div>
                            <div className="text-xs text-gray-400 bg-gray-800/20 rounded-lg p-2">
                              🏆 XP will be awarded to all participating clan members:
                              <ul className="mt-1 ml-4">
                                <li>• Base XP for participation</li>
                                <li>• Bonus XP for winning</li>
                                <li>• Individual performance XP based on player scores</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {needsResults && submittedResults[match._id] && (
                      <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                          <h5 className="text-blue-400 font-semibold">Results Submitted Successfully!</h5>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="bg-gray-800/30 rounded-lg p-3">
                            <div className="text-sm text-gray-300 mb-2">Your submitted results:</div>
                            <div className="flex justify-center items-center gap-4">
                              <div className="text-center">
                                <div className="text-lg font-bold text-blue-400">{resultScores[match._id]?.userScore}</div>
                                <div className="text-xs text-gray-400">{userClan?.name}</div>
                              </div>
                              <div className="text-gray-500 font-medium">-</div>
                              <div className="text-center">
                                <div className="text-lg font-bold text-orange-400">{resultScores[match._id]?.opponentScore}</div>
                                <div className="text-xs text-gray-400">{opponent?.name}</div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="text-blue-400">⏳</div>
                              <span className="text-blue-400 font-medium text-sm">Waiting for confirmation</span>
                            </div>
                            <div className="text-xs text-gray-300">
                              {opponent?.name} must submit matching scores for results to be finalized.
                            </div>
                          </div>
                          
                          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="text-purple-400">🎯</div>
                              <span className="text-purple-400 font-medium text-sm">XP Pending</span>
                            </div>
                            <div className="text-xs text-gray-300">
                              Experience points will be awarded once both teams confirm matching results.
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {match.status === 'completed' && (
                      <div className="bg-gradient-to-r from-gray-700/20 to-gray-800/20 border border-gray-600/30 rounded-xl p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                            <span className="text-gray-400 font-semibold">Match Completed</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {match.completedAt && new Date(match.completedAt).toLocaleDateString()}
                          </div>
                        </div>
                        
                        {match.scores && (
                          <div className="bg-gray-800/30 rounded-lg p-3 mb-3">
                            <div className="flex justify-center items-center gap-4 mb-3">
                              <div className="text-center">
                                <div className={`text-2xl font-bold ${match.scores.clan1Score > match.scores.clan2Score ? 'text-green-400' : 'text-gray-400'}`}>
                                  {match.scores.clan1Score}
                                </div>
                                <div className="text-sm text-gray-400 mt-1">{userClan?.name}</div>
                              </div>
                              <div className="text-gray-500 font-medium">-</div>
                              <div className="text-center">
                                <div className={`text-2xl font-bold ${match.scores.clan2Score > match.scores.clan1Score ? 'text-green-400' : 'text-gray-400'}`}>
                                  {match.scores.clan2Score}
                                </div>
                                <div className="text-sm text-gray-400 mt-1">{opponent?.name}</div>
                              </div>
                            </div>
                            
                            {/* Individual Player K/D Stats if available */}
                            {(match.scores.clan1PlayerStats || match.scores.clan2PlayerStats) && (
                              <div className="border-t border-gray-700 pt-3 mt-3">
                                <div className="text-xs text-gray-500 mb-2">Player Performance (K/D):</div>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                  {match.scores.clan1PlayerStats && (
                                    <div>
                                      <div className="text-blue-400 font-medium mb-2">{userClan?.name}</div>
                                      <div className="space-y-1">
                                        {Object.entries(match.scores.clan1PlayerStats).map(([playerId, stats]: [string, any]) => {
                                          const kd = stats.deaths > 0 ? (stats.kills / stats.deaths).toFixed(2) : stats.kills;
                                          return (
                                            <div key={playerId} className="flex justify-between items-center text-gray-400">
                                              <span className="truncate mr-2">
                                                {userClan?.members?.find((p: any) => (p._id || p.walletAddress) === playerId)?.username || 
                                                 userClan?.members?.find((p: any) => (p._id || p.walletAddress) === playerId)?.name ||
                                                 playerId.startsWith('user-player-') ? `Player ${parseInt(playerId.split('-')[2]) + 1}` : 'Player'}
                                              </span>
                                              <span className="font-mono text-xs whitespace-nowrap">
                                                <span className="text-green-400">{stats.kills}</span>
                                                <span className="text-gray-500">/</span>
                                                <span className="text-red-400">{stats.deaths}</span>
                                                <span className="text-gray-500 ml-1">({kd})</span>
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                  {match.scores.clan2PlayerStats && (
                                    <div>
                                      <div className="text-orange-400 font-medium mb-2">{opponent?.name}</div>
                                      <div className="space-y-1">
                                        {Object.entries(match.scores.clan2PlayerStats).map(([playerId, stats]: [string, any]) => {
                                          const kd = stats.deaths > 0 ? (stats.kills / stats.deaths).toFixed(2) : stats.kills;
                                          return (
                                            <div key={playerId} className="flex justify-between items-center text-gray-400">
                                              <span className="truncate mr-2">
                                                {opponent?.members?.find((p: any) => (p._id || p.walletAddress) === playerId)?.username || 
                                                 opponent?.members?.find((p: any) => (p._id || p.walletAddress) === playerId)?.name ||
                                                 playerId.startsWith('opp-player-') ? `Player ${parseInt(playerId.split('-')[2]) + 1}` : 'Player'}
                                              </span>
                                              <span className="font-mono text-xs whitespace-nowrap">
                                                <span className="text-green-400">{stats.kills}</span>
                                                <span className="text-gray-500">/</span>
                                                <span className="text-red-400">{stats.deaths}</span>
                                                <span className="text-gray-500 ml-1">({kd})</span>
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {match.xpAwarded && (
                          <div className="text-center text-sm">
                            <span className="text-purple-400">+{match.xpAwarded} XP</span>
                            <span className="text-gray-500 ml-2">earned</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}


                  {/* View-Only for Members */}
                  {!isClanLeader && (needsScheduling || needsResults) && (
                  <div className="bg-gradient-to-br from-gray-700/20 to-gray-800/20 border border-gray-600/30 rounded-xl p-5">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                        <span className="text-gray-400 font-medium">View Only</span>
                      </div>
                      <div className="text-sm text-gray-300 mb-3">
                        Your clan leader manages tournament matches
                      </div>
                      <div className="text-xs bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-3 py-2 rounded-lg">
                        Leader action needed: {needsScheduling ? 'Schedule match time' : 'Submit results'}
                      </div>
                      {waitingForResponse && (
                        <div className="text-xs bg-blue-500/10 border border-blue-500/30 text-blue-400 px-3 py-2 rounded-lg mt-2">
                          ⏰ Time proposal pending response
                        </div>
                      )}
                    </div>
                  </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}