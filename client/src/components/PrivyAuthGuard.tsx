'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter, usePathname } from 'next/navigation';

export function PrivyAuthGuard({ children }: { children: React.ReactNode }) {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
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

    // If authenticated, let them through (don't check profile completeness)
    if (ready && authenticated) {
      setChecking(false);
      return;
    }

    // If ready but not authenticated, let them through for public pages
    if (ready) {
      setChecking(false);
    }
  }, [ready, authenticated, router, pathname]);

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
    return null;
  }

  return <>{children}</>;
}