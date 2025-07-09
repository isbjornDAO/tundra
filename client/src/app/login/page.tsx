'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { COUNTRIES } from '@/types/countries';

export default function AuthPage() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { address } = useAccount();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSignupForm, setShowSignupForm] = useState(false);
  const [isCheckingAccount, setIsCheckingAccount] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    username: '',
    country: ''
  });
  
  // Username validation state
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');

  // Form validation
  const isFormValid = formData.username.length >= 3 && 
                     usernameStatus === 'available' && 
                     formData.country !== '' && 
                     authenticated && 
                     address;

  // Check for existing user when wallet connects from "Connect Existing Wallet" button
  useEffect(() => {
    if (authenticated && address && isCheckingAccount) {
      checkExistingUser();
    } else if (authenticated && !address && isCheckingAccount) {
      const timeout = setTimeout(() => {
        if (authenticated && !address) {
          setError('Connected but unable to get wallet address. Please try again.');
          setIsLoading(false);
          setIsCheckingAccount(false);
        }
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [authenticated, address, isCheckingAccount]);

  // Debounced username checking
  useEffect(() => {
    if (formData.username.length >= 3 && usernameStatus === 'idle') {
      const timeoutId = setTimeout(() => {
        checkUsernameAvailability(formData.username);
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [formData.username, usernameStatus]);

  const checkExistingUser = async () => {
    if (!address) return;
    
    try {
      const response = await fetch(`/api/users?walletAddress=${address}`);
      const data = await response.json();
      
      if (data.user && data.user.username) {
        // User exists with username, redirect to home
        router.push('/');
      } else if (data.user && !data.user.username) {
        // User exists but has no username - disconnect wallet and show error
        console.log('User found but no username - disconnecting wallet');
        logout();
        setError('Account found but incomplete. Please reconnect and complete signup.');
        setIsCheckingAccount(false);
        setIsLoading(false);
        setShowSignupForm(false);
      } else {
        // No user found with this wallet, go to signup with wallet connected
        setIsCheckingAccount(false);
        setIsLoading(false);
        setShowSignupForm(true);
        setError(''); // Clear any previous errors
      }
    } catch (error) {
      console.error('Error checking user:', error);
      // On error, go to signup with wallet connected
      setIsCheckingAccount(false);
      setIsLoading(false);
      setShowSignupForm(true);
      setError('Error checking account. Please complete signup to continue.');
    }
  };

  const checkUsernameAvailability = async (username: string) => {
    console.log('Checking username:', username, 'length:', username.length);
    
    if (!username || username.length < 3) {
      console.log('Username too short');
      setUsernameStatus('invalid');
      return;
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    const isValid = usernameRegex.test(username);
    console.log('Username regex test:', username, 'result:', isValid);
    
    if (!isValid) {
      console.log('Username failed regex validation');
      setUsernameStatus('invalid');
      return;
    }

    setUsernameStatus('checking');
    
    try {
      const response = await fetch(`/api/users/check-username?username=${encodeURIComponent(username)}`);
      const data = await response.json();
      
      if (response.ok) {
        setUsernameStatus(data.available ? 'available' : 'taken');
      } else {
        setUsernameStatus('invalid');
      }
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameStatus('invalid');
    }
  };

  const handleConnectExistingWallet = async () => {
    setIsLoading(true);
    setIsCheckingAccount(true);
    setError('');
    
    try {
      await login();
      // Login succeeded, user check will happen in useEffect
    } catch (error) {
      console.error('Login error:', error);
      setError(`Failed to connect wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
      setIsCheckingAccount(false);
    }
  };

  const handleConnectWalletForSignup = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      await login();
      // Login succeeded, don't check for existing user - just reset loading
      setIsLoading(false);
    } catch (error) {
      console.error('Login error:', error);
      setError(`Failed to connect wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  const handleDisconnectWallet = () => {
    logout();
    setFormData({ username: '', country: '' });
    setUsernameStatus('idle');
    setError('');
    setIsLoading(false);
    setIsCheckingAccount(false);
  };

  const handleSignup = async () => {
    if (!address || !formData.username || !formData.country) {
      setError('Username and country are required');
      return;
    }

    if (usernameStatus !== 'available') {
      setError('Please choose an available username');
      return;
    }

    setIsLoading(true);
    setError('');

    // Skip the double-check since we'll handle conflicts in the API
    // The API will return specific error messages for username conflicts

    try {
      const userData = {
        walletAddress: address,
        username: formData.username,
        displayName: formData.username, // Use username as display name
        country: formData.country
      };

      console.log('Attempting to create user with data:', userData);
      console.log('Current wallet address:', address);
      
      // Debug: Check what user exists with this wallet and username
      try {
        const debugResponse = await fetch(`/api/debug-user?walletAddress=${address}`);
        const debugData = await debugResponse.json();
        console.log('Debug - existing user with wallet:', debugData);
        
        const usernameCheckResponse = await fetch(`/api/users/check-username?username=${encodeURIComponent(formData.username)}`);
        const usernameCheckData = await usernameCheckResponse.json();
        console.log('Debug - username availability:', usernameCheckData);
      } catch (debugError) {
        console.error('Debug check failed:', debugError);
      }

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse response as JSON:', jsonError);
        setError('Server returned invalid response');
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        console.error('User creation failed:', {
          status: response.status,
          statusText: response.statusText,
          data: data,
          userData: userData
        });
        
        // Handle specific error cases
        if (response.status === 409) {
          // Conflict - duplicate data
          if (data.error.includes('wallet') && data.error.includes('another account')) {
            // This is a true conflict - wallet is connected to a complete account
            setError('This wallet is already connected to another account. Please disconnect and try signing in instead.');
            setTimeout(() => {
              logout();
              setShowSignupForm(false);
            }, 3000);
          } else if (data.error.includes('username')) {
            setError('This username is already taken. Please choose a different username.');
            setUsernameStatus('taken');
          } else {
            // Generic conflict - show the actual error message
            console.error('Unexpected conflict error:', data.error);
            setError(data.error || 'There was an issue creating your account. Please try again or contact support.');
          }
        } else {
          setError(data.error || `Failed to create account (${response.status})`);
        }
        setIsLoading(false);
        return;
      }

      console.log('User created successfully:', data);
      // Success - small delay then redirect to home to ensure user is saved
      setTimeout(() => {
        router.push('/');
      }, 1000);
    } catch (err) {
      console.error('Signup error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setIsLoading(false);
    }
  };

  // Debug logging
  useEffect(() => {
    console.log('Privy state changed:', { ready, authenticated, address });
  }, [ready, authenticated, address]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading Privy...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black overflow-hidden relative">
      {/* Falling Snow Background - same as homepage */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {Array.from({ length: 80 }, (_, i) => {
          const size = Math.random() * 3 + 1;
          const duration = Math.random() * 15 + 10;
          const delay = Math.random() * 20;
          const opacity = Math.random() * 0.4 + 0.1;
          const drift = Math.random() * 100 - 50;
          const left = Math.random() * 100;
          
          return (
            <div
              key={`snowflake-${i}`}
              className="absolute bg-white rounded-full"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                left: `${left}%`,
                top: '-20px',
                opacity: opacity,
                animation: `snowfall ${duration}s linear infinite`,
                animationDelay: `${delay}s`,
                transform: `translateX(${drift}px)`,
              }}
            />
          );
        })}
      </div>
      
      {/* Blurred background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-red-500/20 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-red-500/20 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/10 rounded-full filter blur-3xl animate-pulse delay-500"></div>
      </div>
      
      <style jsx>{`
        @keyframes snowfall {
          0% {
            transform: translateY(0px);
          }
          100% {
            transform: translateY(calc(100vh + 40px));
          }
        }
      `}</style>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-6xl w-full"
        >
          {/* Logo/Title */}
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold text-white mb-4">
              Tundra
            </h1>
            <p className="text-gray-400 text-xl">
              Welcome to the ultimate IRL rewards platform
            </p>
          </div>

          {/* Main Card Container */}
          <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Info Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-red-500/10 backdrop-blur-xl border border-red-500/20 rounded-2xl p-8 shadow-2xl"
            >
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-white">Join the Community</h2>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">Earn Real Rewards</h3>
                      <p className="text-gray-300 text-sm">Participate in events, complete challenges, and earn tangible rewards in your local community.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">Local Events</h3>
                      <p className="text-gray-300 text-sm">Discover and attend local events, meetups, and activities happening in your area.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">Build Connections</h3>
                      <p className="text-gray-300 text-sm">Connect with like-minded people in your community and build lasting relationships.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 p-4 bg-black/30 rounded-lg border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    <span className="text-red-400 font-semibold text-sm">Featured Event</span>
                  </div>
                  <p className="text-white font-bold">Community Winter Meetup</p>
                  <p className="text-gray-400 text-sm">Join local participants • January 15th</p>
                </div>
              </div>
            </motion.div>

            {/* Auth Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl"
            >
            {showSignupForm ? (
              <>
                {/* Signup Form Header */}
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-white mb-2">Create Your Account</h2>
                </div>

                {/* Single Signup Form */}
                <div className="space-y-6">
                  {/* Connect Wallet Section */}
                  {!authenticated && (
                    <div className="space-y-4">
                      <div className="text-center">
                        <p className="text-gray-400 text-sm mb-4">First, connect your crypto wallet</p>
                      </div>
                      
                      <button
                        onClick={handleConnectWalletForSignup}
                        disabled={isLoading}
                        className="w-full bg-red-500 text-white font-bold py-4 px-6 rounded-xl hover:bg-red-600 transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        {isLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Connecting...
                          </span>
                        ) : (
                          'Connect Wallet'
                        )}
                      </button>
                    </div>
                  )}

                  {/* Wallet Connected Status */}
                  {authenticated && address && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <p className="text-green-400 text-sm">
                            Wallet connected: {address.slice(0, 6)}...{address.slice(-4)}
                          </p>
                        </div>
                        <button
                          onClick={handleDisconnectWallet}
                          className="text-green-400 hover:text-green-300 text-sm underline transition-colors"
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Username Field */}
                  <div className="space-y-2">
                    <label className="block text-white font-medium mb-2">Choose Username</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => {
                          const newUsername = e.target.value;
                          setFormData({ ...formData, username: newUsername });
                          setUsernameStatus('idle');
                        }}
                        className={`w-full px-4 py-3 pr-12 bg-white/10 border rounded-xl text-white placeholder-gray-400 focus:outline-none transition-colors ${
                          usernameStatus === 'available' ? 'border-green-500' :
                          usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'border-red-500' :
                          'border-white/20 focus:border-red-500'
                        }`}
                        placeholder="Enter username"
                        minLength={3}
                        maxLength={20}
                        pattern="[a-zA-Z0-9_]+"
                        disabled={!authenticated}
                      />
                      
                      {/* Status indicator */}
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        {usernameStatus === 'checking' && (
                          <svg className="animate-spin h-5 w-5 text-gray-400" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        )}
                        {usernameStatus === 'available' && (
                          <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                          <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </div>
                    </div>
                    
                    {/* Status message */}
                    <div>
                      {usernameStatus === 'checking' && (
                        <p className="text-xs text-gray-400">Checking availability...</p>
                      )}
                      {usernameStatus === 'available' && (
                        <p className="text-xs text-green-400">Username is available!</p>
                      )}
                      {usernameStatus === 'taken' && (
                        <p className="text-xs text-red-400">Username is already taken</p>
                      )}
                      {usernameStatus === 'invalid' && (
                        <p className="text-xs text-red-400">3-20 characters, letters, numbers, and underscores only</p>
                      )}
                      {usernameStatus === 'idle' && (
                        <p className="text-xs text-gray-400">3-20 characters, letters, numbers, and underscores only</p>
                      )}
                    </div>
                  </div>

                  {/* Country Field */}
                  <div className="space-y-2">
                    <label className="block text-white font-medium mb-2">Select Country</label>
                    <select
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-4 py-3 bg-black/80 border border-white/20 rounded-xl text-white focus:outline-none focus:border-red-500 transition-colors"
                      disabled={!authenticated}
                    >
                      <option value="" className="bg-black text-gray-400">Select your country</option>
                      {COUNTRIES.map((country) => (
                        <option key={country.name} value={country.name} className="bg-black text-white">
                          {country.flag} {country.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400">Note: Country cannot be changed later</p>
                  </div>

                  {/* Error Display */}
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                      <p className="text-red-400 text-sm">{error}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowSignupForm(false);
                        setFormData({ username: '', country: '' });
                        setUsernameStatus('idle');
                        setError('');
                      }}
                      className="flex-1 bg-white/10 text-white font-bold py-3 px-6 rounded-xl hover:bg-white/20 transition-all duration-200"
                    >
                      Back
                    </button>
                    
                    <button
                      onClick={handleSignup}
                      disabled={isLoading || !isFormValid}
                      className="flex-1 bg-red-500 text-white font-bold py-3 px-6 rounded-xl hover:bg-red-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Creating Account...' : 'Create Account'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Initial Options */}
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-white mb-3">Welcome Back</h2>
                    <p className="text-gray-400">Sign in to your account or create a new one</p>
                  </div>
                  
                  <div className="space-y-3">
                    <button
                      onClick={handleConnectExistingWallet}
                      disabled={isLoading}
                      className="w-full bg-red-500 text-white font-bold py-5 px-6 rounded-xl hover:bg-red-600 transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {isLoading && isCheckingAccount ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Checking account...
                        </span>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                          </svg>
                          Sign In
                        </div>
                      )}
                    </button>
                    <p className="text-gray-400 text-sm text-center">Already have an account? Sign in with your wallet</p>
                  </div>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/20"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-black text-gray-400">or</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <button
                      onClick={() => setShowSignupForm(true)}
                      className="w-full bg-white/10 border border-white/20 text-white font-bold py-5 px-6 rounded-xl hover:bg-white/20 hover:border-white/30 transition-all duration-200"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        Sign Up
                      </div>
                    </button>
                    <p className="text-gray-400 text-sm text-center">New to Tundra? Create your account to get started</p>
                  </div>
                </div>


              </>
            )}
            </motion.div>
          </div>

          {/* Terms */}
          <p className="text-gray-500 text-xs text-center mt-8">
            By connecting, you agree to our Terms of Service and Privacy Policy
          </p>

          {/* Additional Info */}
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Powered by Avalanche • Built with 🐻‍❄️ by{' '}
              <a 
                href="https://x.com/isbjornDAO" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-300 transition-colors underline"
              >
                Isbjorn
              </a>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}