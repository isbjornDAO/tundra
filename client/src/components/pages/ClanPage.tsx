'use client';

import { useEffect, useState } from 'react';

interface ClanPageProps {
  walletAddress?: string;
}

interface ClanMessage {
  _id: string;
  content: string;
  sender: {
    _id: string;
    displayName: string;
    username: string;
    walletAddress: string;
    avatar?: string;
  };
  clan: string;
  messageType: 'text' | 'system' | 'announcement';
  createdAt: Date;
  updatedAt: Date;
}

interface Match {
  id: string;
  opponent: string;
  date: Date;
  type: string;
  status: 'upcoming' | 'live' | 'completed';
}

export function ClanPage({ walletAddress }: ClanPageProps) {
  const [messages, setMessages] = useState<ClanMessage[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [clanName, setClanName] = useState('');
  const [clanMembers, setClanMembers] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'matches' | 'stats' | 'manage'>('chat');
  const [clanId, setClanId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [clan, setClan] = useState<any>(null);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [managementLoading, setManagementLoading] = useState(false);

  useEffect(() => {
    if (walletAddress) {
      fetchClanData();
    }
  }, [walletAddress]);

  // Auto-refresh messages every 10 seconds when on chat tab
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (clanId && activeTab === 'chat') {
      interval = setInterval(() => {
        fetchMessages(clanId);
      }, 10000); // Refresh every 10 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [clanId, activeTab, walletAddress]);

  const fetchClanData = async () => {
    setLoading(true);
    try {
      // Fetch user data first to get clan information
      const userResponse = await fetch(`/api/users?walletAddress=${walletAddress}`);
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setCurrentUser(userData.user);
        
        if (userData.user && userData.user.clan) {
          const clanId = userData.user.clan._id || userData.user.clan;
          setClanId(clanId);
          
          // Fetch full clan details
          const clanResponse = await fetch(`/api/clans/${clanId}`);
          if (clanResponse.ok) {
            const clanData = await clanResponse.json();
            setClan(clanData.clan);
            setClanName(clanData.clan.name);
            setClanMembers(clanData.clan.members?.map((m: any) => m.username || m.displayName) || []);
            
            // Fetch clan messages
            await fetchMessages(clanId);
          }
        }
      }
      
      // Initialize matches (still mock for now)
      setMatches([]);
    } catch (error) {
      console.error('Error fetching clan data:', error);
      // Fallback to empty state
      setClanName('');
      setClanMembers([]);
      setMessages([]);
      setMatches([]);
      setClan(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (clanId: string) => {
    try {
      const response = await fetch(`/api/clans/${clanId}/messages?walletAddress=${walletAddress}&limit=50`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (newMessage.trim() && clanId && walletAddress) {
      try {
        const response = await fetch(`/api/clans/${clanId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: newMessage.trim(),
            walletAddress,
            messageType: 'text'
          })
        });

        if (response.ok) {
          const data = await response.json();
          setMessages(prev => [...prev, data.message]);
          setNewMessage('');
        } else {
          console.error('Failed to send message');
        }
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  };

  // Management functions
  const fetchJoinRequests = async () => {
    if (!clanId) return;
    
    setManagementLoading(true);
    try {
      const response = await fetch(`/api/clans/${clanId}/join-requests?walletAddress=${walletAddress}`);
      if (response.ok) {
        const data = await response.json();
        setJoinRequests(data.joinRequests || []);
      }
    } catch (error) {
      console.error('Error fetching join requests:', error);
    } finally {
      setManagementLoading(false);
    }
  };

  const handleJoinRequest = async (requestId: string, action: 'approve' | 'reject') => {
    if (!clanId) return;

    try {
      const response = await fetch(`/api/clans/${clanId}/join-requests`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action, walletAddress })
      });

      if (response.ok) {
        // Refresh join requests
        fetchJoinRequests();
        // Refresh clan data to update member count
        fetchClanData();
      }
    } catch (error) {
      console.error('Error handling join request:', error);
    }
  };

  const removeMember = async (memberWalletAddress: string) => {
    if (!clanId) return;

    try {
      const response = await fetch(`/api/clans/${clanId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, memberWalletAddress })
      });

      if (response.ok) {
        // Refresh clan data
        fetchClanData();
      }
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  const inviteMember = async (inviteWalletAddress: string) => {
    if (!clanId) return;

    try {
      const response = await fetch(`/api/clans/${clanId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, inviteWalletAddress })
      });

      if (response.ok) {
        // Refresh clan data
        fetchClanData();
      }
    } catch (error) {
      console.error('Error inviting member:', error);
    }
  };

  // Fetch join requests when management tab is opened
  useEffect(() => {
    if (activeTab === 'manage' && clan && currentUser && clan.leader === currentUser._id) {
      fetchJoinRequests();
    }
  }, [activeTab, clan, currentUser]);

  if (!walletAddress) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="bg-gray-800/50 rounded-lg p-8 border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
          <p className="text-gray-400">You need to connect your wallet to access clan features.</p>
        </div>
      </div>
    );
  }

  if (!loading && !clanId) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="bg-gray-800/50 rounded-lg p-8 border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-4">No Clan Found</h2>
          <p className="text-gray-400">You need to join a clan to access clan features.</p>
          <button className="btn btn-primary mt-4">
            Find a Clan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header - Same style as profile */}
      <div className="card">
        <div className="flex flex-col md:flex-row items-start gap-6">
          {/* Clan Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-32 h-32 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-4xl border-4 border-red-500 shadow-lg">
              {clanName?.[0] || 'C'}
            </div>
          </div>

          {/* Clan Details */}
          <div className="flex-1">
            <h1 className="heading-lg">{clanName || 'Your Clan'}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
              <span className="text-red-400 font-medium">{clanMembers.length} Members</span>
              <span className="text-muted">•</span>
              <span className="text-muted">Founded January 2024</span>
              <span className="text-muted">•</span>
              <span className="text-green-400">12 Active Now</span>
            </div>
            
            <div className="mt-6">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-blue-400">Rank #42</span>
                <span className="text-muted">•</span>
                <span className="text-green-400">75% Win Rate</span>
              </div>
              
              <div className="flex items-center gap-3 mt-6">
                <button className="btn btn-primary">
                  Invite Members
                </button>
                <button className="btn btn-secondary">
                  Clan Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-white/10">
        <nav className="flex space-x-8">
          {[
            { id: 'chat', label: 'Chat', icon: '💬' },
            { id: 'matches', label: 'Matches', icon: '⚔️' },
            { id: 'stats', label: 'Statistics', icon: '📊' },
            ...(clan && currentUser && clan.leader === currentUser._id ? [{ id: 'manage', label: 'Manage', icon: '⚙️' }] : [])
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
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Members & Matches */}
        <div className="lg:col-span-1 space-y-6">
          {/* Members */}
          <div className="card">
            <h3 className="heading-md mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Members ({clanMembers.length})
            </h3>
            <div className="space-y-3">
              {clanMembers.map((member, index) => (
                <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">{member[0]}</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-medium">{member}</div>
                    <div className="text-xs text-green-400">Online</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Matches */}
          <div className="card">
            <h3 className="heading-md mb-4">Upcoming Matches</h3>
            <div className="space-y-3">
              {matches.map((match) => (
                <div key={match.id} className="card-compact">
                  <div className="text-red-400 font-medium text-sm">{match.type}</div>
                  <div className="text-white text-sm mt-1">vs {match.opponent}</div>
                  <div className="text-muted text-xs mt-2">
                    {match.date.toLocaleDateString()} at {match.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <button className="btn btn-primary btn-sm w-full mt-3">
                    View Details
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="lg:col-span-3">
          <div className="card h-[600px] flex flex-col p-0">
            {/* Chat Header */}
            <div className="p-6 border-b border-white/10">
              <h2 className="heading-md">Clan Chat</h2>
              <p className="text-muted text-sm mt-1">Stay connected with your team</p>
            </div>

            {/* Messages */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="space-y-4">
                {loading && messages.length === 0 ? (
                  <div className="text-center text-muted">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-muted">No messages yet. Be the first to say hello!</div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg._id} className="flex items-start gap-3">
                      {msg.sender.avatar ? (
                        <img src={msg.sender.avatar} alt={msg.sender.displayName} className="w-10 h-10 rounded-full border-2 border-white/10" />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-bold">{msg.sender.displayName[0]?.toUpperCase()}</span>
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-white font-medium">{msg.sender.displayName}</span>
                          {msg.sender.username && (
                            <span className="text-muted text-xs">@{msg.sender.username}</span>
                          )}
                          <span className="text-muted text-xs">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-body mt-1">{msg.content}</p>
                        {msg.messageType === 'system' && (
                          <span className="inline-block bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded mt-1">
                            System
                          </span>
                        )}
                        {msg.messageType === 'announcement' && (
                          <span className="inline-block bg-yellow-500/20 text-yellow-400 text-xs px-2 py-1 rounded mt-1">
                            Announcement
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Message Input */}
            <div className="border-t border-white/10 p-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="input-field"
                />
                <button
                  onClick={sendMessage}
                  className="btn btn-primary"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Matches Tab */}
      {activeTab === 'matches' && (
        <div className="space-y-6">
          <h3 className="heading-md">Tournament Schedule</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matches.map((match) => (
              <div key={match.id} className="card">
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    match.status === 'upcoming' 
                      ? 'bg-blue-500/20 text-blue-400' 
                      : match.status === 'live'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-green-500/20 text-green-400'
                  }`}>
                    {match.status.toUpperCase()}
                  </span>
                  <span className="text-muted text-sm">{match.type}</span>
                </div>
                <h4 className="text-white font-semibold text-lg mb-2">vs {match.opponent}</h4>
                <div className="text-muted text-sm">
                  <div>{match.date.toLocaleDateString()}</div>
                  <div>{match.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <button className="btn btn-primary w-full mt-4">
                  View Details
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <h3 className="heading-md">Clan Performance</h3>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/5 rounded-lg p-4 border border-white/10 text-center">
              <div className="text-2xl font-bold text-red-400">12</div>
              <div className="text-sm text-gray-400">Total Wins</div>
            </div>
            <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20 text-center">
              <div className="text-2xl font-bold text-blue-400">8</div>
              <div className="text-sm text-blue-400">Tournaments</div>
            </div>
            <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20 text-center">
              <div className="text-2xl font-bold text-green-400">75%</div>
              <div className="text-sm text-green-400">Win Rate</div>
            </div>
            <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/20 text-center">
              <div className="text-2xl font-bold text-yellow-400">$2,450</div>
              <div className="text-sm text-yellow-400">Prize Pool</div>
            </div>
          </div>

          {/* Recent Performance */}
          <div className="card">
            <h4 className="heading-md mb-4">Recent Performance</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                    <span className="text-green-400 text-lg">W</span>
                  </div>
                  <div>
                    <div className="text-white font-medium">vs Thunder Clan</div>
                    <div className="text-muted text-sm">Off the Grid Tournament • 2 days ago</div>
                  </div>
                </div>
                <span className="text-green-400 font-medium">Victory</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                    <span className="text-red-400 text-lg">L</span>
                  </div>
                  <div>
                    <div className="text-white font-medium">vs Shadow Legion</div>
                    <div className="text-muted text-sm">Shatterline Tournament • 5 days ago</div>
                  </div>
                </div>
                <span className="text-red-400 font-medium">Defeat</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                    <span className="text-green-400 text-lg">W</span>
                  </div>
                  <div>
                    <div className="text-white font-medium">vs Fire Hawks</div>
                    <div className="text-muted text-sm">Counter-Strike 2 • 1 week ago</div>
                  </div>
                </div>
                <span className="text-green-400 font-medium">Victory</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Management Tab */}
      {activeTab === 'manage' && clan && currentUser && clan.leader === currentUser._id && (
        <div className="space-y-6">
          {/* Join Requests */}
          <div className="card">
            <h3 className="heading-md mb-4 flex items-center gap-2">
              <span>📋</span>
              Join Requests ({joinRequests.length})
            </h3>
            {managementLoading ? (
              <div className="text-center text-muted py-4">Loading requests...</div>
            ) : joinRequests.length === 0 ? (
              <div className="text-center text-muted py-4">No pending join requests</div>
            ) : (
              <div className="space-y-3">
                {joinRequests.map((request) => (
                  <div key={request._id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">
                          {request.user.username?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div>
                        <div className="text-white font-medium">{request.user.username}</div>
                        <div className="text-muted text-sm">{request.user.country}</div>
                        <div className="text-xs text-muted">
                          Requested {new Date(request.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleJoinRequest(request._id, 'approve')}
                        className="btn btn-sm bg-green-500 hover:bg-green-600 text-white"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleJoinRequest(request._id, 'reject')}
                        className="btn btn-sm bg-red-500 hover:bg-red-600 text-white"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Member Management */}
          <div className="card">
            <h3 className="heading-md mb-4 flex items-center gap-2">
              <span>👥</span>
              Manage Members
            </h3>
            <div className="space-y-3">
              {clan.members?.map((member: any) => (
                <div key={member._id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">
                        {member.username?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <div className="text-white font-medium flex items-center gap-2">
                        {member.username}
                        {member._id === clan.leader && (
                          <span className="text-yellow-400 text-xs">👑 Leader</span>
                        )}
                      </div>
                      <div className="text-muted text-sm">{member.country}</div>
                    </div>
                  </div>
                  {member._id !== clan.leader && (
                    <button
                      onClick={() => removeMember(member.walletAddress)}
                      className="btn btn-sm bg-red-500 hover:bg-red-600 text-white"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Invite Member */}
          <div className="card">
            <h3 className="heading-md mb-4 flex items-center gap-2">
              <span>✉️</span>
              Invite Member
            </h3>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Enter wallet address"
                className="input-field flex-1"
                id="invite-wallet-input"
              />
              <button
                onClick={() => {
                  const input = document.getElementById('invite-wallet-input') as HTMLInputElement;
                  if (input?.value.trim()) {
                    inviteMember(input.value.trim());
                    input.value = '';
                  }
                }}
                className="btn btn-primary"
              >
                Invite
              </button>
            </div>
            <p className="text-muted text-sm mt-2">
              Enter the wallet address of the player you want to invite to your clan.
            </p>
          </div>

          {/* Clan Settings */}
          <div className="card">
            <h3 className="heading-md mb-4 flex items-center gap-2">
              <span>⚙️</span>
              Clan Settings
            </h3>
            <div className="space-y-4">
              <button className="btn btn-secondary">
                Edit Clan Details
              </button>
              <button className="btn btn-secondary">
                Transfer Leadership
              </button>
              <button className="btn bg-red-500 hover:bg-red-600 text-white">
                Disband Clan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}