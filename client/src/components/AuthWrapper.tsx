'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { usePathname } from 'next/navigation';
import { UserSignupModal } from '@/components/UserSignupModal';

interface AuthWrapperProps {
  children: React.ReactNode;
}

function AuthWrapperContent({ children }: AuthWrapperProps) {
  const pathname = usePathname();
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
    if (newUser && newUser.username && newUser.country) {
      setUser(newUser);
      setNeedsSignup(false);
      // Force a re-check by refetching user data
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

  return (
    <>
      {children}
      
      {/* Show signup modal when connected but needs signup - but not on login page */}
      {pathname !== '/login' && !loading && (
        <UserSignupModal 
          isOpen={needsSignup && isConnected && !!address}
          walletAddress={address || ''}
          onSignupComplete={handleSignupComplete}
          onClose={() => {
            // Don't allow closing without signup - disconnect wallet instead
            console.log('Signup modal close attempted - user must complete signup');
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