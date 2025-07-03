'use client';

import { useState, useEffect, useRef } from 'react';

// Live tournament data with accurate geographic coordinates
const liveEvents = [
  {
    id: 'na-cs2',
    name: 'CS2 NA Championship',
    game: 'CS2',
    region: 'North America',
    teams: 12,
    viewers: 15432,
    lat: 39.8283,
    lng: -98.5795, // USA center
  },
  {
    id: 'eu-valorant',
    name: 'Valorant EU Masters',
    game: 'Valorant',
    region: 'Europe',
    teams: 8,
    viewers: 23651,
    lat: 54.5260,
    lng: 15.2551, // Europe center
  },
  {
    id: 'apac-lol',
    name: 'League APAC Finals',
    game: 'League of Legends',
    region: 'Asia Pacific',
    teams: 16,
    viewers: 45230,
    lat: 35.8617,
    lng: 104.1954, // China center
  },
  {
    id: 'sa-dota',
    name: 'Dota 2 SA Cup',
    game: 'Dota 2',
    region: 'South America',
    teams: 12,
    viewers: 8942,
    lat: -14.2350,
    lng: -51.9253, // Brazil center
  },
  {
    id: 'oceania-rl',
    name: 'Rocket League OCE',
    game: 'Rocket League',
    region: 'Oceania',
    teams: 8,
    viewers: 7234,
    lat: -25.2744,
    lng: 133.7751, // Australia center
  },
  {
    id: 'jp-valorant',
    name: 'Valorant Japan Cup',
    game: 'Valorant',
    region: 'Japan',
    teams: 6,
    viewers: 18945,
    lat: 36.2048,
    lng: 138.2529, // Japan center
  },
];

