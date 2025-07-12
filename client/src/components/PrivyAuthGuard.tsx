'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter, usePathname } from 'next/navigation';
import { useAccount } from 'wagmi';

function AuthGuardContent({ children }: { children: React.ReactNode }) {
  const { ready, authenticated } = usePrivy();
  const { address } = useAccount();
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [hasUsername, setHasUsername] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAuth() {
      // Allow access to login page without authentication
      if (pathname === '/login') {
        setChecking(false);
        return;
      }

      // If Privy is ready and user is not authenticated, redirect to login
      if (ready && !authenticated) {
        router.push('/login');
        setChecking(false);
        return;
      }

      // If authenticated with address, check if user has completed signup
      if (ready && authenticated && address) {
        try {
          const response = await fetch(`/api/users?walletAddress=${address}`);
          const data = await response.json();
          
          if (data.user && data.user.username) {
            // User has completed signup
            setHasUsername(true);
            setChecking(false);
          } else {
            // User exists but no username, or no user - redirect to login
            setHasUsername(false);
            router.push('/login');
            setChecking(false);
          }
        } catch (error) {
          console.error('Error checking user profile:', error);
          // On error, redirect to login
          router.push('/login');
          setChecking(false);
        }
      } else if (ready && authenticated && !address) {
        // Authenticated but no address yet, wait a bit
        setTimeout(() => {
          if (!address) {
            router.push('/login');
            setChecking(false);
          }
        }, 2000);
      } else if (ready) {
        setChecking(false);
      }
    }

    checkAuth();
  }, [ready, authenticated, address, router, pathname]);

  // Show loading state while Privy initializes
  if (!ready || checking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white text-lg">Loading Tundra...</p>
        </div>
      </div>
    );
  }

  // Don't render protected content if not authenticated (except login page)
  if (!authenticated && pathname !== '/login') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white text-lg">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Don't render protected content if authenticated but no username (except login page)
  if (authenticated && hasUsername === false && pathname !== '/login') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white text-lg">Completing setup...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function PrivyAuthGuard({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR or before mounting, show loading state
  if (!mounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white text-lg">Loading Tundra...</p>
        </div>
      </div>
    );
  }

  // After mounting, render the actual auth guard
  return <AuthGuardContent>{children}</AuthGuardContent>;
}