import * as React from "react";
import { useState, useEffect } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider, createConfig, http } from "wagmi";
import { avalanche, avalancheFuji } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

interface BaseStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

export const noopStorage: BaseStorage = {
    getItem: () => null,
    setItem: () => { },
    removeItem: () => { },
};

export const storage =
    typeof window !== "undefined" && window.localStorage
        ? window.localStorage
        : null;

export const web3Config = createConfig({
    chains: [avalanche, avalancheFuji],
    transports: {
        [avalanche.id]: http("https://avalanche-c-chain-rpc.publicnode.com"),
        [avalancheFuji.id]: http("https://avalanche-fuji-c-chain-rpc.publicnode.com"),
    },
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient());

    return (
        <PrivyProvider
            appId="cmcaqk6ya003el40mptkljsad" // Replace with your actual Privy App ID
            config={{
                // Appearance configuration
                appearance: {
                    theme: 'dark',
                    accentColor: '#676FFF',
                    logo: '/assets/vite.svg', // Optional: your app logo
                },
                // Login methods configuration
                loginMethods: ['wallet', 'email', 'sms', 'google', 'twitter'],
                // Wallet configuration
                embeddedWallets: {
                    createOnLogin: 'users-without-wallets',
                    requireUserPasswordOnCreate: true,
                },
                // Default chain
                defaultChain: avalanche,
                // Supported chains
                supportedChains: [avalanche, avalancheFuji],
            }}
        >
            <QueryClientProvider client={queryClient}>
                <WagmiProvider config={web3Config}>
                    {children}
                </WagmiProvider>
            </QueryClientProvider>
        </PrivyProvider>
    );
}