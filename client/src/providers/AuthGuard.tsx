'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [isCheckingWallet, setIsCheckingWallet] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    // Give wallet time to connect before considering it disconnected
    const timer = setTimeout(() => {
      setIsCheckingWallet(false);
    }, 2000); // Wait 2 seconds for wallet to connect
    
    return () => clearTimeout(timer);
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

  const checkAdminStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/check?walletAddress=${address}`);
      const data = await response.json();
      setIsAdmin(data.isAdmin);
    } catch (error) {
      console.error('Error checking admin status:', error);
    } finally {
      setIsLoadingAdmin(false);
    }
  }, [address]);

  useEffect(() => {
    if (address) {
      checkAdminStatus();
    } else {
      setIsLoadingAdmin(false);
    }
  }, [address, checkAdminStatus]);

  // Effect to handle redirection to login - only after wallet check is complete
  useEffect(() => {
    if (!isConnected && pathname !== '/login' && mounted && !isCheckingWallet) {
      router.push('/login');
    }
  }, [isConnected, pathname, mounted, isCheckingWallet]);

  // Stop checking wallet when connection is established
  useEffect(() => {
    if (isConnected) {
      setIsCheckingWallet(false);
    }
  }, [isConnected]);

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

  // Checking wallet connection
  if (isCheckingWallet && !isConnected && pathname !== '/login') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-white">Checking wallet connection...</div>
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

  // Not connected - show loading state (this should rarely show now due to wallet checking above)
  if (!isConnected && pathname !== '/login') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-white">Redirecting to login...</div>
      </div>
    );
  }

  // Allow login page to render without restrictions
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Needs signup
  if (needsSignup) {
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

  // Allow regular users to access the platform
  // Admin check is only needed for specific admin routes
  return <>{children}</>;
}