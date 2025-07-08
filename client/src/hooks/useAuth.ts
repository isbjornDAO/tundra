'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

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

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use wagmi hooks only after mounting - but we need to call them always to follow hooks rules
  const wagmiAccount = useAccount();
  
  useEffect(() => {
    if (mounted) {
      setAddress(wagmiAccount.address);
      setIsConnected(wagmiAccount.isConnected);
    }
  }, [mounted, wagmiAccount.address, wagmiAccount.isConnected]);

  const fetchUser = async (walletAddress: string) => {
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
  };

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

  useEffect(() => {
    if (mounted && isConnected && address) {
      fetchUser(address);
    } else if (mounted) {
      setUser(null);
      setNeedsSignup(false);
      setLoading(false);
    }
  }, [mounted, address, isConnected]);

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