"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useState, useEffect } from "react";

export function useTeam1Auth() {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const address = wallets && wallets.length > 0 ? wallets[0].address : null;
  const isConnected = authenticated && !!address;
  const [hasTeam1NFT, setHasTeam1NFT] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function checkTeam1NFT() {
      if (!address || !isConnected) {
        setHasTeam1NFT(false);
        return;
      }

      setIsLoading(true);

      // TODO: Replace with actual Team1 NFT contract check
      // For MVP, we'll use a placeholder that allows specific addresses
      const allowedAddresses = [
        // Add test addresses here for development
        address.toLowerCase(), // For now, allow any connected wallet
      ];

      const hasNFT = allowedAddresses.includes(address.toLowerCase());
      setHasTeam1NFT(hasNFT);
      setIsLoading(false);
    }

    checkTeam1NFT();
  }, [address, isConnected]);

  return {
    address,
    isConnected,
    hasTeam1NFT,
    isLoading,
    isAuthorized: isConnected && hasTeam1NFT,
  };
}
