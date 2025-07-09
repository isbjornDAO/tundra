'use client';

import { useState } from 'react';
import { COUNTRIES } from '@/types/countries';

interface UserSignupModalProps {
  isOpen: boolean;
  walletAddress: string;
  onSignupComplete: (user: any) => void;
  onClose: () => void;
}

export function UserSignupModal({ isOpen, walletAddress, onSignupComplete, onClose }: UserSignupModalProps) {
  const [formData, setFormData] = useState({
    username: '',
    displayName: '',
    email: '',
    country: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
          ...formData
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account');
      }

      setSuccess(true);
      setTimeout(() => {
        onSignupComplete(data);
      }, 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="max-w-2xl w-full text-center">
          {/* Success Animation */}
          <div className="mb-8">
            <div className="mx-auto w-32 h-32 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          
          {/* Welcome Message */}
          <div className="card p-12 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
            <h1 className="text-4xl font-bold text-white mb-4">Welcome to Tundra!</h1>
            <h2 className="text-2xl text-green-400 font-semibold mb-6">@{formData.username}</h2>
            
            <div className="space-y-4 text-lg text-gray-300 mb-8">
              <p>🎉 Your account has been created successfully!</p>
              <p>🌐 Connect with players in your local community</p>
              <p>🏆 Compete in tournaments and earn rewards</p>
              <p>📍 Discover events happening near you</p>
            </div>
            
            <div className="bg-white/5 rounded-lg p-6 mb-6">
              <h3 className="text-white font-semibold mb-4">Your Profile</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Display Name:</span>
                  <p className="text-white font-medium">{formData.displayName}</p>
                </div>
                <div>
                  <span className="text-gray-400">Username:</span>
                  <p className="text-green-400 font-medium">@{formData.username}</p>
                </div>
                <div>
                  <span className="text-gray-400">Email:</span>
                  <p className="text-white">{formData.email}</p>
                </div>
                <div>
                  <span className="text-gray-400">Country:</span>
                  <p className="text-white">{formData.country}</p>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center gap-2 text-green-400 font-medium">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                Redirecting to your profile...
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card max-w-md w-full">
        <div className="text-center mb-6">
          <h2 className="heading-lg mb-2">Welcome to Tundra!</h2>
          <p className="text-muted">Complete your account setup to get started</p>
          <p className="text-yellow-400 text-sm mt-2">
            ⚠️ Account creation is required to access the platform
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="input-field"
              placeholder="Choose a unique username"
              required
              minLength={3}
              maxLength={20}
              pattern="[a-zA-Z0-9_]+"
              title="Username must be 3-20 characters and contain only letters, numbers, and underscores"
            />
            <p className="text-xs text-muted mt-1">
              3-20 characters, letters, numbers, and underscores only
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Display Name</label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              className="input-field"
              placeholder="How others will see you"
              required
              maxLength={50}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input-field"
              placeholder="your.email@example.com"
              required
            />
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
                <option key={country} value={country} className="text-black">
                  {country}
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
              disabled={loading || !formData.username || !formData.displayName || !formData.email || !formData.country}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-white/5 rounded-lg">
          <h4 className="text-white font-medium mb-2">Connected Wallet</h4>
          <p className="text-muted text-sm font-mono">
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </p>
        </div>
      </div>
    </div>
  );
}