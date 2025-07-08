'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { UserSignupModal } from '@/components/UserSignupModal';

interface AuthWrapperProps {
  children: React.ReactNode;
}

function AuthWrapperContent({ children }: AuthWrapperProps) {
  const { address, isConnected } = useAccount();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [needsSignup, setNeedsSignup] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      setLoading(true);
      fetch(`/api/users?walletAddress=${address}`)
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setUser(data.user);
            setNeedsSignup(false);
          } else {
            setUser(null);
            setNeedsSignup(true);
          }
        })
        .catch(err => {
          console.error('Error fetching user:', err);
          setUser(null);
          setNeedsSignup(true);
        })
        .finally(() => setLoading(false));
    } else {
      setUser(null);
      setNeedsSignup(false);
      setLoading(false);
    }
  }, [address, isConnected]);

  const createUser = async (userData: any) => {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    
    if (response.ok) {
      const newUser = await response.json();
      setUser(newUser);
      setNeedsSignup(false);
      return newUser;
    } else {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create user');
    }
  };

  const handleSignupComplete = (newUser: any) => {
    console.log('User created successfully:', newUser);
    setUser(newUser);
    setNeedsSignup(false);
  };

  return (
    <>
      {children}
      
      {/* Show signup modal if connected but needs signup */}
      {isConnected && address && needsSignup && !loading && (
        <UserSignupModal
          isOpen={true}
          walletAddress={address}
          onSignupComplete={handleSignupComplete}
          onClose={() => {
            // Allow closing if there's an error (like wallet already registered)
            // or if user wants to disconnect wallet
            setNeedsSignup(false);
          }}
        />
      )}
    </>
  );
}

export function AuthWrapper({ children }: AuthWrapperProps) {
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

  return <AuthWrapperContent>{children}</AuthWrapperContent>;
}