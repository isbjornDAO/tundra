import { useState, useEffect } from 'react';

// Live tournaments (snowstorms)
const tournaments = [
    {
        id: 'na-cs2',
        name: 'CS2 North America',
        location: 'New York, NY',
        viewers: 1542,
        teams: 12
    },
    {
        id: 'eu-valorant',
        name: 'Valorant Europe',
        location: 'Berlin, Germany',
        viewers: 2365,
        teams: 8
    },
    {
        id: 'apac-lol',
        name: 'League APAC',
        location: 'Seoul, South Korea',
        viewers: 4523,
        teams: 16
    }
];

const LiveSnowstormStream = () => {
    const [activeStream, setActiveStream] = useState(tournaments[0]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1500);

        return () => clearTimeout(timer);
    }, [activeStream]);

    return (
        <div className="card">
            {/* Stream Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-red-500 text-sm font-semibold">LIVE</span>
                    </div>
                    <h3 className="text-white font-bold">{activeStream.name}</h3>
                </div>
                <div className="text-gray-400 text-sm">{activeStream.location}</div>
            </div>

            {/* Stream Content */}
            <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden mb-4">
                {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="relative w-full h-full">
                        {/* Gaming footage simulation */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-purple-900 to-red-900">
                            {/* Animated gaming elements */}
                            <div className="absolute inset-0 overflow-hidden">
                                {/* Floating UI elements */}
                                {Array.from({ length: 8 }, (_, i) => (
                                    <div
                                        key={`ui-${i}`}
                                        className="absolute bg-white/20 rounded border border-white/30 ui-float"
                                        style={{
                                            width: `${Math.random() * 60 + 20}px`,
                                            height: `${Math.random() * 20 + 10}px`,
                                            left: `${Math.random() * 80 + 10}%`,
                                            top: `${Math.random() * 80 + 10}%`,
                                            animationDelay: `${Math.random() * 3}s`,
                                        }}
                                    />
                                ))}

                                {/* Particle effects */}
                                {Array.from({ length: 20 }, (_, i) => (
                                    <div
                                        key={`particle-${i}`}
                                        className="absolute bg-yellow-400 rounded-full sparkle"
                                        style={{
                                            width: `${Math.random() * 4 + 2}px`,
                                            height: `${Math.random() * 4 + 2}px`,
                                            left: `${Math.random() * 100}%`,
                                            top: `${Math.random() * 100}%`,
                                            animationDelay: `${Math.random() * 2}s`,
                                        }}
                                    />
                                ))}

                                {/* Crosshair */}
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                                    <div className="w-6 h-6 border-2 border-white/60 rounded-full">
                                        <div className="absolute top-1/2 left-1/2 w-2 h-0.5 bg-white/60 transform -translate-x-1/2 -translate-y-1/2"></div>
                                        <div className="absolute top-1/2 left-1/2 w-0.5 h-2 bg-white/60 transform -translate-x-1/2 -translate-y-1/2"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Tournament Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
                    <div className="text-white font-semibold">{activeStream.viewers.toLocaleString()}</div>
                    <div className="text-gray-400">Viewers</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
                    <div className="text-white font-semibold">{activeStream.teams}</div>
                    <div className="text-gray-400">Teams</div>
                </div>
            </div>
        </div>
    );
};

export default LiveSnowstormStream;