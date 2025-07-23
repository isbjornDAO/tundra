'use client';

import { useState, useEffect } from 'react';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { useAccount } from 'wagmi';
import { COUNTRY_CODE_TO_NAME } from '@/types/countries';

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

// Default stats structure
const defaultStats = {
  totalTournaments: 0,
  wins: 0,
  totalPrizeMoney: 0,
  level: 1,
  xp: 0
};

// Helper function to safely get stat values with defaults
function getStatValue(user: any, statName: string, defaultValue: any = 0) {
  return user?.stats?.[statName] ?? defaultValue;
}

// Helper function to get user display stats with proper defaults
function getUserStats(user: any, profileData: any) {
  // If user exists but has no stats, initialize with defaults
  if (user && !user.stats) {
    user.stats = { ...defaultStats };
  }
  
  return {
    totalTournaments: getStatValue(user, 'totalTournaments') || profileData.totalTournaments || 0,
    wins: getStatValue(user, 'wins') || profileData.wins || 0,
    totalPrizeMoney: getStatValue(user, 'totalPrizeMoney') || profileData.totalPrizesMoney || 0,
    level: getStatValue(user, 'level', 1) || profileData.level || 1,
    xp: getStatValue(user, 'xp') || profileData.xp || 0,
    winRate: calculateWinRate(getStatValue(user, 'wins') || profileData.wins || 0, getStatValue(user, 'totalTournaments') || profileData.totalTournaments || 0)
  };
}

// Helper function to calculate win rate
function calculateWinRate(wins: number, totalTournaments: number) {
  if (totalTournaments === 0) return 0;
  return Math.round((wins / totalTournaments) * 100);
}

