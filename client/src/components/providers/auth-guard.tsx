'use client';

import { useTeam1Auth } from '@/hooks/use-team1-auth';
import { ConnectButton } from '../connect-button';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isConnected, hasTeam1NFT, isLoading } = useTeam1Auth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg animate-pulse">Checking Team1 credentials...</div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <h1 className="text-2xl font-bold">Welcome to Tundra</h1>
        <p className="text-gray-600">Connect your wallet to access the Team1 tournament platform</p>
            <ConnectButton />
      </div>
    );
  }

  if (!hasTeam1NFT) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-gray-600">You need a Team1 NFT to access this platform</p>
            <ConnectButton />
      </div>
    );
  }

  return <>{children}</>;
}