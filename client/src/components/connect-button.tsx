"use client";

import { useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useNativeBalance } from "@/hooks/use-balance";
import Jazzicon, { jsNumberForAddress } from "react-jazzicon";
import { Button } from "@/components/ui/button";
import { CopyButton } from "./copy-button";
import { Address } from "viem";

export const ConnectButton = () => {
  const [isAccountModalOpen, setAccountModalOpen] = useState(false);
  const { login, logout, ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const wallet = wallets && wallets.length > 0 ? wallets[0] : null;
  const balanceInfo = useNativeBalance(wallet?.address as Address);

  // Wait for Privy to be ready
  if (!ready) {
    return (
      <div
        aria-hidden={true}
        style={{
          opacity: 0,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        <Button disabled>Loading...</Button>
      </div>
    );
  }

  // If not authenticated, show login button
  if (!authenticated) {
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

  if (!wallet) {
    return (
      <Button variant="destructive" type="button">
        No wallet found
      </Button>
    );
  }

  const account = {
    address: wallet.address,
    displayName: user?.wallet?.address
      ? `${user.wallet.address.slice(0, 6)}...${user.wallet.address.slice(-4)}`
      : wallet.address.slice(0, 6) + "..." + wallet.address.slice(-4)
  };

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
            className="bg-black text-white border border-white/20 hover:border-white/30 transition-colors rounded-lg p-6 min-w-[300px]"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-4">Account Details</h2>
            <div className="flex items-center gap-3 mb-4 font-mono">
              <Jazzicon seed={jsNumberForAddress(account.address)} />
              <span>{account.displayName}</span>
              <CopyButton content={account.address}/>
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