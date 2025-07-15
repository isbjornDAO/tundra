'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ConnectWallet } from '@/components/ConnectWallet';
import { useRouter, usePathname } from 'next/navigation';
import { UserSignupModal } from '@/components/UserSignupModal';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [needsSignup, setNeedsSignup] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isConnected && address) {
      setLoading(true);
      fetch(`/api/users?walletAddress=${address}`)
        .then(res => res.json())
        .then(data => {
          if (data.user && data.user.username && data.user.country) {
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

  useEffect(() => {
    if (address) {
      checkAdminStatus();
    } else {
      setIsLoadingAdmin(false);
    }
  }, [address]);

  const checkAdminStatus = async () => {
    try {
      const response = await fetch(`/api/admin/check?walletAddress=${address}`);
      const data = await response.json();
      setIsAdmin(data.isAdmin);
    } catch (error) {
      console.error('Error checking admin status:', error);
    } finally {
      setIsLoadingAdmin(false);
    }
  };

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
    if (newUser && newUser.username && newUser.country) {
      setUser(newUser);
      setNeedsSignup(false);
      setTimeout(() => {
        if (address) {
          fetch(`/api/users?walletAddress=${address}`)
            .then(res => res.json())
            .then(data => {
              if (data.user && data.user.username && data.user.country) {
                setUser(data.user);
                setNeedsSignup(false);
              }
            })
            .catch(console.error);
        }
      }, 100);
    }
  };

  // SSR/CSR guard
  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-white">Loading...</div>
      </div>
    );
  }

  // Loading admin check
  if (isLoadingAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-white">Checking admin credentials...</div>
      </div>
    );
  }

  // Not connected
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <h1 className="text-2xl font-bold text-white">Welcome to Tundra</h1>
        <p className="text-gray-400">Connect your wallet to access the tournament platform</p>
        <ConnectWallet />
      </div>
    );
  }

  // Needs signup
  if (needsSignup && pathname !== '/login') {
    return (
      <>
        {children}
        <UserSignupModal
          isOpen={needsSignup && isConnected && !!address}
          walletAddress={address || ''}
          onSignupComplete={handleSignupComplete}
          onClose={() => {}}
        />
      </>
    );
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <h1 className="text-2xl font-bold text-white">Access Denied</h1>
        <p className="text-gray-400">You need admin permissions to access this platform</p>
        <ConnectWallet />
      </div>
    );
  }

  return <>{children}</>;
}