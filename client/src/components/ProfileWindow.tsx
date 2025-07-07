'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { useProfile } from '@/hooks/useProfile';

interface ProfileWindowProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress?: string;
  displayName?: string;
  openAccountModal?: () => void;
  onProfileUpdate?: (displayName: string, photo?: string) => void;
}

// Mock user data - replace with actual API calls
const mockUserData = {
  playerName: 'Anonymous Player',
  level: 12,
  xp: 2340,
  xpToNextLevel: 3000,
  totalPrizesMoney: 1850,
  wins: 3,
  totalTournaments: 8,
  winRate: 38,
  joinDate: '2024-01-15',
  lastActive: '2 hours ago',
  trophies: [
    { id: '1', name: 'First Win', icon: '🥇', date: '2024-01-15', description: 'Won your first tournament match' },
    { id: '2', name: 'Top 3 Finish', icon: '🥉', date: '2024-01-20', description: 'Finished in top 3 of a tournament' },
    { id: '3', name: 'Prize Money', icon: '💰', date: '2024-02-01', description: 'Earned your first prize money' },
    { id: '4', name: 'Team Player', icon: '🤝', date: '2024-02-05', description: 'Completed 5 team matches' },
    { id: '5', name: 'Consistent', icon: '⚡', date: '2024-02-10', description: 'Played 10 matches in a row' },
    { id: '6', name: 'Rising Star', icon: '🌟', date: '2024-02-15', description: 'Reached level 10' }
  ],
  recentActivity: [
    { id: '1', type: 'match', description: 'Won match vs Shadow Clan', timestamp: '2 hours ago' },
    { id: '2', type: 'achievement', description: 'Earned "Team Player" badge', timestamp: '1 day ago' },
    { id: '3', type: 'tournament', description: 'Registered for CS2 Tournament', timestamp: '2 days ago' },
    { id: '4', type: 'match', description: 'Lost match vs Thunder Squad', timestamp: '3 days ago' }
  ]
};

