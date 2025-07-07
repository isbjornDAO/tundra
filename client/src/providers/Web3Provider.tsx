'use client';

import { useState, useEffect } from 'react';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { avalanche, avalancheFuji } from 'wagmi/chains';
import '@rainbow-me/rainbowkit/styles.css';

// Create config with proper SSR handling and singleton pattern
let config: ReturnType<typeof getDefaultConfig> | null = null;
let isInitialized = false;

const getConfig = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  
  // Prevent multiple initializations
  if (config && isInitialized) {
    return config;
  }
  
  if (!config && !isInitialized) {
    isInitialized = true;
    config = getDefaultConfig({
      appName: 'Tundra - Team1 Tournament Platform',
      projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '9b30dce8-1b12-4c85-b1c8-6b5e5b5c5d5e',
      chains: [avalanche, avalancheFuji],
      ssr: false,
    });
  }
  return config;
};

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render wagmi provider during SSR
  if (!mounted || typeof window === 'undefined') {
    return <div>{children}</div>;
  }

  const wagmiConfig = getConfig();
  if (!wagmiConfig) {
    return <div>{children}</div>;
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <RainbowKitProvider showRecentTransactions={false} modalSize="compact">
        {children}
      </RainbowKitProvider>
    </WagmiProvider>
  );
}