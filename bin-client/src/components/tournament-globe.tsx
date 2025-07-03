'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { useRef, useState, useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import * as THREE from 'three';

// Tournament data with coordinates
const tournaments = [
  {
    id: '1',
    name: 'CS2 NA Championship',
    game: 'CS2',
    region: 'North America',
    scheduledTime: new Date('2025-07-05T20:00:00Z'),
    status: 'scheduled',
    lat: 40.7128,
    lng: -74.0060, // New York
    teams: 12
  },
  {
    id: '2',
    name: 'Valorant EU Masters',
    game: 'Valorant',
    region: 'Europe',
    scheduledTime: new Date('2025-07-08T18:00:00Z'),
    status: 'scheduled',
    lat: 52.5200,
    lng: 13.4050, // Berlin
    teams: 12
  },
  {
    id: '3',
    name: 'League APAC Finals',
    game: 'League of Legends',
    region: 'Asia Pacific',
    scheduledTime: new Date('2025-07-12T14:00:00Z'),
    status: 'live',
    lat: 35.6762,
    lng: 139.6503, // Tokyo
    teams: 8
  },
  {
    id: '4',
    name: 'Dota 2 SA Cup',
    game: 'Dota 2',
    region: 'South America',
    scheduledTime: new Date('2025-07-15T22:00:00Z'),
    status: 'scheduled',
    lat: -23.5505,
    lng: -46.6333, // São Paulo
    teams: 12
  },
  {
    id: '5',
    name: 'Rocket League OCE',
    game: 'Rocket League',
    region: 'Oceania',
    scheduledTime: new Date('2025-07-18T10:00:00Z'),
    status: 'scheduled',
    lat: -33.8688,
    lng: 151.2093, // Sydney
    teams: 8
  },
  {
    id: '6',
    name: 'Fortnite ME Clash',
    game: 'Fortnite',
    region: 'Middle East',
    scheduledTime: new Date('2025-07-20T16:00:00Z'),
    status: 'scheduled',
    lat: 25.2048,
    lng: 55.2708, // Dubai
    teams: 16
  }
];

// Convert lat/lng to 3D coordinates on sphere
function latLngToVector3(lat: number, lng: number, radius: number = 2.5) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

interface TournamentDotProps {
  tournament: typeof tournaments[0];
  onHover: (tournament: typeof tournaments[0] | null) => void;
}

function TournamentDot({ tournament, onHover }: TournamentDotProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const position = useMemo(() =>
    latLngToVector3(tournament.lat, tournament.lng),
    [tournament.lat, tournament.lng]
  );

  const color = tournament.status === 'live' ? '#ef4444' : '#3b82f6';
  const pulseColor = tournament.status === 'live' ? '#fca5a5' : '#93c5fd';

  return (
    <group position={position}>
      {/* Main dot */}
      <mesh
        ref={meshRef}
        onPointerEnter={() => onHover(tournament)}
        onPointerLeave={() => onHover(null)}
      >
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Pulsing ring for live tournaments */}
      {tournament.status === 'live' && (
        <mesh>
          <ringGeometry args={[0.08, 0.12, 16]} />
          <meshBasicMaterial
            color={pulseColor}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Glow effect */}
      <mesh>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.3}
        />
      </mesh>
    </group>
  );
}

function Globe() {
  const globeRef = useRef<THREE.Mesh>(null);

  // Create globe geometry with wireframe
  const globeGeometry = useMemo(() => new THREE.SphereGeometry(2.5, 64, 64), []);

  return (
    <mesh ref={globeRef}>
      <primitive object={globeGeometry} />
      <meshBasicMaterial
        color="#1e293b"
        wireframe
        transparent
        opacity={0.3}
      />
    </mesh>
  );
}

interface TournamentTooltipProps {
  tournament: typeof tournaments[0] | null;
  position: { x: number; y: number };
}

function TournamentTooltip({ tournament, position }: TournamentTooltipProps) {
  if (!tournament) return null;

  const timeUntil = Math.ceil((tournament.scheduledTime.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div
      className="absolute z-10 bg-black/90 border border-white/20 rounded-lg p-4 min-w-64 backdrop-blur-sm"
      style={{
        left: position.x + 10,
        top: position.y - 10,
        transform: 'translate(0, -100%)'
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`w-3 h-3 rounded-full ${tournament.status === 'live'
              ? 'bg-red-500 animate-pulse'
              : 'bg-blue-500'
            }`}
        />
        <span className="text-xs font-medium text-white/60 uppercase tracking-wide">
          {tournament.status === 'live' ? 'LIVE NOW' : 'SCHEDULED'}
        </span>
      </div>

      <h3 className="text-white font-semibold mb-1">{tournament.name}</h3>
      <p className="text-white/70 text-sm mb-2">{tournament.game} • {tournament.region}</p>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-white/60">Teams:</span>
          <span className="text-white">{tournament.teams}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/60">
            {tournament.status === 'live' ? 'Started:' : 'Starts in:'}
          </span>
          <span className="text-white">
            {tournament.status === 'live'
              ? 'Now'
              : timeUntil > 0
                ? `${timeUntil} days`
                : 'Soon'
            }
          </span>
        </div>
      </div>
    </div>
  );
}

function TournamentGlobeClient() {
  const [hoveredTournament, setHoveredTournament] = useState<typeof tournaments[0] | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (event: React.MouseEvent) => {
    setMousePosition({ x: event.clientX, y: event.clientY });
  };

  return (
    <div
      className="relative w-full h-[500px] bg-black rounded-lg overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      <Suspense fallback={<div className="flex items-center justify-center h-full text-white">Loading Globe...</div>}>
        <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />

          {/* Background stars */}
          <Stars radius={100} depth={50} count={5000} factor={4} />

          {/* Globe */}
          <Globe />

          {/* Tournament dots */}
          {tournaments.map((tournament) => (
            <TournamentDot
              key={tournament.id}
              tournament={tournament}
              onHover={setHoveredTournament}
            />
          ))}

          {/* Controls */}
          <OrbitControls
            enableZoom={true}
            enablePan={false}
            minDistance={4}
            maxDistance={12}
            autoRotate
            autoRotateSpeed={0.5}
          />
        </Canvas>
      </Suspense>

      {/* Tooltip */}
      <TournamentTooltip
        tournament={hoveredTournament}
        position={mousePosition}
      />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg p-3 border border-white/10">
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

      {/* Controls hint */}
      <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg p-3 border border-white/10">
        <p className="text-xs text-white/60">
          Drag to rotate • Scroll to zoom • Hover dots for details
        </p>
      </div>
    </div>
  );
}

// Export as dynamic component to avoid SSR issues
export const TournamentGlobe = dynamic(() => Promise.resolve(TournamentGlobeClient), {
  ssr: false,
  loading: () => (
    <div className="relative w-full h-[500px] bg-black rounded-lg overflow-hidden flex items-center justify-center">
      <div className="text-white">Loading 3D Globe...</div>
    </div>
  )
});