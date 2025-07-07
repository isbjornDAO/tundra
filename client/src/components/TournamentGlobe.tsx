'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { useRef, useState, useMemo, Suspense, useEffect } from 'react';
import dynamic from 'next/dynamic';
import * as THREE from 'three';

interface Tournament {
  id: string;
  name: string;
  game: string;
  region: string;
  city: string;
  scheduledTime: Date;
  status: string;
  lat: number;
  lng: number;
  teamCount: number;
}

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
  tournament: Tournament | null;
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
          className={`w-3 h-3 rounded-full ${
            tournament.status === 'active' 
              ? 'bg-red-500 animate-pulse' 
              : tournament.status === 'open'
              ? 'bg-green-500'
              : 'bg-blue-500'
          }`}
        />
        <span className="text-xs font-medium text-white/60 uppercase tracking-wide">
          {tournament.status === 'active' ? 'ACTIVE NOW' : tournament.status === 'open' ? 'OPEN' : 'COMPLETED'}
        </span>
      </div>
      
      <h3 className="text-white font-semibold mb-1">{tournament.name}</h3>
      <p className="text-white/70 text-sm mb-2">{tournament.game} • {tournament.city}, {tournament.region}</p>
      
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-white/60">Teams:</span>
          <span className="text-white">{tournament.teamCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/60">
            {tournament.status === 'active' ? 'Started:' : 'Created:'}
          </span>
          <span className="text-white">
            {tournament.status === 'active' 
              ? 'Now' 
              : timeUntil > 0 
                ? `${timeUntil} days ago`
                : 'Recently'
            }
          </span>
        </div>
      </div>
    </div>
  );
}

function TournamentGlobeClient() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [hoveredTournament, setHoveredTournament] = useState<Tournament | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
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

  const handleMouseMove = (event: React.MouseEvent) => {
    setMousePosition({ x: event.clientX, y: event.clientY });
  };

  return (
    <div 
      className="relative w-full h-[500px] bg-black rounded-lg overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {loading ? (
        <div className="flex items-center justify-center h-full text-white">Loading tournaments...</div>
      ) : (
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
      )}
      
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
            <span className="text-white/70">Active Tournament</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span className="text-white/70">Open Tournament</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
            <span className="text-white/70">Completed Tournament</span>
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