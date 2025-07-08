'use client';

import { useState, useEffect } from 'react';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';

interface ProfilePageProps {
  walletAddress?: string;
  displayName?: string;
  onProfileUpdate?: (displayName: string, photo?: string) => void;
  user?: any; // Pass user data from parent component
  updateUser?: (updates: any) => Promise<any>; // Pass updateUser function from parent
}

// Default/fallback data structure for new users
const defaultUserData = {
  playerName: 'New Player',
  level: 1,
  xp: 0,
  xpToNextLevel: 1000,
  totalPrizesMoney: 0,
  wins: 0,
  totalTournaments: 0,
  winRate: 0,
  joinDate: new Date().toISOString(),
  lastActive: 'Online',
  trophies: [],
  badges: [],
  recentActivity: []
};

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="card-compact text-center">
      <div className="text-3xl mb-2">{icon}</div>
      <div className="heading-sm mb-1">{value}</div>
      <div className="text-muted text-sm">{label}</div>
    </div>
  );
}

function BadgeItem({ badge }: { badge: { id: string; name: string; icon: string; rarity: 'common' | 'rare' | 'epic' | 'legendary' } }) {
  const getRarityClass = (rarity: typeof badge.rarity) => {
    switch (rarity) {
      case 'common': return 'border-gray-500/40 bg-gray-500/10';
      case 'rare': return 'border-blue-500/40 bg-blue-500/10';
      case 'epic': return 'border-purple-500/40 bg-purple-500/10';
      case 'legendary': return 'border-yellow-500/40 bg-yellow-500/10';
    }
  };

  return (
    <div className={`card-compact text-center hover:scale-105 transition-transform ${getRarityClass(badge.rarity)}`}>
      <div className="text-3xl mb-2">{badge.icon}</div>
      <div className="text-white text-sm font-medium">{badge.name}</div>
      <div className="text-muted text-xs mt-1 capitalize">{badge.rarity}</div>
    </div>
  );
}

