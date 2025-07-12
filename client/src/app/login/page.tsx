'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { UserSignupModal } from '@/components/UserSignupModal';

export default function AuthPage() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { address } = useAccount();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCheckingAccount, setIsCheckingAccount] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);

  // Check for existing user when wallet connects
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
      } else {
        // No user found with this wallet, show signup modal
        setIsCheckingAccount(false);
        setIsLoading(false);
        setShowSignupModal(true);
        setError(''); // Clear any previous errors
      }
    } catch (error) {
      console.error('Error checking user:', error);
      // On error, show signup modal
      setIsCheckingAccount(false);
      setIsLoading(false);
      setShowSignupModal(true);
      setError('Error checking account. Please complete signup to continue.');
    }
  };

  const handleConnectExistingWallet = async () => {
    if (authenticated) {
      router.push('/');
      return;
    }

    setIsLoading(true);
    setIsCheckingAccount(true);
    setError('');

    try {
      await login();
    } catch (error) {
      console.error('Login error:', error);
      setError('Failed to connect wallet. Please try again.');
      setIsLoading(false);
      setIsCheckingAccount(false);
    }
  };

  const handleSignUp = async () => {
    if (!authenticated) {
      setIsLoading(true);
      try {
        await login();
        // After login, show signup modal
        setShowSignupModal(true);
      } catch (error) {
        console.error('Login error:', error);
        setError('Failed to connect wallet');
      } finally {
        setIsLoading(false);
      }
    } else {
      setShowSignupModal(true);
    }
  };

  // Show error messages
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-red-950/20 to-black flex items-center justify-center relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 -left-40 w-96 h-96 bg-red-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-20 -right-40 w-96 h-96 bg-red-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Snow Effect */}
      <div className="absolute inset-0 z-10">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute animate-fall"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${10 + Math.random() * 10}s`
            }}
          >
            <div className="w-1 h-1 bg-white/30 rounded-full" />
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-20 w-full max-w-6xl mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h1 className="text-7xl font-bold text-white mb-4 tracking-tight">
            Tundra
          </h1>
          <p className="text-xl text-gray-400">Global Tournament Platform</p>
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto mb-6"
          >
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-red-400 text-center">{error}</p>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Info Panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Join the Competition</h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Win Prizes</h3>
                  <p className="text-gray-400 text-sm">Compete in tournaments and earn rewards</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Join a Clan</h3>
                  <p className="text-gray-400 text-sm">Team up with other players</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Powered by Team1</h3>
                  <p className="text-gray-400 text-sm">Built on Avalanche blockchain</p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 bg-white/5 rounded-lg">
              <p className="text-gray-400 text-sm">
                Connect your wallet to get started. New users will need to create a profile.
              </p>
            </div>
          </motion.div>

          {/* Auth Options */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl"
          >
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-3">Welcome to Tundra</h2>
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
                  onClick={handleSignUp}
                  disabled={isLoading}
                  className="w-full bg-white/10 border border-white/20 text-white font-bold py-5 px-6 rounded-xl hover:bg-white/20 hover:border-white/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Connecting...
                    </span>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      Sign Up
                    </div>
                  )}
                </button>
                <p className="text-gray-400 text-sm text-center">New to Tundra? Create your account to get started</p>
              </div>
            </div>
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
      </div>
      
      {/* Signup Modal */}
      {authenticated && address && (
        <UserSignupModal 
          isOpen={showSignupModal}
          walletAddress={address}
          onSignupComplete={(user) => {
            console.log('Signup completed:', user);
            setShowSignupModal(false);
            router.push('/');
          }}
          onClose={() => {
            // Don't allow closing without signup
            console.log('Cannot close signup modal - must complete signup');
          }}
        />
      )}

      <style jsx>{`
        @keyframes fall {
          0% {
            transform: translateY(-10vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(360deg);
            opacity: 0;
          }
        }
        .animate-fall {
          animation: fall linear infinite;
        }
      `}</style>
    </div>
  );
}