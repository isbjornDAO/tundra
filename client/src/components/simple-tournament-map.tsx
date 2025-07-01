'use client';

import { useState } from 'react';

// Tournament data with coordinates
const tournaments = [
    {
        id: '1',
        name: 'CS2 NA Championship',
        game: 'CS2',
        region: 'North America',
        scheduledTime: new Date('2025-07-05T20:00:00Z'),
        status: 'scheduled',
        teams: 12
    },
    {
        id: '2',
        name: 'Valorant EU Masters',
        game: 'Valorant',
        region: 'Europe',
        scheduledTime: new Date('2025-07-08T18:00:00Z'),
        status: 'scheduled',
        teams: 12
    },
    {
        id: '3',
        name: 'League APAC Finals',
        game: 'League of Legends',
        region: 'Asia Pacific',
        scheduledTime: new Date('2025-07-12T14:00:00Z'),
        status: 'live',
        teams: 8
    },
    {
        id: '4',
        name: 'Dota 2 SA Cup',
        game: 'Dota 2',
        region: 'South America',
        scheduledTime: new Date('2025-07-15T22:00:00Z'),
        status: 'scheduled',
        teams: 12
    },
    {
        id: '5',
        name: 'Rocket League OCE',
        game: 'Rocket League',
        region: 'Oceania',
        scheduledTime: new Date('2025-07-18T10:00:00Z'),
        status: 'scheduled',
        teams: 8
    },
    {
        id: '6',
        name: 'Fortnite ME Clash',
        game: 'Fortnite',
        region: 'Middle East',
        scheduledTime: new Date('2025-07-20T16:00:00Z'),
        status: 'scheduled',
        teams: 16
    }
];

export function SimpleTournamentMap() {
    const [selectedTournament, setSelectedTournament] = useState<typeof tournaments[0] | null>(null);

    const getStatusBadge = (status: string) => {
        if (status === 'live') {
            return 'bg-red-500 text-white animate-pulse';
        }
        return 'bg-blue-500 text-white';
    };

    const getTimeUntil = (scheduledTime: Date) => {
        const timeUntil = Math.ceil((scheduledTime.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return timeUntil > 0 ? `${timeUntil} days` : 'Soon';
    };

    return (
        <div className="relative w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-lg overflow-hidden border border-white/10">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(120,119,198,0.3),transparent_50%)]"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(255,119,198,0.2),transparent_50%)]"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(99,102,241,0.2),transparent_50%)]"></div>
            </div>

            {/* Tournament Cards Grid */}
            <div className="relative z-10 p-8 h-full overflow-y-auto pb-30">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
                    {tournaments.map((tournament) => (
                        <div
                            key={tournament.id}
                            className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-lg p-4 hover:border-white/40 transition-all cursor-pointer hover:scale-105"
                            onClick={() => setSelectedTournament(tournament)}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(tournament.status)}`}>
                                    {tournament.status === 'live' ? 'LIVE' : 'SCHEDULED'}
                                </span>
                                <span className="text-white/60 text-xs">{tournament.teams} teams</span>
                            </div>

                            <h3 className="text-white font-semibold mb-2">{tournament.name}</h3>
                            <p className="text-white/70 text-sm mb-2">{tournament.game}</p>
                            <p className="text-white/60 text-sm mb-3">{tournament.region}</p>

                            <div className="text-xs text-white/50">
                                {tournament.status === 'live' ? 'Live Now' : `Starts in ${getTimeUntil(tournament.scheduledTime)}`}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="absolute bottom-6 left-8 bg-black/60 backdrop-blur-sm rounded-lg p-3 border border-white/10">
                <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-white/70">Live Tournament</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full" />
                        <span className="text-white/70">Scheduled Tournament</span>
                    </div>
                </div>
            </div>

            {/* Tournament Details Modal */}
            {selectedTournament && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-20">
                    <div className="bg-black/90 border border-white/20 rounded-lg p-6 max-w-md w-full mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(selectedTournament.status)}`}>
                                {selectedTournament.status === 'live' ? 'LIVE NOW' : 'SCHEDULED'}
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
                        <p className="text-white/60 mb-4">{selectedTournament.region}</p>

                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-white/60">Teams:</span>
                                <span className="text-white">{selectedTournament.teams}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/60">Status:</span>
                                <span className="text-white">
                                    {selectedTournament.status === 'live'
                                        ? 'Live Now'
                                        : `Starts in ${getTimeUntil(selectedTournament.scheduledTime)}`
                                    }
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/60">Date:</span>
                                <span className="text-white">{selectedTournament.scheduledTime.toLocaleDateString()}</span>
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