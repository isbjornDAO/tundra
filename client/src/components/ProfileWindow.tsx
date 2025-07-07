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
  trophies: [
    { id: '1', name: 'First Win', icon: '🥇', date: '2024-01-15' },
    { id: '2', name: 'Top 3 Finish', icon: '🥉', date: '2024-01-20' },
    { id: '3', name: 'Prize Money', icon: '💰', date: '2024-02-01' }
  ],
  badges: [
    { id: '1', name: 'Early Adopter', icon: '🚀', rarity: 'rare' as const },
    { id: '2', name: 'Team Player', icon: '🤝', rarity: 'common' as const },
    { id: '3', name: 'Consistent', icon: '⚡', rarity: 'epic' as const }
  ]
};

function StatItem({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
      <div className="text-xl">{icon}</div>
      <div>
        <div className="text-gray-400 text-sm">{label}</div>
        <div className="text-white font-semibold">{value}</div>
      </div>
    </div>
  );
}

function TrophyItem({ trophy }: { trophy: { id: string; name: string; icon: string; date: string } }) {
  return (
    <div className="flex items-center gap-3 p-2 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
      <div className="text-2xl">{trophy.icon}</div>
      <div className="flex-1">
        <div className="text-white text-sm font-medium">{trophy.name}</div>
        <div className="text-gray-400 text-xs">{new Date(trophy.date).toLocaleDateString()}</div>
      </div>
    </div>
  );
}

