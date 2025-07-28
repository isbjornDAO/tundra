'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { useAccount } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter, usePathname } from 'next/navigation';

interface AuthGuardProps {
  children: React.ReactNode;
};

export interface AdminData {
  isAdmin: boolean;
  isClanLeader?: boolean;
  isHost?: boolean;
  role?: 'admin' | 'host' | null;
  regions?: string[];
};

interface AuthContextType {
  user: any;
  adminData: AdminData | null;
  address: string | undefined;
  isConnected: boolean;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthGuard");
  }
  return context;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { address, isConnected } = useAccount();
  const { ready, authenticated, user: privyUser } = usePrivy();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [needsSignup, setNeedsSignup] = useState(false);
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(true);
  const [isCheckingWallet, setIsCheckingWallet] = useState(true);
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const isWalletConnected = isConnected || (authenticated && privyUser?.wallet?.address);

  useEffect(() => {
    // Give wallet time to connect before considering it disconnected
    const timer = setTimeout(() => setIsCheckingWallet(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const walletAddress = address || privyUser?.wallet?.address;
    if (isWalletConnected && walletAddress) {
      setLoading(true);
      fetch(`/api/users?walletAddress=${walletAddress}`)
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
        .catch(() => {
          setUser(null);
          setNeedsSignup(true);
        })
        .finally(() => setLoading(false));
    } else {
      setUser(null);
      setNeedsSignup(false);
      setLoading(false);
    }
  }, [ready, address, isConnected, authenticated, privyUser?.wallet?.address, isWalletConnected]);

  useEffect(() => {
    if (address) {
      fetch(`/api/admin/check?walletAddress=${address}`)
        .then(res => res.json())
        .then(data => {
          setAdminData(data);
        })
        .catch(() => { })
        .finally(() => {
          setIsLoadingAdmin(false);
          setLoading(false);
        });
    }
  }, [address]);

  useEffect(() => {
    if (!isWalletConnected && pathname !== '/login' && !isCheckingWallet) {
      const redirectTimer = setTimeout(() => router.push('/login'), 100);
      return () => clearTimeout(redirectTimer);
    }
  }, [isWalletConnected, pathname, isCheckingWallet, router]);

  useEffect(() => {
    if (isWalletConnected) setIsCheckingWallet(false);
  }, [isWalletConnected]);

  useEffect(() => {
    if (needsSignup) router.push('/login');
  }, [needsSignup, router]);

  // Loading and redirect screens
  function getContent() {
    if (isCheckingWallet && !isWalletConnected && pathname !== '/login') {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg text-white">Checking wallet connection...</div>
        </div>
      );
    }
    if (!isWalletConnected && pathname !== '/login') {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg text-white">Redirecting to login...</div>
        </div>
      );
    }
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg text-white">Loading user data...</div>
        </div>
      );
    }
    if (needsSignup) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg text-white">Redirecting to complete signup...</div>
        </div>
      );
    }
    return children;
  }

  return (
    <AuthContext.Provider value={{ user, adminData, address, isConnected }}>
      {getContent()}
    </AuthContext.Provider>
  );
}