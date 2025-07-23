'use client';

import { useState, useEffect } from 'react';
import { COUNTRIES } from '@/types/countries';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useDisconnect } from 'wagmi';

interface UserSignupModalProps {
  isOpen: boolean;
  walletAddress: string;
  onSignupComplete: (user: any) => void;
  onClose: () => void;
}

export function UserSignupModal({ isOpen, walletAddress, onSignupComplete, onClose }: UserSignupModalProps) {
  const { logout } = usePrivy();
  const router = useRouter();
  const { disconnect } = useDisconnect();
  const [formData, setFormData] = useState({
    username: '',
    country: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  // Check username availability with debounce
  useEffect(() => {
    const checkUsername = async () => {
      if (!formData.username || formData.username.length < 3) {
        setUsernameAvailable(null);
        return;
      }

      setCheckingUsername(true);
      console.log('Checking username:', formData.username, 'Length:', formData.username.length);
      try {
        const response = await fetch(`/api/users/check-username?username=${encodeURIComponent(formData.username)}`);
        const data = await response.json();
        
        if (response.ok) {
          setUsernameAvailable(data.available);
          setError(data.available ? '' : 'Username is already taken');
        } else {
          console.error('Username validation error:', data);
          setError(data.error || 'Failed to check username');
          setUsernameAvailable(false);
        }
      } catch (err) {
        console.error('Error checking username:', err);
      } finally {
        setCheckingUsername(false);
      }
    };

    const timeoutId = setTimeout(checkUsername, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Double-check username availability before submission
    if (formData.username.length >= 3 && !usernameAvailable) {
      setError('Username is already taken. Please choose a different username.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          walletAddress,
          username: formData.username.toLowerCase(),
          country: formData.country
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account');
      }

      onSignupComplete(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      
      {/* Modal */}
      <div className="relative bg-gray-900 border border-white/10 rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-2">Welcome to Tundra</h2>
        <div className="text-center mb-6">
          <p className="text-muted">Complete your account setup to get started</p>
        </div>

      <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-green-400 text-sm font-medium">Connected:</span>
          <span className="text-green-400 text-sm font-mono">
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </span>
        </div>
        <button
          onClick={async () => {
            try {
              // Disconnect wagmi wallet first
              await disconnect();
              // Then logout from Privy
              await logout();
              // Finally redirect to login
              router.push('/login');
            } catch (error) {
              console.error('Error disconnecting:', error);
              // Even if there's an error, still try to redirect
              router.push('/login');
            }
          }}
          className="text-green-400 hover:text-green-300 text-sm font-medium transition-colors"
        >
          Disconnect
        </button>
      </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <label className="form-label">Username</label>
            <div className="relative">
              <input
                type="text"
                value={formData.username}
                onChange={(e) => {
                  const value = e.target.value;
                  // Only allow valid characters
                  if (/^[a-zA-Z0-9_]*$/.test(value) || value === '') {
                    setFormData({ ...formData, username: value });
                  }
                }}
                className={`input-field pr-10 ${
                  formData.username.length >= 3 && !checkingUsername
                    ? usernameAvailable
                      ? 'border-green-500/50'
                      : 'border-red-500/50'
                    : ''
                }`}
                placeholder="Choose a unique username"
                required
                minLength={3}
                maxLength={20}
              />
              {formData.username.length >= 3 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {checkingUsername ? (
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : usernameAvailable ? (
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-muted mt-1">
              3-20 characters, letters, numbers, and underscores only
            </p>
            {formData.username.length >= 3 && !checkingUsername && (
              <p className={`text-xs mt-1 ${usernameAvailable ? 'text-green-400' : 'text-red-400'}`}>
                {usernameAvailable ? '✓ Username is available' : '✗ Username is already taken'}
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Country</label>
            <select
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              className="input-field"
              required
            >
              <option value="">Select your country</option>
              {COUNTRIES.map((country) => (
                <option key={country.code} value={country.code} className="text-black">
                  {country.flag} {country.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted mt-1">
              Note: Country cannot be changed later
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}


          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={
                loading || 
                !formData.username || 
                !formData.country ||
                checkingUsername ||
                (formData.username.length >= 3 && !usernameAvailable)
              }
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}