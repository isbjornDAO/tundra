'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Layout } from '@/components/Layout';
import { ProfilePage } from '@/components/pages/ProfilePage';

function ProfileContent() {
  const { address, isConnected } = useAccount();
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (address) {
      // Fetch user data directly
      fetch(`/api/users?walletAddress=${address}`)
        .then(res => res.json())
        .then(data => {
          // Handle both direct user object and {user: ...} wrapper
          const userData = data.user || data;
          setUser(userData);
        })
        .catch(err => console.error('Error fetching user:', err));
    }
  }, [address]);

  const updateUser = async (updates: any) => {
    if (!address) return;
    
    const response = await fetch('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: address, ...updates })
    });
    
    if (response.ok) {
      const updatedUser = await response.json();
      setUser(updatedUser);
      return updatedUser;
    } else {
      throw new Error('Failed to update user');
    }
  };

  if (!isConnected || !user) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto text-center">
          <div className="card p-8">
            <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
            <p className="text-gray-400">You need to connect your wallet to view your profile.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <ProfilePage 
        walletAddress={address}
        displayName={address}
        user={user}
        updateUser={updateUser}
        onProfileUpdate={(displayName, photo) => {
          console.log('Profile updated:', displayName, photo);
        }}
      />
    </Layout>
  );
}

export default function ProfileClient() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg text-white">Loading...</div>
        </div>
      </Layout>
    );
  }

  return <ProfileContent />;
}