'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';

interface Clan {
  _id: string;
  name: string;
  tag: string;
  description?: string;
  logo?: string;
  country: string;
  region: string;
  leader: {
    displayName: string;
    username: string;
  };
  memberCount: number;
  canJoin: boolean;
  stats: {
    totalTournaments: number;
    wins: number;
    totalPrizeMoney: number;
  };
}

const getRegionFromCountry = (country: string): string => {
  const regionMap: { [key: string]: string } = {
    'New Zealand': 'Oceania',
    'Australia': 'Oceania',
    'Fiji': 'Oceania',
    'Papua New Guinea': 'Oceania',
    'United States': 'North America',
    'Canada': 'North America',
    'Mexico': 'North America',
    'United Kingdom': 'Europe West',
    'France': 'Europe West',
    'Germany': 'Europe West',
    'Spain': 'Europe West',
    'Italy': 'Europe West',
    'Netherlands': 'Europe West',
    'Belgium': 'Europe West',
    'Switzerland': 'Europe West',
    'Austria': 'Europe West',
    'Portugal': 'Europe West',
  };
  
  return regionMap[country] || 'Unknown';
};

function ClanContent() {
  const { address, isConnected } = useAccount();
  const { user } = useAuth();
  const [localClans, setLocalClans] = useState<Clan[]>([]);
  const [globalClans, setGlobalClans] = useState<Clan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'discover' | 'requests' | 'my-clan'>('discover');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [joinRequestLoading, setJoinRequestLoading] = useState<string | null>(null);
  const [createRequestLoading, setCreateRequestLoading] = useState(false);
  const [showManageMembers, setShowManageMembers] = useState(false);
  const [showEditDetails, setShowEditDetails] = useState(false);
  const [showJoinRequests, setShowJoinRequests] = useState(false);
  const [showClanSettings, setShowClanSettings] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      fetchClans();
    }
  }, [isConnected, address]);

  useEffect(() => {
    // Set initial tab based on user's clan status
    if (user?.clan) {
      setActiveTab('my-clan');
    } else {
      setActiveTab('discover');
    }
  }, [user]);

  const fetchClans = async () => {
    try {
      const response = await fetch(`/api/clans/discover?walletAddress=${address}`);
      if (response.ok) {
        const data = await response.json();
        setLocalClans(data.localClans || []);
        setGlobalClans(data.globalClans || []);
      }
    } catch (error) {
      console.error('Error fetching clans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRequest = async (clanId: string) => {
    setJoinRequestLoading(clanId);
    try {
      const response = await fetch('/api/clans/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          walletAddress: address,
          clanId,
          action: 'request'
        })
      });

      const data = await response.json();
      if (response.ok) {
        alert('Join request sent successfully!');
        fetchClans();
      } else {
        alert(data.error || 'Failed to send join request');
      }
    } catch (error) {
      console.error('Error sending join request:', error);
      alert('Failed to send join request');
    } finally {
      setJoinRequestLoading(null);
    }
  };

  const handleCreateRequest = async (formData: {
    clanName: string;
    clanTag: string;
    description: string;
    logo?: string;
  }) => {
    setCreateRequestLoading(true);
    try {
      const requestData = {
        walletAddress: address,
        country: user?.country || 'Unknown',
        region: user?.region || getRegionFromCountry(user?.country || 'Unknown'),
        ...formData
      };
      
      console.log('User object:', user);
      console.log('Sending clan request:', requestData);
      
      const response = await fetch('/api/clan-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();
      console.log('Response status:', response.status);
      console.log('Response data:', data);
      
      if (response.ok) {
        alert('Clan request submitted successfully! A Team1 host from your region will review it.');
        setShowCreateForm(false);
        fetchClans();
      } else {
        console.error('Clan request failed:', {
          status: response.status,
          statusText: response.statusText,
          data: data
        });
        
        // Show detailed error message
        const errorMessage = data.error || `Failed to submit clan request (${response.status})`;
        if (data.missing || data.received) {
          console.error('Missing fields:', data.missing);
          console.error('Received fields:', data.received);
        }
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Error submitting clan request:', error);
      alert('Failed to submit clan request');
    } finally {
      setCreateRequestLoading(false);
    }
  };

  const handleLeaveClan = async () => {
    if (!user?.clan) return;
    
    try {
      const response = await fetch('/api/clans/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          walletAddress: address,
          clanId: user.clan._id
        })
      });
      
      if (response.ok) {
        alert('Successfully left the clan!');
        window.location.reload(); // Refresh to update user state
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to leave clan');
      }
    } catch (error) {
      console.error('Error leaving clan:', error);
      alert('Failed to leave clan');
    }
    setShowLeaveConfirm(false);
  };

  if (!isConnected) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto text-center">
          <div className="card p-8">
            <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
            <p className="text-gray-400">You need to connect your wallet to access clan features.</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg text-white">Loading clans...</div>
        </div>
      </Layout>
    );
  }

  const ClanCard = ({ clan, isLocal = false }: { clan: Clan; isLocal?: boolean }) => (
    <div className="card-interactive">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {clan.logo ? (
            <img src={clan.logo} alt={clan.name} className="w-12 h-12 rounded-lg object-cover" />
          ) : (
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">{clan.tag}</span>
            </div>
          )}
          <div>
            <h3 className="text-white font-semibold">[{clan.tag}] {clan.name}</h3>
            <p className="text-gray-400 text-sm">{clan.country} • {clan.region}</p>
          </div>
        </div>
        {isLocal && (
          <span className="status-badge status-active text-xs">Local</span>
        )}
      </div>

      {clan.description && (
        <p className="text-gray-300 text-sm mb-4">{clan.description}</p>
      )}

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-white font-semibold">{clan.memberCount}</div>
          <div className="text-gray-400 text-xs">Members</div>
        </div>
        <div className="text-center">
          <div className="text-white font-semibold">{clan.stats.wins}</div>
          <div className="text-gray-400 text-xs">Wins</div>
        </div>
        <div className="text-center">
          <div className="text-white font-semibold">${clan.stats.totalPrizeMoney.toLocaleString()}</div>
          <div className="text-gray-400 text-xs">Earnings</div>
        </div>
      </div>

      <div className="border-t border-white/10 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-xs">Leader</p>
            <p className="text-white text-sm font-medium">@{clan.leader.username}</p>
          </div>
          
          {clan.canJoin ? (
            <button
              onClick={() => handleJoinRequest(clan._id)}
              disabled={joinRequestLoading === clan._id || !!user?.clan}
              className="btn btn-primary btn-sm"
            >
              {joinRequestLoading === clan._id ? 'Sending...' : 
               user?.clan ? 'Already in Clan' : 'Request to Join'}
            </button>
          ) : (
            <div className="text-xs text-gray-400 text-center">
              <div>🚫 Different Country</div>
              <div>Cannot Join</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const CreateClanRequestModal = () => {
    const [formData, setFormData] = useState({
      clanName: '',
      clanTag: '',
      description: '',
      logo: ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateForm = () => {
      const newErrors: Record<string, string> = {};
      
      if (!formData.clanName.trim()) {
        newErrors.clanName = 'Clan name is required';
      } else if (formData.clanName.length < 3 || formData.clanName.length > 30) {
        newErrors.clanName = 'Clan name must be 3-30 characters';
      }
      
      if (!formData.clanTag.trim()) {
        newErrors.clanTag = 'Clan tag is required';
      } else if (formData.clanTag.length < 2 || formData.clanTag.length > 5) {
        newErrors.clanTag = 'Clan tag must be 2-5 characters';
      } else if (!/^[A-Z0-9]+$/.test(formData.clanTag)) {
        newErrors.clanTag = 'Clan tag must be uppercase letters and numbers only';
      }
      
      if (!formData.description.trim()) {
        newErrors.description = 'Description is required';
      } else if (formData.description.length < 10 || formData.description.length > 200) {
        newErrors.description = 'Description must be 10-200 characters';
      }
      
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (validateForm()) {
        handleCreateRequest(formData);
      }
    };

    const handleInputChange = (field: string, value: string) => {
      setFormData(prev => ({ ...prev, [field]: value }));
      // Clear error when user starts typing
      if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: '' }));
      }
    };

    if (!showCreateForm) return null;

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 border border-white/10 rounded-lg p-6 max-w-md w-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">Create Clan Request</h2>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Clan Name
              </label>
              <input
                type="text"
                value={formData.clanName}
                onChange={(e) => handleInputChange('clanName', e.target.value)}
                className={`w-full px-3 py-2 bg-gray-800 border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  errors.clanName ? 'border-red-500' : 'border-gray-700'
                }`}
                placeholder="Enter clan name"
                maxLength={30}
              />
              {errors.clanName && <p className="text-red-400 text-sm mt-1">{errors.clanName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Clan Tag
              </label>
              <input
                type="text"
                value={formData.clanTag}
                onChange={(e) => handleInputChange('clanTag', e.target.value.toUpperCase())}
                className={`w-full px-3 py-2 bg-gray-800 border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  errors.clanTag ? 'border-red-500' : 'border-gray-700'
                }`}
                placeholder="TAG"
                maxLength={5}
              />
              {errors.clanTag && <p className="text-red-400 text-sm mt-1">{errors.clanTag}</p>}
              <p className="text-gray-400 text-xs mt-1">2-5 characters, uppercase letters and numbers only</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className={`w-full px-3 py-2 bg-gray-800 border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  errors.description ? 'border-red-500' : 'border-gray-700'
                }`}
                placeholder="Describe your clan..."
                maxLength={200}
              />
              {errors.description && <p className="text-red-400 text-sm mt-1">{errors.description}</p>}
              <p className="text-gray-400 text-xs mt-1">{formData.description.length}/200 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Logo URL (Optional)
              </label>
              <input
                type="url"
                value={formData.logo}
                onChange={(e) => handleInputChange('logo', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="https://example.com/logo.png"
              />
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="text-blue-400">ℹ️</div>
                <h3 className="text-blue-400 font-medium">Review Process</h3>
              </div>
              <p className="text-blue-300 text-sm">
                Your clan request will be reviewed by a Team1 host from your region ({user?.country || 'your country'}). 
                This process may take 1-3 business days.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="flex-1 btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createRequestLoading}
                className="flex-1 btn btn-primary"
              >
                {createRequestLoading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const MyClanView = () => {
    if (!user?.clan) return null;

    return (
      <div className="max-w-4xl mx-auto">
        {/* Clan Header */}
        <div className="card mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              {user.clan.logo ? (
                <img src={user.clan.logo} alt={user.clan.name} className="w-20 h-20 rounded-xl object-cover" />
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-2xl">{user.clan.tag}</span>
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">[{user.clan.tag}] {user.clan.name}</h1>
                <p className="text-gray-400 mb-2">{user.clan.country} • {user.clan.region}</p>
                <div className="flex items-center gap-4">
                  <span className="status-badge status-active">Verified</span>
                  {user.isClanLeader && (
                    <span className="status-badge status-warning">Leader</span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('discover')}
              className="btn btn-secondary"
            >
              Discover Other Clans
            </button>
          </div>

          {user.clan.description && (
            <p className="text-gray-300 mb-6">{user.clan.description}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">{user.clan.memberCount || 0}</div>
              <div className="text-gray-400 text-sm">Members</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">{user.clan.stats?.totalTournaments || 0}</div>
              <div className="text-gray-400 text-sm">Tournaments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">{user.clan.stats?.wins || 0}</div>
              <div className="text-gray-400 text-sm">Wins</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">${(user.clan.stats?.totalPrizeMoney || 0).toLocaleString()}</div>
              <div className="text-gray-400 text-sm">Total Earnings</div>
            </div>
          </div>
        </div>

        {/* Clan Members */}
        <div className="card mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Clan Members</h2>
          <div className="space-y-3">
            {Array.isArray(user.clan.members) && user.clan.members.length > 0 ? (
              user.clan.members.map((member: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {member.displayName?.charAt(0) || member.username?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div>
                      <div className="text-white font-medium">{member.displayName || 'Unknown'}</div>
                      <div className="text-gray-400 text-sm">@{member.username || 'unknown'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    {member._id === user.clan.leader && (
                      <span className="status-badge status-warning text-xs">Leader</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-400">
                <p>No members found</p>
              </div>
            )}
          </div>
        </div>

        {/* Clan Management (for leaders) */}
        {user.isClanLeader && (
          <div className="card">
            <h2 className="text-xl font-semibold text-white mb-4">Clan Management</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                className="btn btn-primary"
                onClick={() => setShowManageMembers(true)}
              >
                Manage Members
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowEditDetails(true)}
              >
                Edit Clan Details
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowJoinRequests(true)}
              >
                View Join Requests
              </button>
              <button 
                className="btn btn-outline-danger"
                onClick={() => setShowClanSettings(true)}
              >
                Clan Settings
              </button>
            </div>
          </div>
        )}

        {/* Regular Member Actions */}
        {!user.isClanLeader && (
          <div className="card">
            <h2 className="text-xl font-semibold text-white mb-4">Member Actions</h2>
            <div className="flex gap-4">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowInviteModal(true)}
              >
                Invite Players
              </button>
              <button 
                className="btn btn-outline-danger"
                onClick={() => setShowLeaveConfirm(true)}
              >
                Leave Clan
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (activeTab === 'my-clan' && user?.clan) {
    return (
      <Layout>
        <MyClanView />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="heading-xl mb-2">Clan Discovery</h1>
            <p className="text-muted">Join local clans or browse global community</p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn btn-secondary"
            >
              Create Clan Request
            </button>
            {user?.clan && (
              <button
                onClick={() => setActiveTab('my-clan')}
                className="btn btn-primary"
              >
                My Clan
              </button>
            )}
          </div>
        </div>

        {/* User's Current Clan Status */}
        {user?.clan && (
          <div className="card mb-8 bg-blue-500/10 border-blue-500/20">
            <div className="flex items-center gap-3">
              <div className="text-blue-400 text-2xl">👥</div>
              <div>
                <h3 className="text-blue-400 font-semibold">You're in [{user.clan.tag}] {user.clan.name}</h3>
                <p className="text-blue-300 text-sm">
                  {user.isClanLeader ? 'You are the clan leader' : 'You are a clan member'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Featured Local Clans */}
        {localClans.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="heading-lg">🏠 Local Clans</h2>
              <span className="status-badge status-active">
                {user?.country || 'Your Region'}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {localClans.map((clan) => (
                <ClanCard key={clan._id} clan={clan} isLocal={true} />
              ))}
            </div>
          </div>
        )}

        {/* Global Clans */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="heading-lg">🌍 Global Clans</h2>
            <span className="text-muted text-sm">
              Browse only • You can only join local clans
            </span>
          </div>
          
          {globalClans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {globalClans.map((clan) => (
                <ClanCard key={clan._id} clan={clan} isLocal={false} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4 text-4xl">🌍</div>
              <h3 className="text-white font-medium mb-2">No Global Clans Yet</h3>
              <p className="text-gray-400 text-sm">Be the first to create a clan and expand globally!</p>
            </div>
          )}
        </div>

        {/* No Local Clans Message */}
        {localClans.length === 0 && (
          <div className="text-center py-12 mb-8">
            <div className="text-gray-400 mb-4 text-4xl">🏠</div>
            <h3 className="text-white font-medium mb-2">No Local Clans Found</h3>
            <p className="text-gray-400 text-sm mb-4">
              No clans found in {user?.country || 'your country'}. Be the first to create one!
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn btn-primary"
            >
              Create First Local Clan
            </button>
          </div>
        )}

        {/* Leave Clan Confirmation Modal */}
        {showLeaveConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-white mb-4">Leave Clan</h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to leave {user?.clan?.name}? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLeaveClan}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Leave Clan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Placeholder Modals for Future Implementation */}
        {showManageMembers && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-2xl w-full mx-4">
              <h3 className="text-xl font-bold text-white mb-4">Manage Members</h3>
              <p className="text-gray-300 mb-6">
                Member management functionality coming soon!
              </p>
              <button
                onClick={() => setShowManageMembers(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {showEditDetails && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-2xl w-full mx-4">
              <h3 className="text-xl font-bold text-white mb-4">Edit Clan Details</h3>
              <p className="text-gray-300 mb-6">
                Edit clan details functionality coming soon!
              </p>
              <button
                onClick={() => setShowEditDetails(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {showJoinRequests && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-2xl w-full mx-4">
              <h3 className="text-xl font-bold text-white mb-4">View Join Requests</h3>
              <p className="text-gray-300 mb-6">
                Join requests management functionality coming soon!
              </p>
              <button
                onClick={() => setShowJoinRequests(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {showClanSettings && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-2xl w-full mx-4">
              <h3 className="text-xl font-bold text-white mb-4">Clan Settings</h3>
              <p className="text-gray-300 mb-6">
                Clan settings functionality coming soon!
              </p>
              <button
                onClick={() => setShowClanSettings(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {showInviteModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-white mb-4">Invite Players</h3>
              <p className="text-gray-300 mb-6">
                Player invitation functionality coming soon!
              </p>
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Create Clan Request Modal */}
        <CreateClanRequestModal />
      </div>
    </Layout>
  );
}

export default function ClanClient() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg text-white">Loading...</div>
        </div>
      </Layout>
    );
  }

  return <ClanContent />;
}