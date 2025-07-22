'use client';

import { useState } from 'react';

interface Match {
  _id: string;
  team1?: {
    _id: string;
    name: string;
    captain: { username: string; walletAddress: string };
    players?: Array<{ username: string; walletAddress: string; role: string }>;
  } | null;
  team2?: {
    _id: string;
    name: string;
    captain: { username: string; walletAddress: string };
    players?: Array<{ username: string; walletAddress: string; role: string }>;
  } | null;
  round?: string;
  status: string;
  scheduledAt?: string;
  score?: {
    team1Score: number;
    team2Score: number;
  };
  winner?: string | null;
  organizer1Approved?: boolean;
  organizer2Approved?: boolean;
  completedAt?: string;
}

interface ResultsEntryModuleProps {
  match: Match;
  userAddress: string;
  onResultsSubmitted: () => void;
}

export default function ResultsEntryModule({ match, userAddress, onResultsSubmitted }: ResultsEntryModuleProps) {
  const [selectedWinner, setSelectedWinner] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Check if user is a team captain
  const isTeam1Captain = match.team1?.captain.walletAddress.toLowerCase() === userAddress?.toLowerCase();
  const isTeam2Captain = match.team2?.captain.walletAddress.toLowerCase() === userAddress?.toLowerCase();
  const isTeamCaptain = isTeam1Captain || isTeam2Captain;

  // Check if match is ready for results (scheduled time has passed)
  const isTimeForResults = match.scheduledAt ? new Date(match.scheduledAt) < new Date() : true;

  const submitResult = async () => {
    if (!selectedWinner || !match.team1 || !match.team2) {
      alert('Please select a winner');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/tournaments/matches', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchId: match._id,
          winnerId: selectedWinner,
          reportedBy: userAddress
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Match result reported successfully!');
        onResultsSubmitted();
        setSelectedWinner('');
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

  // Don't show results entry if teams are missing
  if (!match.team1 || !match.team2) {
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

  // Match is already completed
  if (match.status === 'completed') {
    const winnerTeam = match.winner === match.team1._id ? match.team1 : match.team2;
    return (
      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
        <div className="text-center">
          <div className="text-green-400 font-medium">✅ Match Complete</div>
          <div className="text-sm text-gray-300 mt-1">
            Winner: {winnerTeam?.name || 'Unknown'}
          </div>
          {match.score && (
            <div className="text-xs text-gray-400 mt-1">
              Score: {match.team1.name} {match.score.team1Score} - {match.score.team2Score} {match.team2.name}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Not time for results yet
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

  // Not a team captain
  if (!isTeamCaptain) {
    return (
      <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4">
        <div className="text-center">
          <div className="text-gray-400 font-medium">🏆 Results Entry</div>
          <div className="text-sm text-gray-400 mt-1">
            Waiting for team captains to report results
          </div>
          {(match.organizer1Approved || match.organizer2Approved) && (
            <div className="text-xs text-blue-400 mt-2">
              {match.organizer1Approved && match.team1.name + ' reported'}
              {match.organizer1Approved && match.organizer2Approved && ' • '}
              {match.organizer2Approved && match.team2.name + ' reported'}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Check if user already approved
  const hasUserApproved = (isTeam1Captain && match.organizer1Approved) || 
                         (isTeam2Captain && match.organizer2Approved);

  if (hasUserApproved) {
    return (
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="text-center">
          <div className="text-blue-400 font-medium">✓ Results Submitted</div>
          <div className="text-sm text-gray-300 mt-1">
            Waiting for opponent to confirm results
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h5 className="text-white font-medium">🏆 Submit Match Results</h5>
        <div className="text-xs text-red-400">Team Captain</div>
      </div>

      {/* Winner Selection */}
      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-2">Select Winner</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setSelectedWinner(match.team1._id)}
            className={`p-3 rounded-lg border transition-all ${
              selectedWinner === match.team1._id
                ? 'border-green-500 bg-green-500/20 text-green-400'
                : 'border-white/20 bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
          >
            {match.team1.name}
          </button>
          <button
            onClick={() => setSelectedWinner(match.team2._id)}
            className={`p-3 rounded-lg border transition-all ${
              selectedWinner === match.team2._id
                ? 'border-green-500 bg-green-500/20 text-green-400'
                : 'border-white/20 bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
          >
            {match.team2.name}
          </button>
        </div>
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