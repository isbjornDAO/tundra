'use client';

import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ProfileWindow } from './ProfileWindow';

export function ConnectWallet() {
  const [showProfile, setShowProfile] = useState(false);
  const [profileDisplayName, setProfileDisplayName] = useState<string>('');
  const [currentAccount, setCurrentAccount] = useState<{
    address?: string;
    displayName?: string;
    openAccountModal?: () => void;
  } | null>(null);

  return (
    <>
      <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus ||
            authenticationStatus === 'authenticated');

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              'style': {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    className="btn btn-primary"
                  >
                    Connect Wallet
                  </button>
                );
              }

              return (
                <button
                  onClick={() => {
                    setCurrentAccount({ ...account, openAccountModal });
                    setShowProfile(true);
                  }}
                  type="button"
                  className="flex items-center gap-2 bg-black border border-white/20 rounded-full px-3 py-2 hover:border-white/30 transition-colors"
                >
                  <div className="w-6 h-6 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {(profileDisplayName || account.displayName)?.[0] || account.address?.[2] || '?'}
                    </span>
                  </div>
                  <span className="text-white text-sm font-medium">
                    {profileDisplayName || account.displayName}
                  </span>
                </button>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
    
    <ProfileWindow
      isOpen={showProfile}
      onClose={() => setShowProfile(false)}
      walletAddress={currentAccount?.address}
      displayName={currentAccount?.displayName}
      openAccountModal={currentAccount?.openAccountModal}
      onProfileUpdate={(displayName) => setProfileDisplayName(displayName)}
    />
  </>
  );
}