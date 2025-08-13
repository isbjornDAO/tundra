import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { COUNTRIES } from '@/lib/constants';
import { usePrivy } from '@privy-io/react-auth';
import { useUserContext } from '@/context/AuthContext';

interface LoginDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

const LoginDialog = ({ isOpen, onClose }: LoginDialogProps) => {
    const { ready, authenticated, login, user: privyUser, logout } = usePrivy();
    const { address, createUser } = useUserContext();

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showSignupForm, setShowSignupForm] = useState(false);
    const [checkingUser, setCheckingUser] = useState(false);

    // Signup form state
    const [formData, setFormData] = useState({
        username: '',
        country: ''
    });
    const [signupLoading, setSignupLoading] = useState(false);
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
    const [checkingUsername, setCheckingUsername] = useState(false);

    // Reset state when dialog opens/closes
    useEffect(() => {
        if (isOpen) {
            setError('');
            setIsLoading(false);
            setFormData({ username: '', country: '' });
            setUsernameAvailable(null);
            setCheckingUsername(false);
            setSignupLoading(false);
        }
    }, [isOpen]);

    // Check if user exists when wallet connects - same logic as original
    useEffect(() => {
        const checkUser = async () => {
            const walletAddress = address || privyUser?.wallet?.address;
            if (!walletAddress || checkingUser) return;

            setCheckingUser(true);
            try {
                const response = await fetch(`/api/users?walletAddress=${walletAddress}`);
                const data = await response.json();

                if (data.user && data.user.username && data.user.country) {
                    // User exists, close dialog
                    onClose();
                } else {
                    // User doesn't exist, show signup form
                    setShowSignupForm(true);
                }
            } catch (error) {
                console.error('Error checking user:', error);
                setShowSignupForm(true);
            } finally {
                setCheckingUser(false);
            }
        };

        if (ready && authenticated && (address || privyUser?.wallet?.address)) {
            checkUser();
        }
    }, [ready, authenticated, address, privyUser?.wallet?.address, checkingUser, onClose]);

    // Check username availability - exact same logic as original
    useEffect(() => {
        const checkUsername = async () => {
            if (!formData.username || formData.username.length < 3) {
                setUsernameAvailable(null);
                return;
            }

            setCheckingUsername(true);
            try {
                const response = await fetch(`/api/users/check-username?username=${encodeURIComponent(formData.username)}`);
                const data = await response.json();

                if (response.ok) {
                    setUsernameAvailable(data.available);
                    setError(data.available ? '' : 'Username is already taken');
                } else {
                    setError(data.error || 'Failed to check username');
                    setUsernameAvailable(false);
                }
            } catch (err) {
                console.error('Error checking username:', err);
            } finally {
                setCheckingUsername(false);
            }
        };

        const timer = setTimeout(checkUsername, 500);
        return () => clearTimeout(timer);
    }, [formData.username]);

    // Same handleSignupSubmit logic as original
    const handleSignupSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!usernameAvailable || checkingUsername) return;

        const walletAddress = address || privyUser?.wallet?.address;
        if (!walletAddress) return;

        setSignupLoading(true);
        setError('');

        try {
            await createUser({
                walletAddress,
                username: formData.username.toLowerCase(),
                country: formData.country
            } as any);

            // Success - close dialog
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSignupLoading(false);
        }
    };

    // Same handleLogin logic as original
    const handleLogin = async (isSignUp = false) => {
        console.log('handleLogin called', { ready, authenticated, isSignUp });

        if (!ready) {
            console.log('Privy not ready yet');
            return;
        }

        if (authenticated) {
            console.log('User already authenticated');
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            console.log('Calling Privy login...');
            await login();
            console.log('Privy login completed');
            // The useEffect above will handle the rest - checking user profile, showing signup modal, etc.
        } catch (error: any) {
            console.error('Login error:', error);
            if (error?.message?.includes('User exited') || error?.message?.includes('closed')) {
                setError('Wallet connection cancelled. Please try again.');
            } else {
                setError('Unable to connect wallet. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />

                    {/* Dialog */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="bg-gradient-to-br from-black via-red-950/20 to-black border border-white/10 rounded-2xl p-8 shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto relative backdrop-blur-xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Background Elements */}
                            <div className="absolute inset-0 rounded-2xl overflow-hidden">
                                <div className="absolute top-10 -left-20 w-48 h-48 bg-red-500/10 rounded-full blur-[60px]" />
                                <div className="absolute bottom-10 -right-20 w-48 h-48 bg-red-500/10 rounded-full blur-[60px]" />
                            </div>

                            {/* Content */}
                            <div className="relative z-10">
                                {/* Header */}
                                <div className="text-center mb-8">
                                    <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
                                        Tundra
                                    </h1>
                                    <p className="text-sm text-gray-400">Global Tournament Platform</p>
                                </div>

                                {/* Error Message */}
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mb-6"
                                    >
                                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                                            <p className="text-red-400 text-center text-sm">{error}</p>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Main Content */}
                                <div className="space-y-6">
                                    <div className="text-center mb-6">
                                        <h2 className="text-xl font-bold text-white mb-2">Welcome to Tundra</h2>
                                        <p className="text-gray-400 text-sm">
                                            {showSignupForm ? 'Complete your account setup to get started' : 'Sign in to your account or create a new one'}
                                        </p>
                                    </div>

                                    {showSignupForm ? (
                                        <>
                                            {/* Connected wallet info */}
                                            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-green-400 text-xs font-medium">Connected:</span>
                                                    <span className="text-green-400 text-xs font-mono">
                                                        {(address || privyUser?.wallet?.address || '').slice(0, 6)}...{(address || privyUser?.wallet?.address || '').slice(-4)}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        await logout();
                                                        setShowSignupForm(false);
                                                    }}
                                                    className="text-green-400 hover:text-green-300 text-xs font-medium transition-colors"
                                                >
                                                    Disconnect
                                                </button>
                                            </div>

                                            {/* Signup form */}
                                            <form onSubmit={handleSignupSubmit} className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-white mb-2">Username</label>
                                                    <div className="relative">
                                                        <input
                                                            type="text"
                                                            value={formData.username}
                                                            onChange={(e) => {
                                                                const value = e.target.value;
                                                                if (/^[a-zA-Z0-9_]*$/.test(value) || value === '') {
                                                                    setFormData({ ...formData, username: value });
                                                                }
                                                            }}
                                                            className={`w-full px-4 py-3 bg-white/5 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors text-sm ${formData.username.length >= 3 && !checkingUsername
                                                                ? usernameAvailable
                                                                    ? 'border-green-500/50'
                                                                    : 'border-red-500/50'
                                                                : 'border-white/10'
                                                                }`}
                                                            placeholder="Choose a unique username"
                                                            required
                                                            minLength={3}
                                                            maxLength={20}
                                                        />
                                                        {formData.username.length >= 3 && (
                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                                {checkingUsername ? (
                                                                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                                                ) : usernameAvailable ? (
                                                                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                ) : (
                                                                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        3-20 characters, letters, numbers, and underscores only
                                                    </p>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-white mb-2">Country</label>
                                                    <select
                                                        value={formData.country}
                                                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors text-sm"
                                                        required
                                                    >
                                                        <option value="" className="bg-gray-900">Select your country</option>
                                                        {COUNTRIES.map((country) => (
                                                            <option key={country.code} value={country.code} className="bg-gray-900">
                                                                {country.flag} {country.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        Note: Country cannot be changed later
                                                    </p>
                                                </div>

                                                <button
                                                    type="submit"
                                                    className="w-full bg-red-500 text-white font-bold py-3 px-6 rounded-xl hover:bg-red-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                                    disabled={
                                                        signupLoading ||
                                                        !formData.username ||
                                                        !formData.country ||
                                                        checkingUsername ||
                                                        (formData.username.length >= 3 && !usernameAvailable)
                                                    }
                                                >
                                                    {signupLoading ? 'Creating Account...' : 'Create Account'}
                                                </button>
                                            </form>
                                        </>
                                    ) : (
                                        <>
                                            <div className="space-y-3">
                                                <button
                                                    onClick={() => handleLogin(false)}
                                                    disabled={isLoading}
                                                    className="w-full bg-red-500 text-white font-bold py-4 px-6 rounded-xl hover:bg-red-600 transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm"
                                                >
                                                    {isLoading ? (
                                                        <span className="flex items-center justify-center gap-2">
                                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                            </svg>
                                                            Connecting...
                                                        </span>
                                                    ) : (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                                            </svg>
                                                            Sign In
                                                        </div>
                                                    )}
                                                </button>
                                                <p className="text-gray-400 text-xs text-center">Already have an account? Sign in with your wallet</p>
                                            </div>

                                            <div className="relative">
                                                <div className="absolute inset-0 flex items-center">
                                                    <div className="w-full border-t border-white/20"></div>
                                                </div>
                                                <div className="relative flex justify-center text-sm">
                                                    <span className="px-2 bg-gradient-to-br from-black via-red-950/20 to-black text-gray-400 text-xs">or</span>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <button
                                                    onClick={() => handleLogin(true)}
                                                    disabled={isLoading}
                                                    className="w-full bg-white/10 border border-white/20 text-white font-bold py-4 px-6 rounded-xl hover:bg-white/20 hover:border-white/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                                >
                                                    {isLoading ? (
                                                        <span className="flex items-center justify-center gap-2">
                                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                            </svg>
                                                            Connecting...
                                                        </span>
                                                    ) : (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                                            </svg>
                                                            Sign Up
                                                        </div>
                                                    )}
                                                </button>
                                                <p className="text-gray-400 text-xs text-center">New to Tundra? Create your account to get started</p>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Terms */}
                                <p className="text-gray-500 text-xs text-center mt-6">
                                    By connecting, you agree to our Terms of Service and Privacy Policy
                                </p>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};

export default LoginDialog;