// Helper function to get country display name
function getCountryDisplayName(country: string): string {
  if (!country) return 'Unknown';
  
  // If it's a 2-letter code, convert to name
  if (country.length === 2) {
    return COUNTRY_CODE_TO_NAME[country.toUpperCase()] || country;
  }
  
  // If it's already a name, return as-is
  return country;
}

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
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'activity' | 'tournaments'>('overview');
  const [tournamentHistory, setTournamentHistory] = useState<any>(null);
  const [loadingTournaments, setLoadingTournaments] = useState(false);
  const { address } = useAccount();

  // Debug logging
  useEffect(() => {
    if (user) {
      console.log('ProfilePage - User prop received:', user);
      console.log('ProfilePage - User clan:', user.clan);
      console.log('ProfilePage - Clan type:', typeof user.clan);
      console.log('ProfilePage - Clan name:', user.clan?.name);
      console.log('ProfilePage - Clan tag:', user.clan?.tag);
    }
  }, [user]);

  const profileData = user || userData || defaultUserData;
  const userStats = getUserStats(user, profileData);
  const xpProgress = (userStats.xp / (userStats.level * 1000)) * 100;

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

  // Fetch tournament history when tournament tab is selected OR overview tab needs accurate stats
  useEffect(() => {
    if ((activeTab === 'tournaments' || activeTab === 'overview' || activeTab === 'achievements') && user?._id && !tournamentHistory) {
      fetchTournamentHistory();
    }
  }, [activeTab, user?._id]);


  const fetchTournamentHistory = async () => {
    if (!user?._id) return;
    
    setLoadingTournaments(true);
    try {
      const response = await fetch(`/api/users/${user._id}/tournaments`);
      const data = await response.json();
      setTournamentHistory(data);
    } catch (error) {
      console.error('Error fetching tournament history:', error);
    } finally {
      setLoadingTournaments(false);
    }
  };


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
            <div className="flex items-center justify-between">
              <h3 className="heading-md">Achievements & Badges</h3>
              {tournamentHistory && (
                <div className="text-sm text-muted">
                  {tournamentHistory.achievements?.length || 0} achievements • {tournamentHistory.badges?.length || 0} badges earned
                </div>
              )}
            </div>
            
            {/* Achievements Section */}
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">🏆 Achievements</h4>
              <div className="grid-2">
                {tournamentHistory?.achievements?.length > 0 ? (
                  tournamentHistory.achievements.map((achievement: any) => (
                    <div key={achievement.id} className="card-interactive">
                      <div className="flex items-start gap-4">
                        <div className="text-4xl">{achievement.icon}</div>
                        <div className="flex-1">
                          <h5 className="text-white font-semibold text-lg">{achievement.name}</h5>
                          <p className="text-muted mt-1">{achievement.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              achievement.rarity === 'legendary' ? 'bg-yellow-500/20 text-yellow-400' :
                              achievement.rarity === 'epic' ? 'bg-purple-500/20 text-purple-400' :
                              achievement.rarity === 'rare' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {achievement.rarity}
                            </span>
                            <span className="text-xs text-muted capitalize">{achievement.category}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 text-center py-12">
                    <div className="text-6xl mb-6">🏆</div>
                    <div className="text-white text-xl mb-2">No Achievements Yet</div>
                    <div className="text-muted max-w-md mx-auto">
                      Start participating in tournaments and completing challenges to unlock achievements!
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Badges Section */}
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">🏅 Badges</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {tournamentHistory?.badges?.length > 0 ? (
                  tournamentHistory.badges.map((badge: any) => (
                    <div key={badge.id} className={`card-compact text-center hover:scale-105 transition-transform ${
                      badge.rarity === 'legendary' ? 'border-yellow-500/40 bg-yellow-500/10' :
                      badge.rarity === 'epic' ? 'border-purple-500/40 bg-purple-500/10' :
                      badge.rarity === 'rare' ? 'border-blue-500/40 bg-blue-500/10' :
                      'border-gray-500/40 bg-gray-500/10'
                    }`}>
                      <div className="text-3xl mb-2">{badge.icon}</div>
                      <div className="text-white text-sm font-medium">{badge.name}</div>
                      <div className="text-muted text-xs mt-1">{badge.description}</div>
                      <div className="text-muted text-xs mt-1 capitalize">{badge.rarity}</div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <div className="text-6xl mb-6">🏅</div>
                    <div className="text-white text-xl mb-2">No Badges Yet</div>
                    <div className="text-muted max-w-md mx-auto">
                      Participate in tournaments to earn badges!
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      
      case 'activity':
        return (
          <div className="text-center py-12">
            <div className="text-6xl mb-6">🚧</div>
            <div className="text-white text-xl mb-2">Coming Soon</div>
            <div className="text-muted max-w-md mx-auto">
              Activity tracking is currently under development.
            </div>
          </div>
        );

      case 'tournaments':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="heading-md">Tournament History</h3>
              {tournamentHistory && (
                <div className="text-sm text-muted">
                  {tournamentHistory.recentForm?.length > 0 && (
                    <span className="flex items-center gap-1">
                      Recent Form: {tournamentHistory.recentForm.map((result: string, idx: number) => (
                        <span key={idx} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          result === 'W' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {result}
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {loadingTournaments ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">⏳</div>
                <div className="text-white">Loading tournament history...</div>
              </div>
            ) : tournamentHistory ? (
              <div className="space-y-6">
                {/* Overall Tournament Stats */}
                {tournamentHistory.overallStats && (
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-4">Overall Tournament Performance</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="card-compact text-center">
                        <div className="text-2xl font-bold text-blue-400">{tournamentHistory.overallStats.totalTournaments}</div>
                        <div className="text-sm text-muted">Tournaments</div>
                      </div>
                      <div className="card-compact text-center">
                        <div className="text-2xl font-bold text-green-400">{tournamentHistory.overallStats.matchesWon}</div>
                        <div className="text-sm text-muted">Matches Won</div>
                      </div>
                      <div className="card-compact text-center">
                        <div className="text-2xl font-bold text-yellow-400">{tournamentHistory.overallStats.winRate}%</div>
                        <div className="text-sm text-muted">Win Rate</div>
                      </div>
                      <div className="card-compact text-center">
                        <div className="text-2xl font-bold text-purple-400">{tournamentHistory.overallStats.kd?.toFixed(2) || '0.00'}</div>
                        <div className="text-sm text-muted">K/D Ratio</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tournament List */}
                {tournamentHistory.tournaments && tournamentHistory.tournaments.length > 0 ? (
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-4">Tournament Participation</h4>
                    <div className="space-y-4">
                      {(tournamentHistory.tournaments || []).map((tournamentData: any) => (
                        tournamentData ? (
                        <div key={tournamentData.tournament?.id || Math.random()} className="card">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h5 className="text-white font-semibold text-lg">{tournamentData.tournament?.game || 'Unknown Game'} Tournament</h5>
                              <div className="flex items-center gap-4 text-sm text-muted mt-1">
                                <span>{(() => {
                                  const completedAt = tournamentData.tournament?.completedAt;
                                  const createdAt = tournamentData.tournament?.createdAt;
                                  const lastMatchDate = tournamentData.matches && tournamentData.matches.length > 0 
                                    ? tournamentData.matches[tournamentData.matches.length - 1]?.completedAt 
                                    : null;
                                  const dateToUse = completedAt || lastMatchDate || createdAt || Date.now();
                                  return new Date(dateToUse).toLocaleDateString();
                                })()}</span>
                                <span>${tournamentData.tournament?.prizePool?.toLocaleString() || '5,000'} Prize Pool</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-blue-400">{tournamentData.stats?.matchesWon || 0}/{tournamentData.stats?.matchesPlayed || 0}</div>
                              <div className="text-xs text-muted">Matches Won</div>
                            </div>
                          </div>

                          {tournamentData.stats && (
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-4 border-t border-white/10">
                              <div className="text-center">
                                <div className="text-lg font-bold text-green-400">{tournamentData.stats?.totalKills || 0}</div>
                                <div className="text-xs text-muted">Kills</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-bold text-red-400">{tournamentData.stats?.totalDeaths || 0}</div>
                                <div className="text-xs text-muted">Deaths</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-bold text-blue-400">{tournamentData.stats?.totalAssists || 0}</div>
                                <div className="text-xs text-muted">Assists</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-bold text-purple-400">{tournamentData.stats?.kd?.toFixed(2) || '0.00'}</div>
                                <div className="text-xs text-muted">K/D</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-bold text-yellow-400">{tournamentData.stats?.mvpCount || 0}</div>
                                <div className="text-xs text-muted">MVP Awards</div>
                              </div>
                            </div>
                          )}

                          {/* Match History for this tournament */}
                          {tournamentData.matches && tournamentData.matches.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-white/10">
                              <h6 className="text-white font-medium mb-3">Match Results</h6>
                              <div className="space-y-2">
                                {(tournamentData.matches || []).slice(0, 3).map((match: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                                    <div className="flex items-center gap-3">
                                      <span className={`w-2 h-2 rounded-full ${
                                        match?.isWin ? 'bg-green-400' : 'bg-red-400'
                                      }`}></span>
                                      <span className="text-white text-sm">
                                        vs {match?.opponentClan || 'Unknown'} ({match?.round || 'N/A'})
                                      </span>
                                    </div>
                                    <div className="text-sm text-muted">
                                      {match?.performance ? (
                                        <span className="font-mono">
                                          {match.performance?.kills || 0}/{match.performance?.deaths || 0}/{match.performance?.assists || 0}
                                          {match.performance?.mvp && <span className="text-yellow-400 ml-1">👑</span>}
                                        </span>
                                      ) : (
                                        <span>{match?.isWin ? 'Win' : 'Loss'}</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                {(tournamentData.matches?.length || 0) > 3 && (
                                  <div className="text-center text-sm text-muted">
                                    +{(tournamentData.matches?.length || 0) - 3} more matches
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        ) : null
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-6">🏆</div>
                    <div className="text-white text-xl mb-2">No Tournament History</div>
                    <div className="text-muted max-w-md mx-auto">
                      You haven't participated in any completed tournaments yet. Join a tournament to start building your competitive history!
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-6">🏆</div>
                <div className="text-white text-xl mb-2">No Tournament History</div>
                <div className="text-muted max-w-md mx-auto">
                  You haven't participated in any completed tournaments yet. Join a tournament to start building your competitive history!
                </div>
              </div>
            )}
          </div>
        );
      
      default: // overview
        return (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div>
              <h3 className="heading-md mb-6">Statistics</h3>
              <div className="grid-4">
                <StatCard 
                  label="Tournaments" 
                  value={tournamentHistory?.overallStats?.totalTournaments || userStats.totalTournaments} 
                  icon="🎮" 
                />
                <StatCard 
                  label="Matches Won" 
                  value={tournamentHistory?.overallStats?.matchesWon || userStats.wins} 
                  icon="🏆" 
                />
                <StatCard 
                  label="Win Rate" 
                  value={`${tournamentHistory?.overallStats?.winRate || userStats.winRate}%`} 
                  icon="📈" 
                />
                <StatCard 
                  label="K/D Ratio" 
                  value={tournamentHistory?.overallStats?.kd?.toFixed(2) || '0.00'} 
                  icon="💀" 
                />
              </div>
            </div>

            {/* Recent Achievements */}
            <div>
              <h3 className="heading-md mb-6">Recent Achievements</h3>
              <div className="grid-3">
                {tournamentHistory?.achievements?.length > 0 ? (
                  tournamentHistory.achievements.slice(0, 3).map((achievement: any) => (
                    <div key={achievement.id} className="card-compact text-center">
                      <div className="text-3xl mb-3">{achievement.icon}</div>
                      <div className="text-white font-medium">{achievement.name}</div>
                      <div className="text-muted text-sm mt-1">{achievement.description}</div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-3 text-center py-8">
                    <div className="text-4xl mb-4">🎯</div>
                    <div className="text-muted">No achievements yet</div>
                    <div className="text-muted text-sm mt-1">Participate in tournaments to earn achievements!</div>
                  </div>
                )}
              </div>
            </div>

            {/* Badges */}
            <div>
              <h3 className="heading-md mb-6">Badges</h3>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {tournamentHistory?.badges?.length > 0 ? (
                  tournamentHistory.badges.map((badge: any) => (
                    <BadgeItem key={badge.id} badge={badge} />
                  ))
                ) : (
                  <div className="col-span-full text-center py-8">
                    <div className="text-4xl mb-4">🏅</div>
                    <div className="text-muted">No badges earned yet</div>
                    <div className="text-muted text-sm mt-1">Participate in tournaments to earn badges!</div>
                  </div>
                )}
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
                      value={getCountryDisplayName(user?.country || '')}
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
                  {user?.clan && typeof user.clan === 'object' && user.clan.name && (
                    <span className="text-red-400 font-medium">
                      [{user.clan.tag || user.clan.name}] {user.clan.name}
                    </span>
                  )}
                  {user?.country && (
                    <span className="text-muted">{getCountryDisplayName(user.country)}</span>
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
                  <span className="text-blue-400">Level {userStats.level}</span>
                  <span className="text-muted">•</span>
                  <span className="text-green-400">{userStats.xp} XP</span>
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
            { id: 'tournaments', label: 'Tournament History', icon: '🏆' },
            { id: 'achievements', label: 'Achievements', icon: '🏅' },
            { id: 'activity', label: 'Activity', icon: '📈' },
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