function BadgeItem({ badge }: { badge: { id: string; name: string; icon: string; rarity: 'common' | 'rare' | 'epic' | 'legendary' } }) {
  const getRarityColor = (rarity: typeof badge.rarity) => {
    switch (rarity) {
      case 'common': return 'border-gray-500/40 bg-gray-500/10';
      case 'rare': return 'border-blue-500/40 bg-blue-500/10';
      case 'epic': return 'border-purple-500/40 bg-purple-500/10';
      case 'legendary': return 'border-yellow-500/40 bg-yellow-500/10';
    }
  };

  return (
    <div className={`p-3 rounded-lg border ${getRarityColor(badge.rarity)} text-center hover:scale-105 transition-transform`}>
      <div className="text-2xl mb-1">{badge.icon}</div>
      <div className="text-white text-xs font-medium">{badge.name}</div>
      <div className="text-gray-400 text-xs mt-1 capitalize">{badge.rarity}</div>
    </div>
  );
}

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

  console.log('ProfileWindow rendering with isOpen:', isOpen, 'walletAddress:', walletAddress);

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black/90 backdrop-blur-sm overflow-auto"
      style={{ zIndex: 99999 }}
    >
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-4xl mx-auto bg-gray-900 rounded-xl border border-white/10">
        {/* Header */}
        <div className="p-8 border-b border-white/10 bg-gradient-to-r from-orange-600/20 to-red-600/20">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-white">Edit Profile</h1>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white text-3xl leading-none"
            >
              ×
            </button>
          </div>
          <div className="flex items-start gap-6">
            <div className="relative">
              {profilePhoto || profile?.avatar ? (
                <img 
                  src={profilePhoto || profile?.avatar} 
                  alt="Profile" 
                  className="w-32 h-32 rounded-full object-cover border-4 border-orange-500"
                />
              ) : (
                <div className="w-32 h-32 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-4xl border-4 border-orange-500">
                  {(profile?.displayName || displayName)?.charAt(0) || walletAddress?.slice(2, 3) || '?'}
                </div>
              )}
              {isEditing && (
                <label className="absolute bottom-0 right-0 bg-orange-500 hover:bg-orange-600 rounded-full p-2 cursor-pointer transition-colors">
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
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Display Name</label>
                      <input
                        type="text"
                        value={editData.displayName || ''}
                        onChange={(e) => updateEditData('displayName', e.target.value)}
                        className="bg-gray-800 border border-gray-600 rounded px-4 py-2 text-white text-xl font-bold w-full"
                        placeholder="Display Name"
                        maxLength={50}
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Bio</label>
                      <textarea
                        value={editData.bio || ''}
                        onChange={(e) => updateEditData('bio', e.target.value)}
                        className="bg-gray-800 border border-gray-600 rounded px-4 py-2 text-gray-300 w-full resize-none"
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
                          className="bg-gray-800 border border-gray-600 rounded px-4 py-2 text-white w-full"
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
                          className="bg-gray-800 border border-gray-600 rounded px-4 py-2 text-white w-full"
                          placeholder="e.g. United States"
                          maxLength={50}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-white">
                      {profile?.displayName || displayName || profileData.playerName}
                    </h2>
                    {profile?.bio && (
                      <p className="text-gray-300 mt-2">{profile.bio}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      {profile?.clan && (
                        <span className="text-orange-400 font-medium">{profile.clan}</span>
                      )}
                      {profile?.country && (
                        <span className="text-gray-400">{profile.country}</span>
                      )}
                    </div>
                  </>
                )}
                <div className="mt-4">
                  <p className="text-gray-500 text-sm">
                    {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'No wallet connected'}
                  </p>
                  <div className="mt-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-blue-400">Level {profileData.level}</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-green-400">{profileData.xp} XP</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${xpProgress}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 mt-4">
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

        {/* Content */}
        <div className="p-8 space-y-8">
          {isLoading && walletAddress && (
            <div className="flex items-center justify-center py-8">
              <div className="text-white">Loading player data...</div>
            </div>
          )}
          
          {error && (
            <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-4 text-red-400 text-sm">
              Failed to load player data. Showing offline data.
            </div>
          )}

          {saveError && (
            <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-4 text-red-400 text-sm">
              Error saving profile: {saveError}
            </div>
          )}

          {/* Additional Profile Details */}
          {isEditing && (
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Gaming Preferences</h3>
              <div className="bg-gray-800/50 rounded-lg p-6 border border-white/10">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Favorite Game</label>
                    <select
                      value={editData.favoriteGame || ''}
                      onChange={(e) => updateEditData('favoriteGame', e.target.value)}
                      className="bg-gray-800 border border-gray-600 rounded px-4 py-2 text-white w-full"
                    >
                      <option value="">Select Game</option>
                      <option value="CS2">Counter-Strike 2</option>
                      <option value="Valorant">Valorant</option>
                      <option value="League of Legends">League of Legends</option>
                      <option value="Dota 2">Dota 2</option>
                      <option value="Rocket League">Rocket League</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Play Style</label>
                    <select
                      value={editData.playStyle || ''}
                      onChange={(e) => updateEditData('playStyle', e.target.value)}
                      className="bg-gray-800 border border-gray-600 rounded px-4 py-2 text-white w-full"
                    >
                      <option value="">Select Style</option>
                      <option value="Aggressive">Aggressive</option>
                      <option value="Strategic">Strategic</option>
                      <option value="Support">Support</option>
                      <option value="Flex">Flex</option>
                    </select>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-white font-medium mb-3">Social Media</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Discord</label>
                      <input
                        type="text"
                        value={editData.discord || ''}
                        onChange={(e) => updateEditData('discord', e.target.value)}
                        className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white w-full"
                        placeholder="username"
                        maxLength={32}
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Steam</label>
                      <input
                        type="text"
                        value={editData.steam || ''}
                        onChange={(e) => updateEditData('steam', e.target.value)}
                        className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white w-full"
                        placeholder="steamid"
                        maxLength={32}
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Twitter</label>
                      <input
                        type="text"
                        value={editData.twitter || ''}
                        onChange={(e) => updateEditData('twitter', e.target.value)}
                        className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white w-full"
                        placeholder="@username"
                        maxLength={15}
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Twitch</label>
                      <input
                        type="text"
                        value={editData.twitch || ''}
                        onChange={(e) => updateEditData('twitch', e.target.value)}
                        className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white w-full"
                        placeholder="channel"
                        maxLength={25}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Profile Info Display */}
          {!isEditing && profile && (profile.favoriteGame || profile.country || profile.discord || profile.steam || profile.twitter || profile.twitch) && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Profile</h3>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10 space-y-3">
                {profile.favoriteGame && (
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm w-20">Game:</span>
                    <span className="text-white text-sm">{profile.favoriteGame}</span>
                  </div>
                )}
                {profile.country && (
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm w-20">Country:</span>
                    <span className="text-white text-sm">{profile.country}</span>
                  </div>
                )}
                {(profile.discord || profile.steam || profile.twitter || profile.twitch) && (
                  <div>
                    <div className="text-gray-400 text-sm mb-2">Social:</div>
                    <div className="flex flex-wrap gap-2">
                      {profile.discord && (
                        <span className="bg-indigo-600/20 text-indigo-400 px-2 py-1 rounded text-xs">
                          Discord: {profile.discord}
                        </span>
                      )}
                      {profile.steam && (
                        <span className="bg-gray-600/20 text-gray-400 px-2 py-1 rounded text-xs">
                          Steam: {profile.steam}
                        </span>
                      )}
                      {profile.twitter && (
                        <span className="bg-blue-600/20 text-blue-400 px-2 py-1 rounded text-xs">
                          Twitter: {profile.twitter}
                        </span>
                      )}
                      {profile.twitch && (
                        <span className="bg-purple-600/20 text-purple-400 px-2 py-1 rounded text-xs">
                          Twitch: {profile.twitch}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Statistics</h3>
            <div className="grid grid-cols-2 gap-3">
              <StatItem label="Tournaments" value={profileData.totalTournaments} icon="🎮" />
              <StatItem label="Wins" value={profileData.wins} icon="🏆" />
              <StatItem label="Win Rate" value={`${profileData.winRate}%`} icon="📈" />
              <StatItem label="Prize Money" value={`$${profileData.totalPrizesMoney}`} icon="💰" />
            </div>
          </div>

          {/* Recent Trophies */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Recent Trophies</h3>
            <div className="space-y-2">
              {profileData.trophies.map((trophy) => (
                <TrophyItem key={trophy.id} trophy={trophy} />
              ))}
            </div>
          </div>

          {/* Badges */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Badges</h3>
            <div className="grid grid-cols-3 gap-3">
              {profileData.badges.map((badge) => (
                <BadgeItem key={badge.id} badge={badge} />
              ))}
            </div>
          </div>

          {/* Wallet Settings */}
          {openAccountModal && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Wallet</h3>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">Wallet Settings</div>
                    <div className="text-gray-400 text-sm">Manage your wallet connection</div>
                  </div>
                  <button
                    onClick={openAccountModal}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Open Wallet
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Use portal to render modal at document body level
  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}