export function InteractiveGlobe() {
  const [hoveredEvent, setHoveredEvent] = useState<typeof liveEvents[0] | null>(null);
  const [rotation, setRotation] = useState(0);
  const globeRef = useRef<HTMLDivElement>(null);

  // Auto-rotate the globe more smoothly
  useEffect(() => {
    const interval = setInterval(() => {
      setRotation((prev) => (prev + 0.15) % 360);
    }, 120);

    return () => clearInterval(interval);
  }, []);

  // Convert lat/lng to 3D coordinates on sphere with proper projection
  const getEventPosition = (lat: number, lng: number, radius: number = 110) => {
    // Adjust longitude to account for rotation
    const adjustedLng = lng - rotation;
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = adjustedLng * (Math.PI / 180);
    
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = -radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    
    return { x, y, z };
  };

  // Check if event is on the visible side of the globe
  const isEventVisible = (lat: number, lng: number) => {
    const adjustedLng = lng - rotation;
    const normalizedLng = ((adjustedLng + 180) % 360) - 180;
    // Only show when on front hemisphere (within 90 degrees from center)
    return Math.abs(normalizedLng) <= 90;
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Globe Container */}
      <div
        ref={globeRef}
        className="relative w-64 h-64 rounded-full overflow-hidden"
        style={{
          background: `
            radial-gradient(circle at 30% 30%, rgba(64, 64, 64, 0.3) 0%, transparent 60%),
            radial-gradient(circle at 70% 70%, rgba(32, 32, 32, 0.2) 0%, transparent 60%),
            linear-gradient(145deg, #000000 0%, #1a1a1a 50%, #2d2d2d 100%)
          `,
          boxShadow: `
            inset -20px -20px 60px rgba(0, 0, 0, 0.8),
            inset 20px 20px 60px rgba(255, 255, 255, 0.02),
            0 0 50px rgba(0, 0, 0, 0.5)
          `,
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Enhanced Grid lines for globe effect */}
        <div className="absolute inset-0 opacity-15">
          {/* Latitude lines */}
          {[...Array(8)].map((_, i) => (
            <div
              key={`lat-${i}`}
              className="absolute border-t border-white/20"
              style={{
                top: `${(i + 1) * 11.11}%`,
                left: '5%',
                right: '5%',
                borderRadius: '50%',
                transform: `perspective(300px) rotateX(${i * 12 - 42}deg)`,
              }}
            />
          ))}
          
          {/* Longitude lines */}
          {[...Array(12)].map((_, i) => (
            <div
              key={`lng-${i}`}
              className="absolute border-l border-white/20"
              style={{
                left: '50%',
                top: '5%',
                bottom: '5%',
                width: '140px',
                height: '140px',
                borderRadius: '50%',
                transform: `translateX(-50%) rotateY(${i * 15 + rotation * 0.5}deg)`,
                transformOrigin: 'center',
              }}
            />
          ))}
        </div>

        {/* Enhanced World Map Overlay */}
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `url('https://upload.wikimedia.org/wikipedia/commons/a/ac/World_location_map_%28equirectangular_180%29.svg')`,
              backgroundSize: '200% 100%',
              backgroundPosition: `${rotation * 0.5}% center`,
              backgroundRepeat: 'repeat-x',
              filter: 'grayscale(1) invert(1) contrast(1.5) brightness(0.3)',
              borderRadius: '50%',
            }}
          />
        </div>

        {/* Atmospheric glow effect */}
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle at 40% 40%, rgba(255, 255, 255, 0.05) 0%, transparent 70%)',
            animation: 'pulse 4s ease-in-out infinite',
          }}
        />

        {/* Event Dots */}
        {liveEvents.map((event) => {
          const position = getEventPosition(event.lat, event.lng);
          const isVisible = isEventVisible(event.lat, event.lng);
          
          if (!isVisible) return null;
          
          return (
            <div
              key={event.id}
              className="absolute cursor-pointer transition-all duration-300 hover:scale-125"
              style={{
                left: `calc(50% + ${position.x}px)`,
                top: `calc(50% + ${position.y}px)`,
                transform: 'translate(-50%, -50%)',
                zIndex: 20,
              }}
              onMouseEnter={() => setHoveredEvent(event)}
              onMouseLeave={() => setHoveredEvent(null)}
            >
              <div className="relative">
                {/* Main dot */}
                <div className="w-3 h-3 bg-red-500 rounded-full shadow-lg">
                  <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-75" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Enhanced Tooltip */}
      {hoveredEvent && (
        <div className="absolute z-50 bg-black/95 backdrop-blur-md border border-white/30 rounded-xl p-5 max-w-xs pointer-events-none shadow-2xl"
             style={{
               boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
             }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-75" />
            </div>
            <span className="text-green-400 text-sm font-semibold tracking-wide">LIVE TOURNAMENT</span>
          </div>
          
          <h3 className="text-white font-bold text-lg mb-2 leading-tight">{hoveredEvent.name}</h3>
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-full border border-blue-500/30">
              {hoveredEvent.game}
            </span>
            <span className="text-gray-400 text-sm">{hoveredEvent.region}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-white/5 rounded-lg p-2 text-center">
              <div className="text-white font-semibold">{hoveredEvent.teams}</div>
              <div className="text-gray-400 text-xs">Teams</div>
            </div>
            <div className="bg-white/5 rounded-lg p-2 text-center">
              <div className="text-white font-semibold">{hoveredEvent.viewers.toLocaleString()}</div>
              <div className="text-gray-400 text-xs">Viewers</div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Ambient particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(15)].map((_, i) => {
          const size = Math.random() * 1.5 + 0.5;
          const opacity = Math.random() * 0.2 + 0.05;
          return (
            <div
              key={`particle-${i}`}
              className="absolute bg-white rounded-full"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: opacity,
                animation: `float ${15 + Math.random() * 20}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 10}s`,
                filter: 'blur(0.5px)',
              }}
            />
          );
        })}
      </div>
      
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          25% { transform: translateY(-10px) translateX(5px); }
          50% { transform: translateY(-5px) translateX(-5px); }
          75% { transform: translateY(-15px) translateX(10px); }
        }
      `}</style>
    </div>
  );
}