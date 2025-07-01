"use client";

import * as React from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { http } from "viem";
import { avalanche } from "wagmi/chains";
import { WagmiProvider, createConfig } from "wagmi";
import { env } from "@/env";

const wagmiConfig = createConfig({
  chains: [avalanche],
  transports: {
    [avalanche.id]: http(),
  },
  ssr: true,
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient();

  return (
    <PrivyProvider
      appId={env.NEXT_PUBLIC_PRIVY_APP_ID}
      config={{
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
        },
      }}
    >
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    </PrivyProvider>
  );
}
