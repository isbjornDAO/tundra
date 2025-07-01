"use client";

import { useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import Jazzicon, { jsNumberForAddress } from "react-jazzicon";
import { Button } from "@/components/ui/button";

export const ConnectButton = () => {
  const [isAccountModalOpen, setAccountModalOpen] = useState(false);
  const { login, logout, ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();

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

  // Get the first wallet (assuming user has at least one)
  const wallet = wallets && wallets.length > 0 ? wallets[0] : null;
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
        <div className="h-6 w-6 flex items-center justify-center">
          <Jazzicon seed={jsNumberForAddress(account.address)} />
        </div>
        <span className="text-white text-sm font-medium">{account.displayName}</span>
      </Button>
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-black text-white rounded-lg p-6 min-w-[300px]">
            <h2 className="text-lg font-bold mb-4">Account Details</h2>
            <div className="flex items-center gap-2 mb-4">
              <Jazzicon seed={jsNumberForAddress(account.address)} />
              <span>{account.displayName}</span>
            </div>
            <div className="mb-4">
              <span className="text-xs text-gray-500">{account.address}</span>
            </div>
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