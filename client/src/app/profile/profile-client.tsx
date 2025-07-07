'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { WagmiGuard } from '@/components/WagmiGuard';
import { ProfilePage } from '@/components/pages/ProfilePage';

function ProfileContent() {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected } = useAccount();
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return (
      <WagmiGuard>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg text-white">Loading...</div>
        </div>
      </WagmiGuard>
    );
  }

  if (!isConnected) {
    return (
      <WagmiGuard>
        <div className="max-w-4xl mx-auto text-center py-12">
          <div className="bg-gray-800/50 rounded-lg p-8 border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
            <p className="text-gray-400">You need to connect your wallet to view your profile.</p>
          </div>
        </div>
      </WagmiGuard>
    );
  }

  return (
    <WagmiGuard>
      <div className="container mx-auto px-4 py-8">
        <ProfilePage 
          walletAddress={address}
          displayName={address}
          onProfileUpdate={(displayName, photo) => {
            console.log('Profile updated:', displayName, photo);
          }}
        />
      </div>
    </WagmiGuard>
  );
}

export default function ProfileClient() {
  return <ProfileContent />;
}