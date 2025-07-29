'use client';

import { useState, useEffect } from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider, createConfig } from 'wagmi';
import { avalanche, avalancheFuji } from 'wagmi/chains';
import { http } from 'viem';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create Wagmi config
const wagmiConfig = createConfig({
  chains: [avalanche, avalancheFuji],
  transports: {
    [avalanche.id]: http(),
    [avalancheFuji.id]: http(),
  },
  ssr: true,
});

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <PrivyProvider
        appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'cmclb0kp5005vl20mhadmdpq0'}
        config={{
          appearance: {
            theme: 'dark',
            accentColor: '#EF4444', // Red to match Tundra theme
          },
          embeddedWallets: {
            createOnLogin: 'users-without-wallets',
          },
          supportedChains: [avalanche, avalancheFuji],
          walletConnectCloudProjectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
          loginMethods: ['wallet', 'email', 'google'],
          // Add better error handling
          // onError: (error: any) => {
          //   console.error('Privy error:', error);
          // },
        }}
      >
        <WagmiProvider config={wagmiConfig}>
          {children}
        </WagmiProvider>
      </PrivyProvider>
    </QueryClientProvider>
  );
}