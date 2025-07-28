'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { COUNTRY_CODE_TO_NAME, COUNTRY_NAME_TO_CODE } from '@/types/countries';
import { useAuth } from "@/providers/AuthGuard";

interface User {
  _id: string;
  walletAddress: string;
  displayName: string;
  country: string;
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

interface ClanRequest {
  _id: string;
  requestedBy: User;
  clanName: string;
  clanTag: string;
  description?: string;
  logo?: string;
  country: string;
  region: string;
  locationProof?: string;
  status: 'pending' | 'approved' | 'rejected';
  assignedHost?: User;
  reviewedBy?: User;
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
}

// Function to get flag emoji from country name or code
const getCountryFlag = (country: string): string => {
  if (!country) return '🌍';
  
  // If it's already a 2-letter code, use it directly
  if (country.length === 2) {
    const codePoints = country
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  }
  
  // If it's a country name, convert to code using the imported mapping
  const countryCode = COUNTRY_NAME_TO_CODE[country];
  if (!countryCode) {
    console.log('Unknown country name:', country);
    return '🌍';
  }
  
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  
  return String.fromCodePoint(...codePoints);
};

// Function to get country display name (for tooltips)
const getCountryDisplayName = (country: string): string => {
  if (!country) return 'Unknown';
  
  // If it's a 2-letter code, convert to name
  if (country.length === 2) {
    return COUNTRY_CODE_TO_NAME[country.toUpperCase()] || country;
  }
  
  // If it's already a name, return as-is
  return country;
};

export default function GeneralAdminClient() {
  const { address, adminData } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [clans, setClans] = useState<Clan[]>([]);
  const [clanRequests, setClanRequests] = useState<ClanRequest[]>([]);
  const [pendingClans, setPendingClans] = useState<Clan[]>([]);
  const [verifiedClans, setVerifiedClans] = useState<Clan[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'clans' | 'whitelist'>('users');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [adminRegions, setAdminRegions] = useState<string[]>([]);
  const [approvingClan, setApprovingClan] = useState<string | null>(null);

  useEffect(() => {
    if (address) {
      setIsAuthorized(!!adminData?.isAdmin);
      fetchData();
      setLoading(false);
    }
  }, [address, adminData]);

  const handleTabChange = (tab: 'users' | 'clans' | 'whitelist') => {
    setActiveTab(tab);
  };

  const fetchData = async () => {
    try {
      const [usersResponse, clansResponse, clanRequestsResponse] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/clans'),
        fetch(`/api/clan-requests?walletAddress=${address}`)
      ]);
      
      const usersData = await usersResponse.json();
      const clansData = await clansResponse.json();
      const clanRequestsData = await clanRequestsResponse.json();
      
      console.log('Admin - Users fetched:', usersData.length);
      console.log('Admin - Clans fetched:', clansData);
      console.log('Admin - Clan requests fetched:', clanRequestsData);
      
      setUsers(usersData);
      setClans(clansData);
      setClanRequests(clanRequestsData);
      
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

  const handleApproveClanRequest = async (requestId: string) => {
    try {
      setApprovingClan(requestId);
      console.log('Approving clan request:', requestId, 'with address:', address);
      
      const response = await fetch(`/api/clan-requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'approved',
          reviewerWallet: address,
          reviewNotes: 'Approved by admin'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Clan request approval failed:', errorData);
        throw new Error(errorData.error || 'Failed to approve clan request');
      }

      const result = await response.json();
      console.log('Clan request approval success:', result);
      await fetchData();
      
    } catch (error) {
      console.error('Error approving clan request:', error);
      alert(`Error approving clan request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setApprovingClan(null);
    }
  };

  const handleRejectClanRequest = async (requestId: string) => {
    try {
      setApprovingClan(requestId);
      console.log('Rejecting clan request:', requestId, 'with address:', address);
      
      const response = await fetch(`/api/clan-requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'rejected',
          reviewerWallet: address,
          reviewNotes: 'Rejected by admin'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Clan request rejection failed:', errorData);
        throw new Error(errorData.error || 'Failed to reject clan request');
      }

      const result = await response.json();
      console.log('Clan request rejection success:', result);
      await fetchData();
      
    } catch (error) {
      console.error('Error rejecting clan request:', error);
      alert(`Error rejecting clan request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setApprovingClan(null);
    }
  };

  const handleApproveClan = async (clanId: string) => {
    try {
      setApprovingClan(clanId);
      console.log('Approving clan:', clanId, 'with address:', address);
      
      const response = await fetch('/api/clans/admin', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${address}`,
        },
        body: JSON.stringify({
          clanId,
          action: 'approve',
          walletAddress: address
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Clan approval failed:', errorData);
        throw new Error(errorData.error || 'Failed to approve clan');
      }

      const result = await response.json();
      console.log('Clan approval success:', result);
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
      console.log('Rejecting clan:', clanId, 'with address:', address);
      
      const response = await fetch('/api/clans/admin', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${address}`,
        },
        body: JSON.stringify({
          clanId,
          action: 'reject',
          walletAddress: address
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Clan rejection failed:', errorData);
        throw new Error(errorData.error || 'Failed to reject clan');
      }

      const result = await response.json();
      console.log('Clan rejection success:', result);
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
        <Layout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-lg text-white">Loading...</div>
          </div>
        </Layout>
    );
  }

  if (!isAuthorized) {
    return (
        <Layout>
          <div className="max-w-4xl mx-auto text-center">
            <div className="card p-8">
              <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
              <p className="text-gray-400">You do not have permission to access this page.</p>
            </div>
          </div>
        </Layout>
    );
  }

  return (
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
                      <th className="text-left py-3 px-4 text-sm text-muted">Country</th>
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
                        <td className="py-3 px-4 text-center">
                          <div className="relative group inline-block">
                            <span className="text-xl cursor-default">
                              {getCountryFlag(user.country)}
                            </span>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                              {getCountryDisplayName(user.country)}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-white">
                          {user.displayName}
                        </td>
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
              {/* Pending Clan Requests */}
              <div>
                <h2 className="heading-md mb-6 flex items-center gap-2">
                  Pending Clan Requests
                  {clanRequests.filter(req => req.status === 'pending').length > 0 && (
                    <span className="px-2 py-1 bg-red-600 text-white text-sm rounded-full">
                      {clanRequests.filter(req => req.status === 'pending').length}
                    </span>
                  )}
                </h2>
                {clanRequests.filter(req => req.status === 'pending').length === 0 ? (
                  <div className="card p-8 text-center">
                    <p className="text-muted">No pending clan requests.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {clanRequests.filter(req => req.status === 'pending').map((request) => (
                      <div key={request._id} className="card p-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-4">
                              <h3 className="text-white font-semibold text-xl">{request.clanName}</h3>
                              <span className="px-2 py-1 bg-blue-600 text-white text-sm rounded font-medium">
                                [{request.clanTag}]
                              </span>
                              <span className="px-2 py-1 bg-yellow-600 text-white text-sm rounded font-medium">
                                Pending
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div>
                                <span className="text-muted text-sm">Requested by:</span>
                                <p className="text-white">{request.requestedBy?.displayName || 'Unknown'}</p>
                                <p className="text-muted text-xs">{request.requestedBy?.walletAddress?.slice(0, 6)}...{request.requestedBy?.walletAddress?.slice(-4)}</p>
                              </div>
                              <div>
                                <span className="text-muted text-sm">Location:</span>
                                <p className="text-white flex items-center gap-2">
                                  <span>{getCountryFlag(request.country)}</span>
                                  {request.country}, {request.region}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted text-sm">Assigned Host:</span>
                                <p className="text-white">{request.assignedHost?.displayName || 'None'}</p>
                              </div>
                            </div>
                            
                            {request.description && (
                              <div className="mb-4">
                                <span className="text-muted text-sm">Description:</span>
                                <p className="text-gray-300 text-sm mt-1">{request.description}</p>
                              </div>
                            )}
                            
                            <div className="text-xs text-muted">
                              Requested: {new Date(request.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          
                          <div className="flex gap-2 ml-6">
                            <button
                              onClick={() => handleApproveClanRequest(request._id)}
                              disabled={approvingClan === request._id}
                              className="btn btn-primary disabled:opacity-50"
                            >
                              {approvingClan === request._id ? 'Approving...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => handleRejectClanRequest(request._id)}
                              disabled={approvingClan === request._id}
                              className="btn btn-outline text-red-400 border-red-400 hover:bg-red-500/20 disabled:opacity-50"
                            >
                              {approvingClan === request._id ? 'Rejecting...' : 'Reject'}
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
  );
}