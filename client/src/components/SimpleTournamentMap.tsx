'use client';

import { useState, useEffect } from 'react';

interface Tournament {
  id: string;
  name: string;
  game: string;
  region: string;
  city: string;
  scheduledTime: Date;
  status: string;
  teamCount: number;
  tournaments: Array<{
    id: string;
    registeredTeams: number;
    maxTeams: number;
    status: string;
    createdAt: Date;
    completedAt?: Date;
  }>;
}

export function SimpleTournamentMap() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTournaments() {
      try {
        const response = await fetch('/api/tournaments/locations');
        if (response.ok) {
          const data = await response.json();
          setTournaments(data);
        }
      } catch (error) {
        console.error('Error fetching tournaments:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchTournaments();
  }, []);

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return 'bg-red-500 text-white animate-pulse';
    }
    if (status === 'open') {
      return 'bg-green-500 text-white';
    }
    return 'bg-gray-600 text-white';
  };

  const getTimeUntil = (scheduledTime: Date) => {
    const timeUntil = Math.ceil((scheduledTime.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return timeUntil > 0 ? `${timeUntil} days` : 'Soon';
  };

  return (
    <div className="relative w-full h-[500px] bg-gradient-to-br from-black via-red-950/20 to-black rounded-lg overflow-hidden border border-white/10">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(239,68,68,0.2),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(127,29,29,0.3),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(239,68,68,0.1),transparent_50%)]"></div>
      </div>

      {/* Tournament Cards Grid */}
      <div className="relative z-10 p-8 h-full overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-white/60">Loading tournaments...</div>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-white/60">No tournaments found</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
            {tournaments.map((tournament) => (
              <div
                key={tournament.id}
                className="bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:border-red-500/40 transition-all cursor-pointer hover:scale-105"
                onClick={() => setSelectedTournament(tournament)}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(tournament.status)}`}>
                    {tournament.status === 'active' ? 'ACTIVE' : tournament.status === 'open' ? 'OPEN' : 'COMPLETED'}
                  </span>
                  <span className="text-white/60 text-xs">{tournament.teamCount} teams</span>
                </div>
                
                <h3 className="text-white font-semibold mb-2">{tournament.name}</h3>
                <p className="text-white/70 text-sm mb-2">{tournament.game}</p>
                <p className="text-white/60 text-sm mb-3">{tournament.city}, {tournament.region}</p>
                
                <div className="text-xs text-white/50">
                  {tournament.status === 'active' ? 'Active Now' : `${getTimeUntil(new Date(tournament.scheduledTime))}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>


      {/* Tournament Details Modal */}
      {selectedTournament && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="bg-black/90 border border-white/20 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(selectedTournament.status)}`}>
                {selectedTournament.status === 'active' ? 'ACTIVE NOW' : selectedTournament.status === 'open' ? 'OPEN' : 'COMPLETED'}
              </span>
              <button
                onClick={() => setSelectedTournament(null)}
                className="text-white/60 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <h3 className="text-white font-bold text-lg mb-2">{selectedTournament.name}</h3>
            <p className="text-white/70 mb-1">{selectedTournament.game}</p>
            <p className="text-white/60 mb-4">{selectedTournament.city}, {selectedTournament.region}</p>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/60">Teams:</span>
                <span className="text-white">{selectedTournament.teamCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Status:</span>
                <span className="text-white">
                  {selectedTournament.status === 'active' 
                    ? 'Active Now' 
                    : selectedTournament.status === 'open' 
                    ? 'Open for Registration'
                    : 'Completed'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Date:</span>
                <span className="text-white">{new Date(selectedTournament.scheduledTime).toLocaleDateString()}</span>
              </div>
            </div>
            
            <div className="mt-6 flex gap-2">
              <button 
                className="btn btn-primary flex-1"
                onClick={() => setSelectedTournament(null)}
              >
                View Details
              </button>
              <button 
                className="btn btn-secondary flex-1"
                onClick={() => setSelectedTournament(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}