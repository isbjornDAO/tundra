import React, { useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useAccount, useChainId, useSwitchChain, useBalance, useDisconnect } from 'wagmi';
import { FaChevronDown, FaTimes, FaCopy, FaExternalLinkAlt, FaSignOutAlt, FaWallet } from 'react-icons/fa';
import { avalanche, avalancheFuji } from 'wagmi/chains';

// Modal backdrop component
const ModalBackdrop = ({ isOpen, onClose, children }: {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 relative"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    <FaTimes />
                </button>
                {children}
            </div>
        </div>
    );
};

// Chain Modal Component
const ChainModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const chainId = useChainId();
    const { switchChain, isPending } = useSwitchChain();

    const supportedChains = [
        {
            ...avalanche,
            icon: 'https://lfj.gg/static/media/avalanche.7c81486190237e87e238c029fd746008.svg',
            isTestnet: false
        },
        {
            ...avalancheFuji,
            icon: 'https://static.debank.com/image/avax_token/logo_url/0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7/753d82f0137617110f8dec56309b4065.png',
            isTestnet: true
        }
    ];

    const handleSwitchChain = async (targetChainId: number) => {
        try {
            await switchChain({ chainId: targetChainId });
            onClose();
        } catch (error) {
            console.error('Failed to switch chain:', error);
        }
    };

    return (
        <ModalBackdrop isOpen={isOpen} onClose={onClose}>
            <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                    Select Network
                </h2>
                <div className="space-y-2">
                    {supportedChains.map((chain) => {
                        const isCurrentChain = chainId === chain.id;
                        return (
                            <button
                                key={chain.id}
                                onClick={() => handleSwitchChain(chain.id)}
                                disabled={isCurrentChain || isPending}
                                className={`w-full p-3 rounded-lg flex items-center gap-3 text-left transition-colors ${isCurrentChain
                                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                                    } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <img
                                    src={chain.icon}
                                    alt={chain.name}
                                    className="w-8 h-8 rounded-full"
                                />
                                <div className="flex-1">
                                    <div className="font-medium">{chain.name}</div>
                                    {chain.isTestnet && (
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            Testnet
                                        </div>
                                    )}
                                </div>
                                {isCurrentChain && (
                                    <div className="text-blue-600 dark:text-blue-400 text-sm font-medium">
                                        Connected
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </ModalBackdrop>
    );
};

// Account Modal Component
const AccountModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const { user, logout } = usePrivy();
    const { address } = useAccount();
    const chainId = useChainId();
    const { disconnect } = useDisconnect();
    const [copied, setCopied] = useState(false);

    const { data: balance } = useBalance({
        address: address as `0x${string}`,
    });

    const currentAddress = user?.wallet?.address || address;

    const getCurrentChain = () => {
        if (chainId === avalanche.id) return avalanche;
        if (chainId === avalancheFuji.id) return avalancheFuji;
        return null;
    };

    const currentChain = getCurrentChain();

    const copyAddress = async () => {
        if (currentAddress) {
            await navigator.clipboard.writeText(currentAddress);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const openExplorer = () => {
        if (currentAddress && currentChain) {
            const explorerUrl = currentChain.blockExplorers?.default?.url;
            if (explorerUrl) {
                window.open(`${explorerUrl}/address/${currentAddress}`, '_blank');
            }
        }
    };

    const handleDisconnect = async () => {
        await logout();
        disconnect();
        onClose();
    };

    const formatAddress = (addr: string) => {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    return (
        <ModalBackdrop isOpen={isOpen} onClose={onClose}>
            <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                    Account
                </h2>

                {/* Address section */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Address</span>
                        <div className="flex gap-2">
                            <button
                                onClick={copyAddress}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                                title="Copy address"
                            >
                                <FaCopy />
                            </button>
                            <button
                                onClick={openExplorer}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                                title="View on explorer"
                            >
                                <FaExternalLinkAlt />
                            </button>
                        </div>
                    </div>
                    <div className="font-mono text-sm text-gray-900 dark:text-white">
                        {currentAddress ? formatAddress(currentAddress) : 'Unknown'}
                    </div>
                    {copied && (
                        <div className="text-green-600 dark:text-green-400 text-xs mt-1">
                            Copied to clipboard!
                        </div>
                    )}
                </div>

                {/* Balance section */}
                {balance && (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                        <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Balance</div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                            {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
                        </div>
                    </div>
                )}

                {/* Network section */}
                {currentChain && (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                        <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Network</div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                            {currentChain.name}
                        </div>
                    </div>
                )}

                {/* Disconnect button */}
                <button
                    onClick={handleDisconnect}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2"
                >
                    <FaSignOutAlt />
                    Disconnect
                </button>
            </div>
        </ModalBackdrop>
    );
};

// Main ConnectButton Component
export const ConnectButton = () => {
    const { authenticated, ready, login, user } = usePrivy();
    const { wallets } = useWallets();
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const [chainModalOpen, setChainModalOpen] = useState(false);
    const [accountModalOpen, setAccountModalOpen] = useState(false);

    // Get the current address - prioritize Privy user wallet for embedded wallets
    const currentAddress = user?.wallet?.address || address;

    const { data: balance } = useBalance({
        address: currentAddress as `0x${string}`,
    });

    // Check if user has an embedded wallet
    const hasEmbeddedWallet = user?.wallet?.walletClientType === 'privy';

    // For embedded wallets, we consider them connected if authenticated
    // For external wallets, we need both authenticated and wagmi connected
    const isWalletConnected = authenticated && (hasEmbeddedWallet || isConnected);

    // Get current chain info
    const getCurrentChain = () => {
        if (chainId === avalanche.id) return avalanche;
        if (chainId === avalancheFuji.id) return avalancheFuji;
        return null;
    };

    const currentChain = getCurrentChain();
    const isUnsupportedChain = isWalletConnected && !currentChain;

    // Format address for display
    const formatAddress = (addr: string) => {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    // Get chain icon URL
    const getChainIcon = (chain: typeof avalanche | typeof avalancheFuji) => {
        const icons = {
            [avalanche.id]: 'https://lfj.gg/static/media/avalanche.7c81486190237e87e238c029fd746008.svg',
            [avalancheFuji.id]: 'https://static.debank.com/image/avax_token/logo_url/0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7/753d82f0137617110f8dec56309b4065.png',
        };
        return icons[chain.id];
    };

    // Modal handlers
    const openChainModal = () => setChainModalOpen(true);
    const openAccountModal = () => setAccountModalOpen(true);

    const closeChainModal = () => setChainModalOpen(false);
    const closeAccountModal = () => setAccountModalOpen(false);

    // Direct connect handler
    const handleConnect = async () => {
        await login();
    };

    if (!ready) {
        return (
            <>
                <div
                    style={{
                        opacity: 10,
                        pointerEvents: 'none',
                        userSelect: 'none',
                    }}
                >
                    <button className='connect-wallet-button' disabled>
                        <span className='hidden sm:flex'>Loading...</span>
                        <span className='flex sm:hidden'>...</span>
                    </button>
                </div>
            </>
        );
    }

    // Not connected state - direct connection
    if (!isWalletConnected) {
        return (
            <button onClick={handleConnect} type="button" className='connect-wallet-button'>
                <span className='hidden sm:flex'>Connect Wallet</span>
                <span className='flex sm:hidden'>Connect</span>
            </button>
        );
    }

    // Unsupported network state
    if (isUnsupportedChain) {
        return (
            <>
                <button
                    onClick={openChainModal}
                    type="button"
                    className='connect-wallet-button-invalid-network'
                >
                    <span className='hidden sm:flex'>Invalid Network</span>
                    <span className='flex sm:hidden'>!!!</span>
                    <FaChevronDown />
                </button>
                <ChainModal isOpen={chainModalOpen} onClose={closeChainModal} />
            </>
        );
    }

    // Connected state
    return (
        <>
            <div className='flex flex-row gap-1 sm:gap-2'>
                {/* Chain selector button */}
                <button
                    onClick={openChainModal}
                    style={{ display: 'flex', alignItems: 'center' }}
                    type="button"
                    className='connect-network-switch'
                >
                    <div className='w-[16px] h-[16px] sm:w-[24px] sm:h-[24px] rounded-full overflow-hidden sm:mr-1'>
                        <img
                            alt={currentChain?.name ?? 'Chain icon'}
                            src={getChainIcon(currentChain!)}
                            className='w-[16px] h-[16px] sm:w-[24px] sm:h-[24px]'
                        />
                    </div>
                    <FaChevronDown className='hidden sm:flex' />
                </button>

                {/* Account button */}
                <button
                    onClick={openAccountModal}
                    type="button"
                    className="connect-account-display"
                >
                    <span className='hidden md:flex'>
                        {balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol} ` : ''}
                    </span>
                    <div className="connect-account-address">
                        <span>
                            {currentAddress ? formatAddress(currentAddress) : 'Unknown'}
                        </span>
                        <FaChevronDown className='hidden sm:flex' />
                    </div>
                </button>
            </div>

            {/* Modals */}
            <ChainModal isOpen={chainModalOpen} onClose={closeChainModal} />
            <AccountModal isOpen={accountModalOpen} onClose={closeAccountModal} />
        </>
    );
};

export default ConnectButton;