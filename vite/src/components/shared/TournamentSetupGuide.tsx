import React, { useState } from 'react';
import {
    CheckCircleIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';

interface TournamentSetupGuideProps {
    currentStep?: 'wallet' | 'profile' | 'clan' | 'tournament' | 'bracket' | 'results';
    onClose?: () => void;
}

const TournamentSetupGuide: React.FC<TournamentSetupGuideProps> = ({
    currentStep = 'wallet',
    onClose
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const steps = [
        {
            id: 'wallet',
            title: '1. Connect Wallet',
            description: 'Connect your wallet using Privy to get started',
            status: 'completed' as const,
            details: [
                'Click "Connect Wallet" in the top right',
                'Choose your preferred wallet (MetaMask, WalletConnect, etc.)',
                'Approve the connection request',
                'Your wallet address will be displayed once connected'
            ]
        },
        {
            id: 'profile',
            title: '2. Create Profile',
            description: 'Set up your gaming profile with username and details',
            status: 'current' as const,
            details: [
                'Enter a unique username for your profile',
                'Add your display name and bio',
                'Select your country/region',
                'Upload an avatar (optional)',
                'Your profile will be used across all tournaments'
            ]
        },
        {
            id: 'clan',
            title: '3. Join or Create Clan',
            description: 'Form a team with other players',
            status: 'pending' as const,
            details: [
                'Create a new clan if you\'re a team leader',
                'Or join an existing clan by requesting membership',
                'Clan leaders can manage members and register teams',
                'Each clan has a unique tag and name',
                'Clans can participate in multiple tournaments'
            ]
        },
        {
            id: 'tournament',
            title: '4. Register for Tournament',
            description: 'Choose a game and register your team',
            status: 'pending' as const,
            details: [
                'Browse available tournaments by game',
                'Check tournament details (prize pool, max teams, etc.)',
                'Select your clan members for the team',
                'Confirm registration and wait for tournament to fill',
                'Teams are registered on a first-come, first-served basis'
            ]
        },
        {
            id: 'bracket',
            title: '5. Tournament Bracket',
            description: 'Compete in bracket matches with scheduling',
            status: 'pending' as const,
            details: [
                'Bracket is generated when tournament is full',
                'Coordinate match times with opposing teams',
                'Both team leaders must approve match schedules',
                'Play your matches at the agreed times',
                'Advance through quarterfinals, semifinals, and finals'
            ]
        },
        {
            id: 'results',
            title: '6. Submit Results',
            description: 'Report match outcomes with dual verification',
            status: 'pending' as const,
            details: [
                'Both team leaders submit match results',
                'Results must match to be officially recorded',
                'Include final scores and any relevant notes',
                'Winners advance to the next round',
                'Tournament champions receive prizes and XP'
            ]
        }
    ];

    const getStepStatus = (stepId: string) => {
        const stepIndex = steps.findIndex(s => s.id === stepId);
        const currentIndex = steps.findIndex(s => s.id === currentStep);

        if (stepIndex < currentIndex) return 'completed';
        if (stepIndex === currentIndex) return 'current';
        return 'pending';
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
            case 'current':
                return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />;
            default:
                return <InformationCircleIcon className="w-5 h-5 text-gray-400" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'border-green-400 bg-green-400/10';
            case 'current':
                return 'border-yellow-400 bg-yellow-400/10';
            default:
                return 'border-gray-600 bg-gray-600/10';
        }
    };

    if (!isExpanded) {
        return (
            <div className="fixed bottom-4 right-4 z-50">
                <button
                    onClick={() => setIsExpanded(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-colors"
                >
                    <InformationCircleIcon className="w-5 h-5" />
                    Tournament Setup Guide
                </button>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-white/20 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Tournament Setup Guide</h2>
                        <p className="text-gray-400 mt-1">Complete these steps to participate in tournaments</p>
                    </div>
                    <button
                        onClick={() => setIsExpanded(false)}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {steps.map((step, index) => {
                        const status = getStepStatus(step.id);
                        return (
                            <div
                                key={step.id}
                                className={`border rounded-lg p-4 transition-all ${getStatusColor(status)}`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 mt-1">
                                        {getStatusIcon(status)}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-white mb-2">
                                            {step.title}
                                        </h3>
                                        <p className="text-gray-300 mb-3">
                                            {step.description}
                                        </p>
                                        <details className="group">
                                            <summary className="cursor-pointer text-blue-400 hover:text-blue-300 text-sm font-medium">
                                                View detailed steps
                                            </summary>
                                            <ul className="mt-3 space-y-2 text-sm text-gray-300 ml-4">
                                                {step.details.map((detail, i) => (
                                                    <li key={i} className="flex items-start gap-2">
                                                        <span className="text-blue-400 mt-1">•</span>
                                                        <span>{detail}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </details>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="p-6 border-t border-white/10 bg-gray-800/50">
                    <div className="flex items-center gap-3 text-sm text-gray-300">
                        <div className="flex items-center gap-2">
                            <CheckCircleIcon className="w-4 h-4 text-green-400" />
                            <span>Completed</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <ExclamationTriangleIcon className="w-4 h-4 text-yellow-400" />
                            <span>Current Step</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <InformationCircleIcon className="w-4 h-4 text-gray-400" />
                            <span>Upcoming</span>
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        Need help? Check the documentation or contact support for assistance.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TournamentSetupGuide;