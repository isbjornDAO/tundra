'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAccount, useAccountEffect } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';

interface User {
  _id: string;
  walletAddress: string;
  username: string;
  displayName: string;
  email: string;
  country: string;
  region?: string;
  avatar?: string;
  bio?: string;
  clan?: any;
  isClanLeader?: boolean;
  isAdmin?: boolean;
  stats?: {
    totalTournaments: number;
    wins: number;
    totalPrizeMoney: number;
    level: number;
    xp: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

// Create a safe version that doesn't use wagmi hooks directly
export function useAuth() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsSignup, setNeedsSignup] = useState(false);
  const [address, setAddress] = useState<string | undefined>();
  const [isConnected, setIsConnected] = useState(false);
  const prevAddressRef = useRef<string | undefined>(undefined);
  const isSwitchingRef = useRef(false);

  const { logout, login, authenticated } = usePrivy();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use wagmi hooks only after mounting - but we need to call them always to follow hooks rules
  const wagmiAccount = useAccount();
  
  useEffect(() => {
    if (mounted) {
      console.log('wagmi account update:', wagmiAccount.address, wagmiAccount.isConnected);
      setAddress(wagmiAccount.address);
      setIsConnected(wagmiAccount.isConnected);
    }
  }, [mounted, wagmiAccount.address, wagmiAccount.isConnected]);

  const fetchUser = useCallback(async (walletAddress: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/users?walletAddress=${walletAddress}`);
      
      if (response.ok) {
        const data = await response.json();
        // Handle both direct user object and {user: ...} wrapper
        const userData = data.user || data;
        if (userData && userData._id) {
          setUser(userData);
          setNeedsSignup(false);
        } else {
          setUser(null);
          setNeedsSignup(true);
        }
      } else {
        setUser(null);
        setNeedsSignup(true);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      setUser(null);
      setNeedsSignup(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const createUser = async (userData: any) => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      setUser(data);
      setNeedsSignup(false);
      return data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  };

  const updateUser = async (updates: any) => {
    if (!address) return;

    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          walletAddress: address,
          ...updates
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user');
      }

      setUser(data);
      return data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  // Handle wallet switching
  const handleWalletSwitch = useCallback(async (newAddress: string) => {
    if (isSwitchingRef.current) return;
    
    try {
      isSwitchingRef.current = true;
      console.log('Switching from', prevAddressRef.current, 'to', newAddress);
      
      // Clear current user state
      setUser(null);
      setLoading(true);
      
      // Logout from Privy first if authenticated
      if (authenticated && prevAddressRef.current && prevAddressRef.current !== newAddress) {
        console.log('Logging out previous wallet...');
        await logout();
        
        // Small delay to ensure logout completes
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Re-authenticate with new wallet
        console.log('Logging in with new wallet...');
        await login();
      }
      
      // Update the address reference
      prevAddressRef.current = newAddress;
      
      // Fetch user data for new wallet
      await fetchUser(newAddress);
    } catch (error) {
      console.error('Error switching wallets:', error);
    } finally {
      isSwitchingRef.current = false;
    }
  }, [authenticated, logout, login, fetchUser]);

  // Use wagmi's account change detection
  useAccountEffect({
    onConnect(data) {
      console.log('useAccountEffect - Wallet connected:', data.address);
      console.log('Previous address was:', prevAddressRef.current);
      if (data.address && data.address !== prevAddressRef.current) {
        console.log('Address changed, triggering switch...');
        handleWalletSwitch(data.address);
      } else {
        console.log('Same address, no switch needed');
      }
    },
    onDisconnect() {
      console.log('useAccountEffect - Wallet disconnected');
      setUser(null);
      setNeedsSignup(false);
      setLoading(false);
      prevAddressRef.current = undefined;
    },
  });

  // Initial load only
  useEffect(() => {
    if (mounted && isConnected && address && !prevAddressRef.current) {
      prevAddressRef.current = address;
      fetchUser(address);
    }
  }, [mounted, isConnected, address, fetchUser]);

  // Listen to MetaMask account changes directly
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;

    // Type guard for ethereum provider
    const ethereum = (window as any).ethereum;
    if (!ethereum) return;

    const handleAccountsChanged = async (accounts: string[]) => {
      console.log('MetaMask accounts changed:', accounts);
      
      if (accounts.length === 0) {
        // User disconnected all accounts
        setUser(null);
        setNeedsSignup(false);
        prevAddressRef.current = undefined;
        return;
      }

      const newAddress = accounts[0];
      if (newAddress && newAddress.toLowerCase() !== prevAddressRef.current?.toLowerCase()) {
        console.log('New account detected via MetaMask:', newAddress);
        console.log('Previous was:', prevAddressRef.current);
        
        // Clear current state
        setUser(null);
        setLoading(true);
        
        // Update address reference
        prevAddressRef.current = newAddress;
        
        // Fetch new user data
        await fetchUser(newAddress);
      }
    };

    // Add the event listener
    ethereum.on('accountsChanged', handleAccountsChanged);

    return () => {
      // Clean up the event listener
      if (ethereum.removeListener) {
        ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, [mounted, fetchUser]);

  return {
    user,
    loading,
    needsSignup,
    isConnected,
    address,
    createUser,
    updateUser,
    refetchUser: () => address && fetchUser(address)
  };
}