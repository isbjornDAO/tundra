"use client";

import { useState, useMemo, useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useNativeBalance } from "@/hooks/use-balance";
import Jazzicon, { jsNumberForAddress } from "react-jazzicon";
import { Button } from "@/components/ui/button";
import { CopyButton } from "./copy-button";
import { Address } from "viem";

export const ConnectButton = () => {
  const { login, logout, ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const wallet = wallets && wallets.length > 0 ? wallets[0] : null;
  const balanceInfo = useNativeBalance(wallet?.address as Address);

  const [isAccountModalOpen, setAccountModalOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const account = useMemo(() => ({
    address: wallet?.address,
    displayName: user?.wallet?.address
      ? `${user.wallet.address.slice(0, 6)}...${user.wallet.address.slice(-4)}`
      : wallet?.address
        ? wallet.address.slice(0, 6) + "..." + wallet.address.slice(-4)
        : ""
  }), [wallet, user]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (ready && !authenticated) {
      // Wait 300ms before showing login to avoid flicker
      timeout = setTimeout(() => setShowLogin(true), 300);
    } else {
      setShowLogin(false);
    }
    return () => clearTimeout(timeout);
  }, [ready, authenticated]);

  useEffect(() => {
    if (authenticated && !wallet) {
      // Wait a short time to allow wallet to appear (in case of race condition)
      const timeout = setTimeout(() => {
        if (authenticated && !wallet) {
          logout();
        }
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [authenticated, wallet, logout]);

  // Wait for Privy to be ready
  if (!ready || (!authenticated && !showLogin)) {
    return (
      <div className="flex flex-row gap-4 items-center justify-center min-h-[60px]">
        <div className="loader-red mb-2"></div>
        <span className="text-white text-sm font-medium">Connecting wallet...</span>
      </div>
    );
  }

  // If not authenticated, show login button
  if (!authenticated && showLogin) {
    return (
      <button
        onClick={login}
        type="button"
        className="btn btn-primary"
      >
        Connect Wallet
      </button>
    );
  }

  if (authenticated && !wallet) {
    return (
      <Button variant="destructive" type="button">
        No wallet found
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        className="flex items-center gap-2 bg-black border border-white/20 rounded-full px-3 py-2 hover:border-white/30 transition-colors"
        onClick={() => setAccountModalOpen(true)}
      >
        <div className="w-6 h-6 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">
            {account.displayName?.[0] || account.address?.[2] || '?'}
          </span>
        </div>
        <span className="text-white text-sm font-medium font-mono">{account.displayName}</span>
      </Button>

      {isAccountModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setAccountModalOpen(false)}
        >
          <div 
            className="bg-black text-white border border-white/20 hover:border-white/30 transition-colors rounded-lg p-6 min-w-[340px]"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-4">Account Details</h2>
            <div className="flex items-center gap-3 mb-4 font-mono">
              <Jazzicon seed={jsNumberForAddress(account.address!)} />
              <span>{account.displayName}</span>
              <CopyButton content={account.address!}/>
            </div>
            {!balanceInfo.isLoading && !balanceInfo.isError && (
              <div className="mb-4 text-sm">
                Balance: {(Number(balanceInfo.balance) / 1e18).toFixed(3)} {balanceInfo.symbol}
              </div>
            )}
            <Button variant="destructive" onClick={logout}>
              Disconnect
            </Button>
            <Button
              variant="ghost"
              className="ml-2"
              onClick={() => setAccountModalOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </>
  );
};