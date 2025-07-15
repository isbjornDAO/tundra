'use client';

import { useState } from 'react';

interface Match {
  _id: string;
  team1?: {
    _id?: string;
    id?: string;
    name?: string;
    organizer?: string;
  };
  team2?: {
    _id?: string;
    id?: string;
    name?: string;
    organizer?: string;
  };
  status: string;
  scheduledTime?: string;
}

interface TimeCoordinationModuleProps {
  match: Match;
  userAddress: string;
  isUserMatch: boolean;
  onTimeProposed: (matchId: string, time: string) => void;
  onTimeApproved: (matchId: string) => void;
  onTimeRejected: (timeSlotId: string) => void;
  submitting: boolean;
}

export default function TimeCoordinationModule({
  match,
  userAddress,
  isUserMatch,
  onTimeProposed,
  onTimeApproved,
  onTimeRejected,
  submitting
}: TimeCoordinationModuleProps) {
  const [proposedTime, setProposedTime] = useState('');
  const [showTimeForm, setShowTimeForm] = useState(false);

  const handleProposeTime = () => {
    if (!proposedTime) return;
    onTimeProposed(match._id, proposedTime);
    setProposedTime('');
    setShowTimeForm(false);
  };

  // Generate time slots for the next 7 days
  const generateTimeSlots = () => {
    const slots = [];
    const now = new Date();
    
    for (let day = 1; day <= 7; day++) {
      const date = new Date(now);
      date.setDate(date.getDate() + day);
      
      // Common gaming hours: 6 PM, 7 PM, 8 PM, 9 PM
      [18, 19, 20, 21].forEach(hour => {
        const timeSlot = new Date(date);
        timeSlot.setHours(hour, 0, 0, 0);
        
        slots.push({
          value: timeSlot.toISOString(),
          label: timeSlot.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
          }) + ' at ' + timeSlot.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        });
      });
    }
    
    return slots;
  };

  const timeSlots = generateTimeSlots();

  if (!isUserMatch) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <div className="text-center">
          <div className="text-gray-400 text-sm">⏳ Waiting for teams to coordinate match time</div>
        </div>
      </div>
    );
  }

  if (match.status === 'scheduled' && match.scheduledTime) {
    const scheduledTime = new Date(match.scheduledTime);
    const isTimeReached = scheduledTime <= new Date();
    
    return (
      <div className={`border rounded-lg p-4 ${
        isTimeReached ? 'bg-blue-500/10 border-blue-500/20' : 'bg-green-500/10 border-green-500/20'
      }`}>
        <div className="text-center">
          <div className={`font-medium ${
            isTimeReached ? 'text-blue-400' : 'text-green-400'
          }`}>
            {isTimeReached ? '🕐 Match Time Reached' : '✅ Match Time Confirmed'}
          </div>
          <div className="text-sm text-gray-300 mt-1">
            {scheduledTime.toLocaleDateString()} at{' '}
            {scheduledTime.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              timeZoneName: 'short'
            })}
          </div>
          {isTimeReached && (
            <div className="text-xs text-blue-300 mt-1">
              Regional hosts can now submit match results
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h5 className="text-white font-medium">⏰ Match Time Coordination</h5>
        <div className="text-xs text-blue-400">Your Match</div>
      </div>

      {!showTimeForm ? (
        <div className="space-y-3">
          <div className="text-sm text-gray-300">
            Coordinate with your opponent to schedule this match
          </div>
          <button
            onClick={() => setShowTimeForm(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            📅 Propose Match Time
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Select Match Time</label>
            <select
              value={proposedTime}
              onChange={(e) => setProposedTime(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-white"
            >
              <option value="">Choose a time...</option>
              {timeSlots.map((slot) => (
                <option key={slot.value} value={slot.value} className="bg-gray-800">
                  {slot.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleProposeTime}
              disabled={!proposedTime || submitting}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {submitting ? 'Proposing...' : 'Propose Time'}
            </button>
            <button
              onClick={() => setShowTimeForm(false)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}