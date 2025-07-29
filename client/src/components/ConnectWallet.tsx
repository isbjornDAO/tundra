'use client';

import { useState, useRef, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useDisconnect, useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useAuth } from "@/providers/AuthGuard";

function ConnectWalletContent() {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { ready, authenticated, login, logout, user: privyUser } = usePrivy();
  const { disconnect } = useDisconnect();
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const { user, adminData } = useAuth(); // Use adminData from context

  // Use adminData from context to determine super admin
  const isSuperAdmin = adminData?.role === 'admin';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleLogout = async () => {
    setShowDropdown(false);
    try {
      disconnect();
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      router.push('/login');
    }
  };

  if (!ready) {
    return (
      <button className="btn btn-primary opacity-50">
        Connect Wallet
      </button>
    );
  }

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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        type="button"
        className="flex items-center gap-2 bg-black border border-white/20 rounded-full px-3 py-2 hover:border-white/30 transition-colors"
      >
        {user?.avatar ? (
          <img
            src={user.avatar}
            alt="Profile"
            className="w-6 h-6 rounded-full object-cover border border-white/20"
          />
        ) : (
          <div className="w-6 h-6 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              {(user?.displayName?.[0] || address?.[2])?.toUpperCase() || '?'}
            </span>
          </div>
        )}
        <div className="flex flex-col items-start min-w-0">
          <span className="text-white text-sm font-medium truncate">
            {user?.displayName || (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Unknown')}
          </span>
          {user?.username && (
            <span className="text-gray-400 text-xs truncate">
              @{user.username}
            </span>
          )}
        </div>
        <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-56 bg-black/95 backdrop-blur-sm border border-white/20 rounded-lg shadow-xl py-2" style={{ zIndex: 999999 }}>
          <div className="px-4 py-2 border-b border-white/10 mb-2">
            <p className="text-xs text-gray-400 mb-1">Connected Wallet</p>
            <p className="text-xs font-mono text-white/80">{address?.slice(0, 6)}...{address?.slice(-4)}</p>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowDropdown(false);
              setTimeout(() => router.push('/profile'), 50);
            }}
            className="w-full px-4 py-3 text-left text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-200 flex items-center gap-3 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Profile
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowDropdown(false);
              setTimeout(() => router.push('/clan'), 50);
            }}
            className="w-full px-4 py-3 text-left text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-200 flex items-center gap-3 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Clan
          </button>
          {isSuperAdmin && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowDropdown(false);
                setTimeout(() => router.push('/admin'), 50);
              }}
              className="w-full px-4 py-3 text-left text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-200 flex items-center gap-3 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Admin
            </button>
          )}
          <div className="border-t border-white/10 my-1"></div>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleLogout();
            }}
            className="w-full px-4 py-2 text-left text-red-400 hover:text-red-300 hover:bg-white/10 transition-all duration-200 flex items-center gap-3"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

export function ConnectWallet() {
  return <ConnectWalletContent />;
}