export function ProfileWindow({ isOpen, onClose, walletAddress, displayName, openAccountModal, onProfileUpdate }: ProfileWindowProps) {
  const { data: userData, isLoading, error } = usePlayerProfile(walletAddress, displayName);
  const {
    profile,
    isEditing,
    editData,
    startEdit,
    cancelEdit,
    saveEdit,
    updateEditData,
    isSaving,
    saveError
  } = useProfile(walletAddress);
  const [profilePhoto, setProfilePhoto] = useState<string>('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'activity'>('overview');
  
  // Use mock data if no wallet address or while loading
  const profileData = userData || mockUserData;
  
  // Calculate XP progress
  const xpProgress = (profileData.xp / profileData.xpToNextLevel) * 100;

  const handleSave = async () => {
    try {
      await saveEdit();
      // Notify parent component of profile update
      if (onProfileUpdate) {
        onProfileUpdate(editData.displayName || '', profilePhoto);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadingPhoto(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setProfilePhoto(result);
        setUploadingPhoto(false);
        // TODO: Upload to backend storage
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'achievements':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white">Achievements</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profileData.trophies.map((trophy) => (
                <div key={trophy.id} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{trophy.icon}</div>
                    <div className="flex-1">
                      <h4 className="text-white font-medium">{trophy.name}</h4>
                      <p className="text-gray-400 text-sm mt-1">{trophy.description}</p>
                      <p className="text-gray-500 text-xs mt-2">{new Date(trophy.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'activity':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white">Recent Activity</h3>
            <div className="space-y-3">
              {profileData.recentActivity.map((activity) => (
                <div key={activity.id} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-gray-300">{activity.description}</p>
                      <p className="text-gray-500 text-sm mt-1">{activity.timestamp}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      
      default: // overview
        return (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-800/50 rounded-lg p-4 text-center border border-gray-700">
                  <div className="text-2xl font-bold text-white">{profileData.totalTournaments}</div>
                  <div className="text-gray-400 text-sm">Tournaments</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4 text-center border border-gray-700">
                  <div className="text-2xl font-bold text-green-400">{profileData.wins}</div>
                  <div className="text-gray-400 text-sm">Wins</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4 text-center border border-gray-700">
                  <div className="text-2xl font-bold text-blue-400">{profileData.winRate}%</div>
                  <div className="text-gray-400 text-sm">Win Rate</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4 text-center border border-gray-700">
                  <div className="text-2xl font-bold text-yellow-400">${profileData.totalPrizesMoney}</div>
                  <div className="text-gray-400 text-sm">Earnings</div>
                </div>
              </div>
            </div>

            {/* Recent Achievements */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Recent Achievements</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {profileData.trophies.slice(0, 3).map((trophy) => (
                  <div key={trophy.id} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700 text-center">
                    <div className="text-2xl mb-2">{trophy.icon}</div>
                    <div className="text-white text-sm font-medium">{trophy.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black/90 backdrop-blur-sm overflow-auto"
      style={{ zIndex: 999999 }}
    >
      {/* Tundra Navbar */}
      <header className="border-b border-white/[0.1] bg-black/50 backdrop-blur-sm">
        <div className="container-main py-6 flex justify-between items-center">
          <div className="flex items-center space-x-8">
            <button 
              onClick={onClose}
              className="text-xl font-bold text-white hover:text-gray-300 transition-colors"
            >
              Tundra
            </button>
            <nav className="flex space-x-6">
              <button
                onClick={onClose}
                className="nav-link"
              >
                Back to Home
              </button>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <a
              href="https://docs.tundra.co.nz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </a>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>
      </header>
      
      <div className="min-h-screen bg-gray-900">
        {/* Cover Photo & Profile Section */}
        <div className="relative">
          {/* Cover Photo */}
          <div className="h-64 bg-gradient-to-r from-orange-600/80 to-red-600/80 relative">
            <div className="absolute inset-0 bg-black/20"></div>
          </div>
          
          {/* Profile Info Overlay */}
          <div className="relative -mt-20 px-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
                {/* Profile Picture */}
                <div className="relative">
                  {profilePhoto || profile?.avatar ? (
                    <img 
                      src={profilePhoto || profile?.avatar} 
                      alt="Profile" 
                      className="w-40 h-40 rounded-full object-cover border-4 border-white shadow-xl"
                    />
                  ) : (
                    <div className="w-40 h-40 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-6xl border-4 border-white shadow-xl">
                      {(profile?.displayName || displayName)?.charAt(0) || walletAddress?.slice(2, 3) || '?'}
                    </div>
                  )}
                  {isEditing && (
                    <label className="absolute bottom-2 right-2 bg-orange-500 hover:bg-orange-600 rounded-full p-3 cursor-pointer transition-colors shadow-lg">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handlePhotoUpload}
                        className="hidden" 
                      />
                    </label>
                  )}
                  {uploadingPhoto && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                      <div className="text-white">Uploading...</div>
                    </div>
                  )}
                </div>

                {/* Profile Details */}
                <div className="flex-1 bg-gray-800/80 backdrop-blur-sm rounded-lg p-6 border border-gray-700 shadow-xl">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-400 text-sm mb-1">Display Name</label>
                        <input
                          type="text"
                          value={editData.displayName || ''}
                          onChange={(e) => updateEditData('displayName', e.target.value)}
                          className="bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white text-xl font-bold w-full"
                          placeholder="Display Name"
                          maxLength={50}
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-sm mb-1">Bio</label>
                        <textarea
                          value={editData.bio || ''}
                          onChange={(e) => updateEditData('bio', e.target.value)}
                          className="bg-gray-700 border border-gray-600 rounded px-4 py-2 text-gray-300 w-full resize-none"
                          placeholder="Tell us about yourself..."
                          rows={3}
                          maxLength={500}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-gray-400 text-sm mb-1">Clan</label>
                          <input
                            type="text"
                            value={editData.clan || ''}
                            onChange={(e) => updateEditData('clan', e.target.value)}
                            className="bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white w-full"
                            placeholder="Your clan name"
                            maxLength={50}
                          />
                        </div>
                        <div>
                          <label className="block text-gray-400 text-sm mb-1">Country</label>
                          <input
                            type="text"
                            value={editData.country || ''}
                            onChange={(e) => updateEditData('country', e.target.value)}
                            className="bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white w-full"
                            placeholder="e.g. United States"
                            maxLength={50}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h1 className="text-3xl font-bold text-white">
                        {profile?.displayName || displayName || profileData.playerName}
                      </h1>
                      {profile?.bio && (
                        <p className="text-gray-300 mt-2">{profile.bio}</p>
                      )}
                      <div className="flex items-center gap-4 mt-4 text-sm">
                        {profile?.clan && (
                          <span className="text-orange-400 font-medium">{profile.clan}</span>
                        )}
                        {profile?.country && (
                          <span className="text-gray-400">{profile.country}</span>
                        )}
                        <span className="text-gray-500">Joined {new Date(profileData.joinDate).toLocaleDateString()}</span>
                        <span className="text-gray-500">Active {profileData.lastActive}</span>
                      </div>
                      <div className="mt-4">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-blue-400">Level {profileData.level}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-green-400">{profileData.xp} XP</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${xpProgress}%` }}
                          />
                        </div>
                      </div>
                    </>
                  )}
                  
                  <div className="flex items-center gap-3 mt-6">
                    {isEditing ? (
                      <>
                        <button 
                          onClick={handleSave}
                          disabled={isSaving}
                          className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                        >
                          {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button 
                          onClick={cancelEdit}
                          disabled={isSaving}
                          className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      walletAddress && (
                        <button 
                          onClick={startEdit}
                          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                        >
                          Edit Profile
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="px-6 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Tab Navigation */}
            <div className="border-b border-gray-700 mb-6">
              <nav className="flex space-x-8">
                {[
                  { id: 'overview', label: 'Overview', icon: '📊' },
                  { id: 'achievements', label: 'Achievements', icon: '🏆' },
                  { id: 'activity', label: 'Activity', icon: '📈' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-orange-500 text-orange-400'
                        : 'border-transparent text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="bg-gray-800/30 rounded-lg p-6 border border-gray-700">
              {renderTabContent()}
            </div>

            {/* Error Messages */}
            {error && (
              <div className="mt-6 bg-red-500/20 border border-red-500/40 rounded-lg p-4 text-red-400 text-sm">
                Failed to load player data. Showing offline data.
              </div>
            )}

            {saveError && (
              <div className="mt-6 bg-red-500/20 border border-red-500/40 rounded-lg p-4 text-red-400 text-sm">
                Error saving profile: {saveError}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Use portal to render modal at document body level
  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}