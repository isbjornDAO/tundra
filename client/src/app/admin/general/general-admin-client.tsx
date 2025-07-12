'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { WagmiGuard } from '@/components/WagmiGuard';
import { Layout } from '@/components/Layout';

interface User {
  _id: string;
  walletAddress: string;
  displayName: string;
  isAdmin: boolean;
  isClanLeader: boolean;
  adminRegions: string[];
  clan?: {
    name: string;
    tag: string;
  };
}

interface Clan {
  _id: string;
  name: string;
  tag: string;
  description?: string;
  region: string;
  country: string;
  leader: User;
  members: User[];
  maxMembers: number;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function GeneralAdminClient() {
  const { address } = useAccount();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [clans, setClans] = useState<Clan[]>([]);
  const [pendingClans, setPendingClans] = useState<Clan[]>([]);
  const [verifiedClans, setVerifiedClans] = useState<Clan[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'clans' | 'whitelist'>('users');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [adminRegions, setAdminRegions] = useState<string[]>([]);
  const [approvingClan, setApprovingClan] = useState<string | null>(null);

  useEffect(() => {
    if (address) {
      checkAuthorization();
      fetchData();
    }
  }, [address]);

  const handleTabChange = (tab: 'users' | 'clans' | 'whitelist') => {
    setActiveTab(tab);
  };

  const checkAuthorization = async () => {
    try {
      const response = await fetch(`/api/admin/check?walletAddress=${address}`);
      const data = await response.json();
      setIsAuthorized(data.isAdmin && data.role === 'super_admin');
      setLoading(false);
    } catch (error) {
      console.error('Error checking authorization:', error);
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const [usersResponse, clansResponse] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/clans')
      ]);
      
      const usersData = await usersResponse.json();
      const clansData = await clansResponse.json();
      
      console.log('Admin - Users fetched:', usersData.length);
      console.log('Admin - Clans fetched:', clansData);
      
      setUsers(usersData);
      setClans(clansData);
      
      // Separate pending and verified clans
      const pending = clansData.filter((clan: Clan) => !clan.isVerified);
      const verified = clansData.filter((clan: Clan) => clan.isVerified);
      
      setPendingClans(pending);
      setVerifiedClans(verified);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleToggleAdmin = async (user: User) => {
    try {
      const response = await fetch('/api/admin/whitelist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: user.walletAddress,
          isAdmin: !user.isAdmin,
          regions: adminRegions
        }),
      });

      if (response.ok) {
        fetchData();
        setSelectedUser(null);
        setAdminRegions([]);
      }
    } catch (error) {
      console.error('Error updating admin status:', error);
    }
  };

  const handleToggleClanLeader = async (user: User) => {
    try {
      const response = await fetch('/api/users/clan-leader', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: user.walletAddress,
          isClanLeader: !user.isClanLeader
        }),
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error updating clan leader status:', error);
    }
  };

  const handleApproveClan = async (clanId: string) => {
    try {
      setApprovingClan(clanId);
      const response = await fetch('/api/clans/admin', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clanId,
          action: 'approve',
          walletAddress: address
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve clan');
      }

      await fetchData();
      
    } catch (error) {
      console.error('Error approving clan:', error);
      alert(`Error approving clan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setApprovingClan(null);
    }
  };

  const handleRejectClan = async (clanId: string) => {
    try {
      setApprovingClan(clanId);
      const response = await fetch('/api/clans/admin', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clanId,
          action: 'reject',
          walletAddress: address
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject clan');
      }

      await fetchData();
      
    } catch (error) {
      console.error('Error rejecting clan:', error);
      alert(`Error rejecting clan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setApprovingClan(null);
    }
  };

  if (loading) {
    return (
      <WagmiGuard>
        <Layout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-lg text-white">Loading...</div>
          </div>
        </Layout>
      </WagmiGuard>
    );
  }

  if (!isAuthorized) {
    return (
      <WagmiGuard>
        <Layout>
          <div className="max-w-4xl mx-auto text-center">
            <div className="card p-8">
              <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
              <p className="text-gray-400">You do not have permission to access this page.</p>
            </div>
          </div>
        </Layout>
      </WagmiGuard>
    );
  }

  return (
    <WagmiGuard>
      <Layout title="Admin">
        <div className="max-w-7xl mx-auto">
          {/* Tab Navigation */}
          <div className="border-b border-white/10 mb-8">
            <nav className="flex space-x-8">
              {['users', 'clans', 'whitelist'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab as any)}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors capitalize ${
                    activeTab === tab
                      ? 'border-red-500 text-red-400'
                      : 'border-transparent text-muted hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'users' && (
            <div>
              <h2 className="heading-md mb-6">All Users</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-sm text-muted">Display Name</th>
                      <th className="text-left py-3 px-4 text-sm text-muted">Wallet</th>
                      <th className="text-left py-3 px-4 text-sm text-muted">Clan</th>
                      <th className="text-left py-3 px-4 text-sm text-muted">Admin</th>
                      <th className="text-left py-3 px-4 text-sm text-muted">Clan Leader</th>
                      <th className="text-left py-3 px-4 text-sm text-muted">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user._id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-3 px-4 text-white">{user.displayName}</td>
                        <td className="py-3 px-4 text-muted text-sm">
                          {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                        </td>
                        <td className="py-3 px-4 text-muted">
                          {user.clan ? `[${user.clan.tag}] ${user.clan.name}` : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`status-badge ${user.isAdmin ? 'status-active' : 'status-pending'}`}>
                            {user.isAdmin ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`status-badge ${user.isClanLeader ? 'status-active' : 'status-pending'}`}>
                            {user.isClanLeader ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="btn btn-sm btn-secondary"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'clans' && (
            <div className="space-y-8">
              {/* Pending Clans */}
              <div>
                <h2 className="heading-md mb-6 flex items-center gap-2">
                  Pending Clan Approvals
                  {pendingClans.length > 0 && (
                    <span className="px-2 py-1 bg-red-600 text-white text-sm rounded-full">
                      {pendingClans.length}
                    </span>
                  )}
                </h2>
                {pendingClans.length === 0 ? (
                  <div className="card p-8 text-center">
                    <p className="text-muted">No pending clan approvals.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingClans.map((clan) => (
                      <div key={clan._id} className="card p-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-4">
                              <h3 className="text-white font-semibold text-xl">{clan.name}</h3>
                              <span className="px-2 py-1 bg-blue-600 text-white text-sm rounded font-medium">
                                [{clan.tag}]
                              </span>
                              <span className="px-2 py-1 bg-yellow-600 text-white text-sm rounded font-medium">
                                Pending
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div>
                                <span className="text-muted text-sm">Leader:</span>
                                <p className="text-white">{clan.leader?.displayName || 'Unknown'}</p>
                              </div>
                              <div>
                                <span className="text-muted text-sm">Location:</span>
                                <p className="text-white">{clan.country}, {clan.region}</p>
                              </div>
                              <div>
                                <span className="text-muted text-sm">Members:</span>
                                <p className="text-white">{clan.members.length} / {clan.maxMembers}</p>
                              </div>
                            </div>
                            
                            {clan.description && (
                              <div className="mb-4">
                                <span className="text-muted text-sm">Description:</span>
                                <p className="text-gray-300 text-sm mt-1">{clan.description}</p>
                              </div>
                            )}
                            
                            <div className="text-xs text-muted">
                              Created: {new Date(clan.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          
                          <div className="flex gap-2 ml-6">
                            <button
                              onClick={() => handleApproveClan(clan._id)}
                              disabled={approvingClan === clan._id}
                              className="btn btn-primary disabled:opacity-50"
                            >
                              {approvingClan === clan._id ? 'Approving...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => handleRejectClan(clan._id)}
                              disabled={approvingClan === clan._id}
                              className="btn btn-outline text-red-400 border-red-400 hover:bg-red-500/20 disabled:opacity-50"
                            >
                              {approvingClan === clan._id ? 'Rejecting...' : 'Reject'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Verified Clans */}
              <div>
                <h2 className="heading-md mb-6">Verified Clans ({verifiedClans.length})</h2>
                {verifiedClans.length === 0 ? (
                  <div className="card p-8 text-center">
                    <p className="text-muted">No verified clans yet.</p>
                  </div>
                ) : (
                  <div className="grid-3">
                    {verifiedClans.map((clan) => (
                      <div key={clan._id} className="card-compact">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-white font-semibold text-lg">[{clan.tag}] {clan.name}</h3>
                            <p className="text-muted">Region: {clan.region}</p>
                            <span className="inline-block mt-2 px-2 py-1 bg-green-600 text-white text-xs rounded font-medium">
                              ✓ Verified
                            </span>
                          </div>
                          <span className="status-badge status-active">
                            {clan.members.length} members
                          </span>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm text-muted">
                            Leader: {clan.leader?.displayName || 'Unknown'}
                          </p>
                          <p className="text-sm text-muted">
                            Created: {new Date(clan.createdAt).toLocaleDateString()}
                          </p>
                          {clan.verifiedAt && (
                            <p className="text-sm text-muted">
                              Verified: {new Date(clan.verifiedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'whitelist' && (
            <div>
              <h2 className="heading-md mb-6">Admin Whitelist</h2>
              <div className="grid-2">
                {users.filter(u => u.isAdmin).map((user) => (
                  <div key={user._id} className="card-compact">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-white font-semibold">{user.displayName}</h3>
                        <p className="text-muted text-sm mt-1">
                          {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                        </p>
                        <p className="text-muted text-sm mt-2">
                          Regions: {user.adminRegions.length > 0 ? user.adminRegions.join(', ') : 'None'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleToggleAdmin(user)}
                        className="btn btn-sm btn-outline text-red-400 border-red-400 hover:bg-red-500/20"
                      >
                        Remove Admin
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User Management Modal */}
          {selectedUser && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
              <div className="card max-w-md w-full">
                <h3 className="heading-sm mb-4">Manage User</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-white font-medium">{selectedUser.displayName}</p>
                    <p className="text-muted text-sm">
                      {selectedUser.walletAddress}
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <button
                      onClick={() => handleToggleAdmin(selectedUser)}
                      className={`w-full btn ${selectedUser.isAdmin ? 'btn-outline' : 'btn-primary'}`}
                    >
                      {selectedUser.isAdmin ? 'Remove Admin Access' : 'Grant Admin Access'}
                    </button>
                    
                    <button
                      onClick={() => handleToggleClanLeader(selectedUser)}
                      className={`w-full btn ${selectedUser.isClanLeader ? 'btn-outline' : 'btn-primary'}`}
                    >
                      {selectedUser.isClanLeader ? 'Remove Clan Leader' : 'Make Clan Leader'}
                    </button>
                  </div>

                  {!selectedUser.isAdmin && (
                    <div className="form-group">
                      <label className="form-label">Admin Regions (comma separated)</label>
                      <input
                        type="text"
                        value={adminRegions.join(', ')}
                        onChange={(e) => setAdminRegions(e.target.value.split(',').map(r => r.trim()).filter(Boolean))}
                        className="input-field"
                        placeholder="e.g. NA, EU, ASIA"
                      />
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setAdminRegions([]);
                    }}
                    className="w-full btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </WagmiGuard>
  );
}