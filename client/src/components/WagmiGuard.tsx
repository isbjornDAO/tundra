'use client';

import { useState, useEffect } from 'react';

interface WagmiGuardProps {
  children: React.ReactNode;
}

export function WagmiGuard({ children }: WagmiGuardProps) {
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

  return <>{children}</>;
}