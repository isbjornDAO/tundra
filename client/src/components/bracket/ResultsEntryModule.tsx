'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface Match {
  _id: string;
  team1?: {
    _id?: string;
    id?: string;
    name?: string;
    region?: string;
    organizer?: string;
  };
  team2?: {
    _id?: string;
    id?: string;
    name?: string;
    region?: string;
    organizer?: string;
  };
  round?: string;
  status: string;
  scheduledTime?: string;
  hostRegions?: string[];
  needsConfirmation?: boolean;
  resultsSubmitted?: Array<{
    hostWalletAddress: string;
    hostRegion: string;
    winnerTeamId: string;
    winnerTeamName: string;
    submittedAt: string;
    notes?: string;
  }>;
  winner?: {
    _id?: string;
    id?: string;
    name?: string;
  };
  completedAt?: string;
}

interface ResultsEntryModuleProps {
  match: Match;
  onResultsSubmitted: () => void;
}

export default function ResultsEntryModule({ match, onResultsSubmitted }: ResultsEntryModuleProps) {
  const { user } = useAuth();
  const [selectedWinner, setSelectedWinner] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Check if user is a regional host for this match
  const isRegionalHost = user?.isAdmin && user?.adminRegions && user.adminRegions.length > 0;
  const userRegion = user?.adminRegions?.[0];
  const canSubmitForMatch = isRegionalHost && match.hostRegions?.includes(userRegion);

  // Check if user has already submitted
  const hasUserSubmitted = match.resultsSubmitted?.some(
    submission => submission.hostWalletAddress === user?.walletAddress
  ) || false;

  // Check if match is ready for results (scheduled time has passed)
  const isTimeForResults = match.scheduledTime ? new Date(match.scheduledTime) < new Date() : false;

  const submitResult = async () => {
    if (!selectedWinner) {
      alert('Please select a winner');
      return;
    }

    const winnerTeam = selectedWinner === (match.team1?._id || match.team1?.id) ? match.team1 : match.team2;
    setSubmitting(true);

    try {
      const response = await fetch('/api/matches/results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchId: match._id,
          winnerTeamId: selectedWinner,
          winnerTeamName: winnerTeam?.name || 'Unknown Team',
          notes: notes || ''
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        onResultsSubmitted();
        setSelectedWinner('');
        setNotes('');
      } else {
        alert(data.error || 'Failed to submit results');
      }
    } catch (error) {
      console.error('Error submitting results:', error);
      alert('Failed to submit results');
    } finally {
      setSubmitting(false);
    }
  };

  const getSubmissionStatus = () => {
    const submittedRegions = match.resultsSubmitted?.map(sub => sub.hostRegion) || [];
    const pendingRegions = match.hostRegions?.filter(region => !submittedRegions.includes(region)) || [];
    
    if (pendingRegions.length === 0 && submittedRegions.length > 0) {
      const winnerVotes = match.resultsSubmitted?.map(sub => sub.winnerTeamId) || [];
      const allAgree = winnerVotes.length > 0 && winnerVotes.every(vote => vote === winnerVotes[0]);
      return allAgree ? 'All hosts agree - match confirmed' : 'Hosts disagree - disputed';
    }
    
    return `Waiting for: ${pendingRegions.join(', ')}`;
  };

  // Don't show results entry if teams are missing or match isn't configured for host results
  if (!match.team1?.name || !match.team2?.name) {
    return (
      <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4">
        <div className="text-center">
          <div className="text-gray-400 font-medium">🏆 Results Entry</div>
          <div className="text-sm text-gray-400 mt-1">
            Waiting for match setup
          </div>
        </div>
      </div>
    );
  }

  // Show different states based on match status and user permissions
  if (!isTimeForResults) {
    return (
      <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4">
        <div className="text-center">
          <div className="text-gray-400 font-medium">⏳ Results Entry</div>
          <div className="text-sm text-gray-400 mt-1">
            Results can be submitted after scheduled time
          </div>
        </div>
      </div>
    );
  }

  if (!canSubmitForMatch) {
    return (
      <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4">
        <div className="text-center">
          <div className="text-gray-400 font-medium">🏆 Results Entry</div>
          <div className="text-sm text-gray-400 mt-1">
            Only regional hosts can submit results
          </div>
        </div>
      </div>
    );
  }

  if (match.status === 'completed') {
    return (
      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
        <div className="text-center">
          <div className="text-green-400 font-medium">✅ Match Complete</div>
          <div className="text-sm text-gray-300 mt-1">
            Winner: {match.winner?.name}
          </div>
        </div>
      </div>
    );
  }

  if (hasUserSubmitted) {
    return (
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="text-center">
          <div className="text-blue-400 font-medium">✓ Results Submitted</div>
          <div className="text-sm text-gray-300 mt-1">{getSubmissionStatus()}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h5 className="text-white font-medium">🏆 Submit Match Results</h5>
        <div className="text-xs text-red-400">{userRegion} Host</div>
      </div>

      {/* Current Status */}
      {match.resultsSubmitted && match.resultsSubmitted.length > 0 && (
        <div className="mb-4 p-3 bg-white/5 rounded-lg">
          <div className="text-gray-400 text-sm mb-2">Current Submissions:</div>
          {match.resultsSubmitted.map((submission, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-blue-400">{submission.hostRegion}</span>
              <span className="text-gray-300">→ {submission.winnerTeamName}</span>
            </div>
          ))}
        </div>
      )}

      {/* Winner Selection */}
      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-2">Select Winner</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setSelectedWinner(match.team1?._id || match.team1?.id || '')}
            className={`p-3 rounded-lg border transition-all ${
              selectedWinner === (match.team1?._id || match.team1?.id)
                ? 'border-green-500 bg-green-500/20 text-green-400'
                : 'border-white/20 bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
          >
            {match.team1?.name || 'Team 1'}
          </button>
          <button
            onClick={() => setSelectedWinner(match.team2?._id || match.team2?.id || '')}
            className={`p-3 rounded-lg border transition-all ${
              selectedWinner === (match.team2?._id || match.team2?.id)
                ? 'border-green-500 bg-green-500/20 text-green-400'
                : 'border-white/20 bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
          >
            {match.team2?.name || 'Team 2'}
          </button>
        </div>
      </div>

      {/* Notes */}
      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-2">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any notes about the match..."
          className="w-full p-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 resize-none"
          rows={2}
        />
      </div>

      {/* Submit Button */}
      <button
        onClick={submitResult}
        disabled={!selectedWinner || submitting}
        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
      >
        {submitting ? 'Submitting...' : 'Submit Results'}
      </button>
    </div>
  );
}