export function ProfilePage({ walletAddress, displayName, onProfileUpdate, user, updateUser }: ProfilePageProps) {
  const { data: userData, error } = usePlayerProfile(walletAddress, displayName);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    displayName: '',
    email: '',
    bio: '',
    clan: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string>('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'activity'>('overview');

  const profileData = user || userData || defaultUserData;
  const xpProgress = profileData.stats ? (profileData.stats.xp / (profileData.stats.level * 1000)) * 100 : (profileData.xp / profileData.xpToNextLevel) * 100;

  useEffect(() => {
    if (user) {
      setEditData({
        displayName: user.displayName || '',
        email: user.email || '',
        bio: user.bio || '',
        clan: user.clan?.name || ''
      });
      setProfilePhoto(user.avatar || '');
    }
  }, [user]);

  const startEdit = () => {
    setIsEditing(true);
    setSaveError('');
  };

  const cancelEdit = () => {
    setIsEditing(false);
    if (user) {
      setEditData({
        displayName: user.displayName || '',
        email: user.email || '',
        bio: user.bio || '',
        clan: user.clan?.name || ''
      });
      setProfilePhoto(user.avatar || '');
    }
    setSaveError('');
  };

  const updateEditData = (field: string, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!updateUser) {
      setSaveError('Update function not available');
      return;
    }

    setIsSaving(true);
    setSaveError('');
    
    try {
      const updates: any = {
        displayName: editData.displayName,
        email: editData.email,
        bio: editData.bio
      };

      if (profilePhoto) {
        updates.avatar = profilePhoto;
      }

      await updateUser(updates);
      setIsEditing(false);
      
      // Save to localStorage for ConnectWallet to use
      if (walletAddress && (editData.displayName || profilePhoto)) {
        const profileData = {
          displayName: editData.displayName,
          avatar: profilePhoto
        };
        const storageKey = `profile_${walletAddress}`;
        localStorage.setItem(storageKey, JSON.stringify(profileData));
        
        // Dispatch custom event to update ConnectWallet immediately
        window.dispatchEvent(new CustomEvent('profileUpdated', { 
          detail: { address: walletAddress, profileData } 
        }));
      }
      
      if (onProfileUpdate) {
        onProfileUpdate(editData.displayName || '', profilePhoto);
      }
    } catch (error: any) {
      setSaveError(error.message || 'Failed to save profile');
    } finally {
      setIsSaving(false);
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
      };
      reader.readAsDataURL(file);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'achievements':
        return (
          <div className="space-y-6">
            <h3 className="heading-md">Achievements</h3>
            <div className="grid-2">
              {(profileData.trophies || []).map((trophy) => (
                <div key={trophy.id} className="card-interactive">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">{trophy.icon}</div>
                    <div className="flex-1">
                      <h4 className="text-white font-semibold text-lg">{trophy.name}</h4>
                      <p className="text-muted mt-1">{trophy.description}</p>
                      <p className="text-muted text-sm mt-2">{new Date(trophy.date).toLocaleDateString()}</p>
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
            <h3 className="heading-md">Recent Activity</h3>
            <div className="space-y-3">
              {(profileData.recentActivity || []).map((activity) => (
                <div key={activity.id} className="card-compact">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="text-white">{activity.description}</p>
                      <p className="text-muted text-sm mt-1">{activity.timestamp}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      
      default: // overview
        return (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div>
              <h3 className="heading-md mb-6">Statistics</h3>
              <div className="grid-4">
                <StatCard label="Tournaments" value={profileData.totalTournaments} icon="🎮" />
                <StatCard label="Wins" value={profileData.wins} icon="🏆" />
                <StatCard label="Win Rate" value={`${profileData.winRate}%`} icon="📈" />
                <StatCard label="Earnings" value={`$${profileData.totalPrizesMoney}`} icon="💰" />
              </div>
            </div>

            {/* Recent Achievements */}
            <div>
              <h3 className="heading-md mb-6">Recent Achievements</h3>
              <div className="grid-3">
                {(profileData.trophies || []).slice(0, 3).map((trophy) => (
                  <div key={trophy.id} className="card-compact text-center">
                    <div className="text-3xl mb-3">{trophy.icon}</div>
                    <div className="text-white font-medium">{trophy.name}</div>
                    <div className="text-muted text-sm mt-1">{new Date(trophy.date).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Badges */}
            <div>
              <h3 className="heading-md mb-6">Badges</h3>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {(profileData.badges || []).map((badge) => (
                  <BadgeItem key={badge.id} badge={badge} />
                ))}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <div className="card">
        <div className="flex flex-col md:flex-row items-start gap-6">
          {/* Profile Picture */}
          <div className="relative flex-shrink-0">
            {profilePhoto || user?.avatar ? (
              <img 
                src={profilePhoto || user?.avatar} 
                alt="Profile" 
                className="w-32 h-32 rounded-full object-cover border-4 border-red-500 shadow-lg"
              />
            ) : (
              <div className="w-32 h-32 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-4xl border-4 border-red-500 shadow-lg">
                {(user?.displayName || displayName)?.charAt(0) || walletAddress?.slice(2, 3) || '?'}
              </div>
            )}
            {isEditing && (
              <label className="absolute bottom-0 right-0 bg-red-500 hover:bg-red-600 rounded-full p-2 cursor-pointer transition-colors shadow-lg">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <div className="text-white text-sm">Uploading...</div>
              </div>
            )}
          </div>

          {/* Profile Details */}
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-4">
                <div className="form-group">
                  <label className="form-label">Display Name</label>
                  <input
                    type="text"
                    value={editData.displayName || ''}
                    onChange={(e) => updateEditData('displayName', e.target.value)}
                    className="input-field"
                    placeholder="Display Name"
                    maxLength={50}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    value={editData.email || ''}
                    onChange={(e) => updateEditData('email', e.target.value)}
                    className="input-field"
                    placeholder="your.email@example.com"
                    maxLength={100}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Bio</label>
                  <textarea
                    value={editData.bio || ''}
                    onChange={(e) => updateEditData('bio', e.target.value)}
                    className="input-field resize-none"
                    placeholder="Tell us about yourself..."
                    rows={3}
                    maxLength={500}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Country</label>
                    <input
                      type="text"
                      value={user?.country || ''}
                      className="input-field bg-gray-700 cursor-not-allowed"
                      placeholder="Not set"
                      disabled
                      readOnly
                    />
                    <p className="text-xs text-muted mt-1">Country cannot be changed</p>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Username</label>
                    <input
                      type="text"
                      value={user?.username || ''}
                      className="input-field bg-gray-700 cursor-not-allowed"
                      placeholder="Not set"
                      disabled
                      readOnly
                    />
                    <p className="text-xs text-muted mt-1">Username cannot be changed</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <h1 className="heading-lg">
                  {user?.displayName || displayName || profileData.playerName}
                </h1>
                {user?.bio && (
                  <p className="text-body mt-2">{user.bio}</p>
                )}
                <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
                  {user?.username && (
                    <span className="text-blue-400 font-medium">@{user.username}</span>
                  )}
                  {user?.clan && (
                    <span className="text-red-400 font-medium">{user.clan.name}</span>
                  )}
                  {user?.country && (
                    <span className="text-muted">{user.country}</span>
                  )}
                  <span className="text-muted">Joined {new Date(user?.createdAt || profileData.joinDate).toLocaleDateString()}</span>
                </div>
                {user?.email && (
                  <div className="mt-2">
                    <span className="text-muted text-sm">{user.email}</span>
                  </div>
                )}
              </>
            )}

            <div className="mt-6">
              <p className="text-muted text-sm">
                {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'No wallet connected'}
              </p>
              <div className="mt-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-blue-400">Level {user?.stats?.level || profileData.level}</span>
                  <span className="text-muted">•</span>
                  <span className="text-green-400">{user?.stats?.xp || profileData.xp} XP</span>
                </div>
                <div className="w-full max-w-sm bg-white/10 rounded-full h-2 mt-2">
                  <div 
                    className="bg-gradient-to-r from-red-500 to-orange-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${xpProgress}%` }}
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-3 mt-6">
                {isEditing ? (
                  <>
                    <button 
                      onClick={handleSave}
                      disabled={isSaving}
                      className="btn btn-primary"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button 
                      onClick={cancelEdit}
                      disabled={isSaving}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  walletAddress && (
                    <button 
                      onClick={startEdit}
                      className="btn btn-primary"
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

      {/* Tab Navigation */}
      <div className="border-b border-white/10">
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
                  ? 'border-red-500 text-red-400'
                  : 'border-transparent text-muted hover:text-white'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {renderTabContent()}
      </div>

      {/* Error Messages */}
      {error && (
        <div className="card bg-red-500/10 border-red-500/30 text-red-400">
          Failed to load player data. Showing offline data.
        </div>
      )}

      {saveError && (
        <div className="card bg-red-500/10 border-red-500/30 text-red-400">
          Error saving profile: {saveError}
        </div>
      )}
    </div>
  );
}