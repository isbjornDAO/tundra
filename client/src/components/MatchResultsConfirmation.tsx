'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface Match {
  _id: string;
  team1: {
    _id: string;
    name: string;
    region: string;
  };
  team2: {
    _id: string;
    name: string;
    region: string;
  };
  round: string;
  status: string;
  scheduledTime: string;
  hostRegions: string[];
  needsConfirmation: boolean;
  resultsSubmitted: Array<{
    hostWalletAddress: string;
    hostRegion: string;
    winnerTeamId: string;
    winnerTeamName: string;
    submittedAt: string;
    notes?: string;
  }>;
  winner?: {
    _id: string;
    name: string;
  };
  completedAt?: string;
}

export default function MatchResultsConfirmation() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [selectedWinner, setSelectedWinner] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  // Check if user is an admin or host
  const isRegionalHost = user?.isAdmin || user?.isHost;

  useEffect(() => {
    if (!isRegionalHost) {
      setLoading(false);
      return;
    }

    fetchMatches();
  }, [isRegionalHost]);

  const fetchMatches = async () => {
    try {
      const response = await fetch('/api/matches/results?status=awaiting_results');
      if (response.ok) {
        const data = await response.json();
        setMatches(data.matches || []);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitResult = async (matchId: string) => {
    const winnerTeamId = selectedWinner[matchId];
    if (!winnerTeamId) {
      alert('Please select a winner');
      return;
    }

    const match = matches.find(m => m._id === matchId);
    if (!match) return;

    const winnerTeam = winnerTeamId === match.team1._id ? match.team1 : match.team2;

    setSubmitting(matchId);

    try {
      const response = await fetch('/api/matches/results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchId,
          winnerTeamId,
          winnerTeamName: winnerTeam.name,
          notes: notes[matchId] || ''
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        // Refresh matches
        await fetchMatches();
        // Clear form
        setSelectedWinner(prev => ({ ...prev, [matchId]: '' }));
        setNotes(prev => ({ ...prev, [matchId]: '' }));
      } else {
        alert(data.error || 'Failed to submit results');
      }
    } catch (error) {
      console.error('Error submitting results:', error);
      alert('Failed to submit results');
    } finally {
      setSubmitting(null);
    }
  };

  const hasUserSubmitted = (match: Match) => {
    return match.resultsSubmitted.some(
      submission => submission.hostWalletAddress === user?.walletAddress
    );
  };

  const getSubmissionStatus = (match: Match) => {
    const submittedRegions = match.resultsSubmitted.map(sub => sub.hostRegion);
    const pendingRegions = match.hostRegions.filter(region => !submittedRegions.includes(region));
    
    if (pendingRegions.length === 0) {
      // Check if all submissions agree
      const winnerVotes = match.resultsSubmitted.map(sub => sub.winnerTeamId);
      const allAgree = winnerVotes.every(vote => vote === winnerVotes[0]);
      return allAgree ? 'All hosts agree - match confirmed' : 'Hosts disagree - disputed';
    }
    
    return `Waiting for: ${pendingRegions.join(', ')}`;
  };

  if (!isRegionalHost) {
    return (
      <div className="bg-white/5 rounded-lg p-6 border border-white/10">
        <h2 className="text-xl font-semibold text-white mb-4">Match Results Confirmation</h2>
        <p className="text-gray-400">Only regional hosts can submit match results.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white/5 rounded-lg p-6 border border-white/10">
        <h2 className="text-xl font-semibold text-white mb-4">Match Results Confirmation</h2>
        <p className="text-gray-400">Loading matches...</p>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="bg-white/5 rounded-lg p-6 border border-white/10">
        <h2 className="text-xl font-semibold text-white mb-4">Match Results Confirmation</h2>
        <p className="text-gray-400">No matches requiring confirmation at this time.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 rounded-lg p-6 border border-white/10">
      <h2 className="text-xl font-semibold text-white mb-4">
        Match Results Confirmation
        <span className="text-sm text-blue-400 ml-2">
          ({user.adminRegions?.[0]} Regional Host)
        </span>
      </h2>
      
      <div className="space-y-6">
        {matches.map((match) => {
          const userSubmitted = hasUserSubmitted(match);
          const statusText = getSubmissionStatus(match);
          
          return (
            <div key={match._id} className="bg-white/5 rounded-lg p-4 border border-white/10">
              {/* Match Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {match.team1.name} vs {match.team2.name}
                  </h3>
                  <div className="text-sm text-gray-400">
                    {match.round} • {new Date(match.scheduledTime).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-sm">
                  <div className={`px-3 py-1 rounded-full ${
                    match.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    match.status === 'disputed' ? 'bg-red-500/20 text-red-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {match.status.toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Teams */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2 p-3 bg-white/5 rounded-lg">
                  <span className="text-2xl">🛡️</span>
                  <div>
                    <div className="text-white font-medium">{match.team1.name}</div>
                    <div className="text-xs text-gray-400">{match.team1.region}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-white/5 rounded-lg">
                  <span className="text-2xl">⚔️</span>
                  <div>
                    <div className="text-white font-medium">{match.team2.name}</div>
                    <div className="text-xs text-gray-400">{match.team2.region}</div>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="mb-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <div className="text-blue-400 font-medium mb-1">Status</div>
                <div className="text-sm text-blue-300">{statusText}</div>
              </div>

              {/* Submissions */}
              {match.resultsSubmitted.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-white font-medium mb-2">Submitted Results</h4>
                  <div className="space-y-2">
                    {match.resultsSubmitted.map((submission, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded">
                        <div>
                          <span className="text-green-400">{submission.hostRegion} Host</span>
                          <span className="text-gray-400 ml-2">→ {submission.winnerTeamName}</span>
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(submission.submittedAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Result Submission Form */}
              {!userSubmitted && match.status === 'awaiting_results' && (
                <div className="border-t border-white/10 pt-4">
                  <h4 className="text-white font-medium mb-3">Submit Match Result</h4>
                  
                  {/* Winner Selection */}
                  <div className="mb-4">
                    <label className="block text-sm text-gray-400 mb-2">Select Winner</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setSelectedWinner(prev => ({ ...prev, [match._id]: match.team1._id }))}
                        className={`p-3 rounded-lg border transition-all ${
                          selectedWinner[match._id] === match.team1._id
                            ? 'border-green-500 bg-green-500/20 text-green-400'
                            : 'border-white/20 bg-white/5 text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        {match.team1.name}
                      </button>
                      <button
                        onClick={() => setSelectedWinner(prev => ({ ...prev, [match._id]: match.team2._id }))}
                        className={`p-3 rounded-lg border transition-all ${
                          selectedWinner[match._id] === match.team2._id
                            ? 'border-green-500 bg-green-500/20 text-green-400'
                            : 'border-white/20 bg-white/5 text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        {match.team2.name}
                      </button>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="mb-4">
                    <label className="block text-sm text-gray-400 mb-2">Notes (optional)</label>
                    <textarea
                      value={notes[match._id] || ''}
                      onChange={(e) => setNotes(prev => ({ ...prev, [match._id]: e.target.value }))}
                      placeholder="Add any notes about the match..."
                      className="w-full p-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 resize-none"
                      rows={2}
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={() => submitResult(match._id)}
                    disabled={!selectedWinner[match._id] || submitting === match._id}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    {submitting === match._id ? 'Submitting...' : 'Submit Result'}
                  </button>
                </div>
              )}

              {/* Already Submitted */}
              {userSubmitted && (
                <div className="border-t border-white/10 pt-4">
                  <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="text-green-400 font-medium">✓ You have already submitted results for this match</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}