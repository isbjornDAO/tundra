'use client';

import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import { useAccount, useAccountEffect } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter, usePathname } from 'next/navigation';

interface AuthGuardProps {
  children: React.ReactNode;
}

export interface AdminData {
  isAdmin: boolean;
  isClanLeader?: boolean;
  isHost?: boolean;
  role?: 'admin' | 'host' | null;
  regions?: string[];
}

interface AuthContextType {
  user: any;
  loading: boolean;
  needsSignup: boolean;
  address: string | undefined;
  isConnected: boolean;
  createUser: (userData: any) => Promise<any>;
  updateUser: (updates: any) => Promise<any>;
  refetchUser: () => void;
  adminData: AdminData | null;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuthGuard() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthGuard must be used within an AuthGuard");
  }
  return context;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { address: wagmiAddress, isConnected: wagmiIsConnected } = useAccount();
  const { ready, authenticated, user: privyUser } = usePrivy();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [needsSignup, setNeedsSignup] = useState(false);
  const [adminData, setAdminData] = useState<AdminData | null>(null);

  const [isCheckingWallet, setIsCheckingWallet] = useState(true);
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(true);

  const router = useRouter();
  const pathname = usePathname();

  // Track previous address for wallet switching
  const prevAddressRef = useRef<string | undefined>(undefined);
  const isSwitchingRef = useRef(false);

  // Determine wallet address and connection status
  const address = wagmiAddress || privyUser?.wallet?.address;
  const isConnected = wagmiIsConnected || (authenticated && !!privyUser?.wallet?.address);

  // Give wallet time to connect before considering it disconnected
  useEffect(() => {
    const timer = setTimeout(() => setIsCheckingWallet(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Fetch user data
  const fetchUser = useCallback(async (walletAddress: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/users?walletAddress=${walletAddress}`);
      const data = await response.json();
      const userData = data.user || data;
      if (userData && userData._id) {
        setUser(userData);
        setNeedsSignup(false);
      } else {
        setUser(null);
        setNeedsSignup(true);
      }
    } catch (error) {
      setUser(null);
      setNeedsSignup(true);
    } finally {
      setLoading(false);
    }
  }, []);
  // Create user
  const createUser = async (userData: any) => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create user');
      setUser(data);
      setNeedsSignup(false);
      return data;
    } catch (error) {
      throw error;
    }
  };

  // Update user
  const updateUser = async (updates: any) => {
    if (!address) return;
    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, ...updates })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update user');
      setUser(data);
      return data;
    } catch (error) {
      throw error;
    }
  };

  // Refetch user
  const refetchUser = useCallback(() => {
    if (address) {
      fetchUser(address);
    }
  }, [address, fetchUser]);

  // Handle wallet switching
  const handleWalletSwitch = useCallback(async (newAddress: string) => {
    if (isSwitchingRef.current) return;
    try {
      isSwitchingRef.current = true;
      setUser(null);
      setLoading(true);
      prevAddressRef.current = newAddress;
      await fetchUser(newAddress);
    } catch (error) {
      setUser(null);
      setLoading(false);
    } finally {
      isSwitchingRef.current = false;
    }
  }, [fetchUser]);

  // Wagmi account change detection
  useAccountEffect({
    onConnect(data) {
      if (data.address && data.address !== prevAddressRef.current) {
        handleWalletSwitch(data.address);
      }
    },
    onDisconnect() {
      setUser(null);
      setNeedsSignup(false);
      setLoading(false);
      prevAddressRef.current = undefined;
    },
  });

  // Initial load only
  useEffect(() => {
    if (isConnected && address && !prevAddressRef.current) {
      prevAddressRef.current = address;
      fetchUser(address);
    }
  }, [isConnected, address, fetchUser]);

  // Listen to MetaMask account changes directly
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ethereum = (window as any).ethereum;
    if (!ethereum) return;

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        setUser(null);
        setNeedsSignup(false);
        prevAddressRef.current = undefined;
        return;
      }
      const newAddress = accounts[0];
      if (newAddress && newAddress.toLowerCase() !== prevAddressRef.current?.toLowerCase()) {
        setUser(null);
        setLoading(true);
        prevAddressRef.current = newAddress;
        await fetchUser(newAddress);
      }
    };

    ethereum.on('accountsChanged', handleAccountsChanged);
    return () => {
      if (ethereum.removeListener) {
        ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, [fetchUser]);

  // Fetch admin data
  useEffect(() => {
    if (address) {
      fetch(`/api/admin/check?walletAddress=${address}`)
        .then(res => res.json())
        .then(data => setAdminData(data))
        .catch(() => { })
        .finally(() => {
          setIsLoadingAdmin(false);
          setLoading(false);
        });
    }
  }, [address]);

  useEffect(() => {
    if (isConnected) setIsCheckingWallet(false);
  }, [isConnected]);

  // Centralized redirects to login
  useEffect(() => {
    if (!isConnected && pathname !== '/login' && !isCheckingWallet) {
      router.replace('/login');
    }
  }, [isConnected, pathname, isCheckingWallet, router]);

  useEffect(() => {
    if (needsSignup && pathname !== '/login') {
      router.replace('/login');
    }
  }, [needsSignup, pathname, router, address]);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      needsSignup,
      address,
      isConnected,
      createUser,
      updateUser,
      refetchUser,
      adminData
    }}>
      {children}
    </AuthContext.Provider>
  );
}