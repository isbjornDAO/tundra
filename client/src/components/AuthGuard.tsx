'use client';

import { useState, useEffect } from 'react';
import { useTeam1Auth } from '@/hooks/useTeam1Auth';
import { ConnectWallet } from './ConnectWallet';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-white">Loading...</div>
      </div>
    );
  }

  return <AuthGuardInner>{children}</AuthGuardInner>;
}

function AuthGuardInner({ children }: AuthGuardProps) {
  const { isConnected, hasTeam1NFT, isLoading } = useTeam1Auth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Checking Team1 credentials...</div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <h1 className="text-2xl font-bold">Welcome to Tundra</h1>
        <p className="text-gray-600">Connect your wallet to access the Team1 tournament platform</p>
        <ConnectWallet />
      </div>
    );
  }

  if (!hasTeam1NFT) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-gray-600">You need a Team1 NFT to access this platform</p>
        <ConnectWallet />
      </div>
    );
  }

  return <>{children}</>;
}