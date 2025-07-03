'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import { Layout } from '@/components/Layout';
import { useTeam1Auth } from '@/hooks/useTeam1Auth';
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

interface MatchCardProps {
  match: BracketMatch;
  currentUserAddress: string;
  onScheduleUpdate: (matchId: string, scheduledTime: Date, organizerApproval: boolean) => void;
  onSubmitResult: (matchId: string, winner: Team) => void;
  onClick: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
              {match.scheduledTime.toLocaleDateString()} at {match.scheduledTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
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

function InfoModal() {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowInfo(true)}
        className="w-6 h-6 rounded-full border border-gray-400 text-gray-400 hover:border-white hover:text-white transition-colors flex items-center justify-center text-sm"
      >
        i
      </button>

      {showInfo && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="heading-md">Tournament Instructions</h3>
              <button onClick={() => setShowInfo(false)} className="text-gray-400 hover:text-white text-2xl">×</button>
            </div>
            
            <div className="space-y-3 text-body text-sm">
              <div>
                <h4 className="text-white font-medium mb-2">🎮 How to Play</h4>
                <ul className="space-y-1 text-gray-300">
                  <li>• Both team organizers must agree on match times</li>
                  <li>• Matches are played on Avax Gaming Discord</li>
                  <li>• Click match cards to view details and schedule</li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-white font-medium mb-2">⏰ Scheduling</h4>
                <ul className="space-y-1 text-gray-300">
                  <li>• Propose a time that works for your team</li>
                  <li>• Wait for opponent to approve the time</li>
                  <li>• Once both approve, match is scheduled</li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-white font-medium mb-2">🏆 Results</h4>
                <ul className="space-y-1 text-gray-300">
                  <li>• Submit results after completing matches</li>
                  <li>• Winners advance to the next round</li>
                  <li>• Contact opposing organizers via Discord</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function GameSelector({ selectedGame, onGameSelect }: { selectedGame: string; onGameSelect: (game: string) => void }) {
  return (
    <div className="flex items-center gap-4 overflow-x-auto pb-2">
      {GAMES.map((game) => {
        const hasData = game === 'CS2' || game === 'Valorant';
        return (
          <button
            key={game}
            onClick={() => hasData && onGameSelect(game)}
            disabled={!hasData}
            className={`flex-shrink-0 px-4 py-2 rounded-lg border transition-all ${
              selectedGame === game 
                ? 'border-white/40 bg-white/10' 
                : 'border-white/20 bg-white/5 hover:bg-white/10'
            } ${!hasData ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="text-center">
              <h3 className="text-sm font-medium text-white mb-1">{game}</h3>
              {hasData ? (
                <span className="text-xs text-green-400 font-medium">12/12 Full</span>
              ) : (
                <span className="text-xs text-gray-400">Coming Soon</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

interface MatchDetailModalProps {
  match: BracketMatch | null;
  currentUserAddress: string;
  onClose: () => void;
  onScheduleUpdate: (matchId: string, scheduledTime: Date, organizerApproval: boolean) => void;
  onSubmitResult: (matchId: string, winner: Team) => void;
}

function MatchDetailModal({ match, currentUserAddress, onClose, onScheduleUpdate, onSubmitResult }: MatchDetailModalProps) {
  const [proposedTime, setProposedTime] = useState('');
  const [showTimeInput, setShowTimeInput] = useState(false);
  const [timeProposalMode, setTimeProposalMode] = useState<'quick' | 'custom'>('quick');
  const [selectedQuickTime, setSelectedQuickTime] = useState('');
  const [showResultModal, setShowResultModal] = useState(false);

  if (!match) return null;

  const isOrganizer1 = match.team1.organizer.toLowerCase() === currentUserAddress.toLowerCase();
  const isOrganizer2 = match.team2.organizer.toLowerCase() === currentUserAddress.toLowerCase();
  const isCurrentUserOrganizer = isOrganizer1 || isOrganizer2;
  const userApproved = (isOrganizer1 && match.organizer1Approved) || (isOrganizer2 && match.organizer2Approved);
  const bothApproved = match.organizer1Approved && match.organizer2Approved;

  const handleTimeProposal = () => {
    const timeToUse = timeProposalMode === 'quick' ? selectedQuickTime : proposedTime;
    if (!timeToUse) return;
    const scheduledTime = new Date(timeToUse);
    onScheduleUpdate(match.id, scheduledTime, true);
    setShowTimeInput(false);
    setProposedTime('');
    setSelectedQuickTime('');
  };

  const generateQuickTimes = () => {
    const times: Array<{label: string, value: string, date: Date}> = [];
    const now = new Date();
    
    // Next few days at common times
    for (let day = 1; day <= 7; day++) {
      const date = new Date(now);
      date.setDate(now.getDate() + day);
      
      // Common gaming times
      const commonTimes = ['18:00', '19:00', '20:00', '21:00'];
      
      commonTimes.forEach(time => {
        const [hours, minutes] = time.split(':');
        const scheduledDate = new Date(date);
        scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        if (scheduledDate > now) {
          times.push({
            label: `${scheduledDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${time}`,
            value: scheduledDate.toISOString().slice(0, 16),
            date: scheduledDate
          });
        }
      });
    }
    
    return times.slice(0, 8); // Limit to 8 options
  };

  const quickTimeOptions = generateQuickTimes();

  const handleApproval = () => {
    if (match.scheduledTime) {
      onScheduleUpdate(match.id, match.scheduledTime, true);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="heading-lg">Match Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">×</button>
        </div>

        {/* Teams */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className={`card-compact ${match.winner?.id === match.team1.id ? 'bg-green-500/20 border-green-500/40' : ''}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-3 h-3 rounded-full ${match.organizer1Approved ? 'bg-green-400' : 'bg-gray-400'}`} />
              <h3 className="text-white font-semibold">{match.team1.name}</h3>
              {match.winner?.id === match.team1.id && <span className="text-green-400">🏆</span>}
            </div>
            <p className="text-gray-400 text-sm mb-1">Region: {match.team1.region}</p>
            <p className="text-gray-400 text-sm">Organizer: {match.team1.organizer.slice(0, 8)}...{match.team1.organizer.slice(-4)}</p>
            <div className="mt-2">
              <span className={`text-xs px-2 py-1 rounded ${match.organizer1Approved ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                {match.organizer1Approved ? 'Time Approved' : 'Time Pending'}
              </span>
            </div>
          </div>

          <div className={`card-compact ${match.winner?.id === match.team2.id ? 'bg-green-500/20 border-green-500/40' : ''}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-3 h-3 rounded-full ${match.organizer2Approved ? 'bg-green-400' : 'bg-gray-400'}`} />
              <h3 className="text-white font-semibold">{match.team2.name}</h3>
              {match.winner?.id === match.team2.id && <span className="text-green-400">🏆</span>}
            </div>
            <p className="text-gray-400 text-sm mb-1">Region: {match.team2.region}</p>
            <p className="text-gray-400 text-sm">Organizer: {match.team2.organizer.slice(0, 8)}...{match.team2.organizer.slice(-4)}</p>
            <div className="mt-2">
              <span className={`text-xs px-2 py-1 rounded ${match.organizer2Approved ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                {match.organizer2Approved ? 'Time Approved' : 'Time Pending'}
              </span>
            </div>
          </div>
        </div>

        {/* Match Status & Time */}
        <div className="card-compact bg-white/5 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-white font-medium">Match Scheduling</h4>
            <span className={`px-3 py-1 rounded-full text-sm ${
              match.status === 'completed' ? 'bg-green-500/20 text-green-400' :
              match.status === 'scheduled' ? 'bg-blue-500/20 text-blue-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {match.status.toUpperCase()}
            </span>
          </div>

          {match.scheduledTime ? (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-blue-400">📅</span>
                <h5 className="text-blue-400 font-medium">Proposed Match Time</h5>
              </div>
              <p className="text-white text-lg font-medium mb-3">
                {match.scheduledTime.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })} at {match.scheduledTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-3 rounded-lg border ${
                  match.organizer1Approved 
                    ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                    : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                }`}>
                  <div className="flex items-center gap-2">
                    <span>{match.organizer1Approved ? '✅' : '⏳'}</span>
                    <span className="font-medium">{match.team1.name}</span>
                  </div>
                  <div className="text-xs mt-1">
                    {match.organizer1Approved ? 'Approved this time' : 'Waiting for approval'}
                  </div>
                </div>
                
                <div className={`p-3 rounded-lg border ${
                  match.organizer2Approved 
                    ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                    : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                }`}>
                  <div className="flex items-center gap-2">
                    <span>{match.organizer2Approved ? '✅' : '⏳'}</span>
                    <span className="font-medium">{match.team2.name}</span>
                  </div>
                  <div className="text-xs mt-1">
                    {match.organizer2Approved ? 'Approved this time' : 'Waiting for approval'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4 mb-4 text-center">
              <span className="text-gray-400 text-lg">⏰</span>
              <h5 className="text-gray-400 font-medium mt-1">No Time Set</h5>
              <p className="text-gray-500 text-sm">Match time needs to be proposed and agreed upon</p>
            </div>
          )}
        </div>

        {/* Actions for organizers */}
        {isCurrentUserOrganizer && match.status !== 'completed' && (
          <div className="space-y-4">
            {!showTimeInput && (
              <div className="space-y-3">
                {!match.scheduledTime && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-yellow-400">💡</span>
                      <h5 className="text-yellow-400 font-medium">Action Needed</h5>
                    </div>
                    <p className="text-gray-300 text-sm mb-3">This match needs a scheduled time. Propose a time that works for your team.</p>
                    <button
                      onClick={() => setShowTimeInput(true)}
                      className="btn btn-primary w-full"
                    >
                      🕒 Propose Match Time
                    </button>
                  </div>
                )}
                
                {match.scheduledTime && !userApproved && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-blue-400">⏰</span>
                      <h5 className="text-blue-400 font-medium">Time Approval Needed</h5>
                    </div>
                    <p className="text-gray-300 text-sm mb-3">Your opponent proposed this time. Do you approve?</p>
                    <div className="flex gap-3">
                      <button
                        onClick={handleApproval}
                        className="btn btn-primary flex-1"
                      >
                        ✅ Approve Time
                      </button>
                      <button
                        onClick={() => setShowTimeInput(true)}
                        className="btn btn-secondary flex-1"
                      >
                        🔄 Propose Different Time
                      </button>
                    </div>
                  </div>
                )}
                
                {match.scheduledTime && userApproved && !bothApproved && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-green-400">✅</span>
                      <h5 className="text-green-400 font-medium">Waiting for Opponent</h5>
                    </div>
                    <p className="text-gray-300 text-sm mb-3">You&apos;ve approved this time. Waiting for your opponent to approve.</p>
                    <button
                      onClick={() => setShowTimeInput(true)}
                      className="btn btn-secondary"
                    >
                      🔄 Propose Different Time
                    </button>
                  </div>
                )}

                {bothApproved && match.status === 'scheduled' && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-green-400">🎮</span>
                      <h5 className="text-green-400 font-medium">Match is Scheduled!</h5>
                    </div>
                    <p className="text-gray-300 text-sm mb-3">Both teams approved the time. Ready to play!</p>
                    <button
                      onClick={() => setShowResultModal(true)}
                      className="btn btn-primary w-full"
                    >
                      🏆 Submit Match Result
                    </button>
                  </div>
                )}
              </div>
            )}

            {showTimeInput && (
              <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h5 className="text-white font-medium text-lg">🕒 Schedule Match Time</h5>
                  <button 
                    onClick={() => setShowTimeInput(false)}
                    className="text-gray-400 hover:text-white text-xl"
                  >
                    ×
                  </button>
                </div>
                
                {/* Time Proposal Mode Selector */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setTimeProposalMode('quick')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      timeProposalMode === 'quick' 
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' 
                        : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    🚀 Quick Options
                  </button>
                  <button
                    onClick={() => setTimeProposalMode('custom')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      timeProposalMode === 'custom' 
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' 
                        : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    🎯 Custom Time
                  </button>
                </div>

                {timeProposalMode === 'quick' ? (
                  <div className="space-y-4">
                    <p className="text-gray-300 text-sm">Choose from common gaming times:</p>
                    <div className="grid grid-cols-2 gap-3">
                      {quickTimeOptions.map((option, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedQuickTime(option.value)}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            selectedQuickTime === option.value
                              ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                              : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/20 hover:bg-white/10'
                          }`}
                        >
                          <div className="font-medium text-sm">{option.label}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            {option.date.toLocaleDateString('en-US', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })} (Local)
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">Select custom date and time:</label>
                      <input
                        type="datetime-local"
                        value={proposedTime}
                        onChange={(e) => setProposedTime(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                        className="input-field"
                      />
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                      <p className="text-blue-400 text-xs">
                        💡 Tip: Choose a time that works well for both teams&apos; time zones
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleTimeProposal}
                    disabled={timeProposalMode === 'quick' ? !selectedQuickTime : !proposedTime}
                    className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    📅 Propose This Time
                  </button>
                  <button
                    onClick={() => {
                      setShowTimeInput(false);
                      setProposedTime('');
                      setSelectedQuickTime('');
                    }}
                    className="btn btn-secondary px-6"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Result Submission Modal */}
        {showResultModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 border border-white/10">
              <h3 className="text-white font-semibold text-lg mb-4">🏆 Submit Match Result</h3>
              <p className="text-gray-300 text-sm mb-4">Who won this match?</p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    onSubmitResult(match.id, match.team1);
                    setShowResultModal(false);
                  }}
                  className="w-full p-3 bg-green-500/20 border border-green-500/40 rounded-lg text-green-400 hover:bg-green-500/30 transition-colors"
                >
                  {match.team1.name} Won
                </button>
                <button
                  onClick={() => {
                    onSubmitResult(match.id, match.team2);
                    setShowResultModal(false);
                  }}
                  className="w-full p-3 bg-green-500/20 border border-green-500/40 rounded-lg text-green-400 hover:bg-green-500/30 transition-colors"
                >
                  {match.team2.name} Won
                </button>
              </div>
              <button
                onClick={() => setShowResultModal(false)}
                className="w-full mt-4 btn btn-secondary"
              >
                Cancel
              </button>
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
  const [matches, setMatches] = useState<BracketMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null);

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

  useEffect(() => {
    if (selectedGame && mockGameData[selectedGame as keyof typeof mockGameData]) {
      const gameData = mockGameData[selectedGame as keyof typeof mockGameData];
      
      // Generate first round matches
      const firstRoundMatches: BracketMatch[] = [];
      for (let i = 0; i < 6; i++) {
        const team1 = gameData.teams[i * 2];
        const team2 = gameData.teams[i * 2 + 1];
        
        // Generate realistic match states
        const randomState = Math.random();
        let status: 'pending' | 'scheduled' | 'completed';
        let organizer1Approved = false;
        let organizer2Approved = false;
        let scheduledTime: Date | undefined;
        let winner: Team | undefined;
        
        if (randomState > 0.8) {
          // 20% completed matches - both approved + winner
          status = 'completed';
          organizer1Approved = true;
          organizer2Approved = true;
          scheduledTime = new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000); // Past date
          winner = Math.random() > 0.5 ? team1 as Team : team2 as Team;
        } else if (randomState > 0.5) {
          // 30% scheduled matches - both approved, no winner yet
          status = 'scheduled';
          organizer1Approved = true;
          organizer2Approved = true;
          scheduledTime = new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000); // Future date
        } else {
          // 50% pending matches - not both approved
          status = 'pending';
          organizer1Approved = Math.random() > 0.5; // Sometimes one has approved
          organizer2Approved = false; // But never both for pending
          scheduledTime = organizer1Approved ? new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000) : undefined;
        }
        
        firstRoundMatches.push({
          id: `${selectedGame}-first-${i}`,
          team1: team1 as Team,
          team2: team2 as Team,
          round: 'first',
          organizer1Approved,
          organizer2Approved,
          status,
          scheduledTime,
          winner
        });
      }
      
      setMatches(firstRoundMatches);
    }
  }, [selectedGame]);

  const handleScheduleUpdate = (matchId: string, scheduledTime: Date, organizerApproval: boolean) => {
    setMatches(prev => prev.map(match => {
      if (match.id === matchId) {
        const isOrganizer1 = match.team1.organizer.toLowerCase() === address?.toLowerCase();
        const newOrganizer1Approved = isOrganizer1 ? organizerApproval : match.organizer1Approved;
        const newOrganizer2Approved = !isOrganizer1 ? organizerApproval : match.organizer2Approved;
        
        return {
          ...match,
          scheduledTime,
          organizer1Approved: newOrganizer1Approved,
          organizer2Approved: newOrganizer2Approved,
          // Status: pending until both approve, then scheduled until results submitted
          status: newOrganizer1Approved && newOrganizer2Approved 
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
    <AuthGuard>
      <Layout>
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            {selectedGame && <h2 className="text-2xl font-bold text-white">{selectedGame} Tournament</h2>}
            <InfoModal />
          </div>
          <GameSelector selectedGame={selectedGame} onGameSelect={setSelectedGame} />
        </div>

        {selectedGame && mockGameData[selectedGame as keyof typeof mockGameData] && (
          <div>
            {/* User Dashboard */}
            {address && userMatches.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">Your Matches</h3>
                <div className="grid gap-4">
                  {/* Action Items */}
                  {pendingActions.length > 0 && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
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
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-white font-medium">Your Tournament Progress</h4>
                      <div className="text-sm text-gray-400">{userMatches.filter(m => m.status === 'completed').length}/{userMatches.length} Complete</div>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-gray-300">{userMatches.filter(m => m.status === 'completed').length} Won/Lost</span>
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
              </div>
            )}

            {/* Tournament Overview */}
            <div className="bg-white/5 rounded-lg p-4 mb-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Tournament Overview</h3>
                  <p className="text-gray-400 text-sm">Single Elimination • 12 Teams • Round 1</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">{Math.round((tournamentStats.completedMatches / tournamentStats.totalMatches) * 100)}%</div>
                  <div className="text-xs text-gray-400">Complete</div>
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
            <div>
              {/* Round 1 */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-white">Round 1 - First Round</h4>
                  <div className="text-sm text-gray-400">{matches.length} matches</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {matches.map((match) => (
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

              {/* Future Rounds Placeholder */}
              <div className="text-center py-8 mt-8 border-t border-white/10">
                <div className="text-gray-400 mb-2">🏆</div>
                <h5 className="text-white font-medium mb-1">Tournament in Progress</h5>
                <p className="text-gray-400 text-xs">
                  Future rounds will appear as matches are completed
                </p>
              </div>
            </div>

            {/* Match Detail Modal */}
            <MatchDetailModal
              match={selectedMatch}
              currentUserAddress={address || ''}
              onClose={() => setSelectedMatch(null)}
              onScheduleUpdate={handleScheduleUpdate}
              onSubmitResult={handleResultSubmission}
            />
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