'use client';

import dynamic from 'next/dynamic';

// Make the entire component client-side only to prevent wagmi SSR issues
const RegisterTournamentClient = dynamic(() => import('@/components/pages/RegisterTournamentPage'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white">Loading tournament registration...</div>
    </div>
  )
});

export default function RegisterTournament() {
  return <RegisterTournamentClient />;
}