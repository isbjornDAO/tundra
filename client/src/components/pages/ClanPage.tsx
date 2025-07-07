'use client';

import { useEffect, useState } from 'react';

interface ClanPageProps {
  walletAddress?: string;
}

interface ClanMessage {
  id: string;
  sender: string;
  message: string;
  timestamp: Date;
  senderPhoto?: string;
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

  useEffect(() => {
    if (walletAddress) {
      // TODO: Fetch clan data from backend
      setClanName('Elite Warriors');
      setClanMembers(['Player1', 'Player2', 'Player3', 'Player4', 'Player5']);
      
      // TODO: Fetch real messages from backend
      setMessages([
        {
          id: '1',
          sender: 'Player1',
          message: 'Ready for the next match!',
          timestamp: new Date(Date.now() - 3600000)
        },
        {
          id: '2',
          sender: 'Player2',
          message: 'Great game everyone!',
          timestamp: new Date(Date.now() - 7200000)
        },
        {
          id: '3',
          sender: 'Player3',
          message: 'Who wants to practice before the tournament?',
          timestamp: new Date(Date.now() - 10800000)
        }
      ]);

      // TODO: Fetch real matches from backend
      setMatches([
        {
          id: '1',
          opponent: 'Thunder Clan',
          date: new Date(Date.now() + 86400000),
          type: '5v5 Tournament',
          status: 'upcoming'
        },
        {
          id: '2',
          opponent: 'Shadow Legion',
          date: new Date(Date.now() + 172800000),
          type: '3v3 Ranked',
          status: 'upcoming'
        },
        {
          id: '3',
          opponent: 'Fire Hawks',
          date: new Date(Date.now() + 259200000),
          type: 'Clan War',
          status: 'upcoming'
        }
      ]);
    }
  }, [walletAddress]);

  const sendMessage = () => {
    if (newMessage.trim()) {
      // TODO: Send message to backend
      const message: ClanMessage = {
        id: Date.now().toString(),
        sender: 'You',
        message: newMessage,
        timestamp: new Date()
      };
      setMessages([...messages, message]);
      setNewMessage('');
    }
  };

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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 rounded-xl p-6 border border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">{clanName || 'Your Clan'}</h1>
            <p className="text-gray-400 mt-1">{clanMembers.length} members online</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              Invite Members
            </button>
            <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              Clan Settings
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Members & Matches */}
        <div className="lg:col-span-1 space-y-6">
          {/* Members */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-white/10">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Members ({clanMembers.length})
            </h3>
            <div className="space-y-2">
              {clanMembers.map((member, index) => (
                <div key={index} className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{member[0]}</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{member}</div>
                    <div className="text-xs text-green-400">Online</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Matches */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-white/10">
            <h3 className="text-white font-semibold mb-3">Upcoming Matches</h3>
            <div className="space-y-3">
              {matches.map((match) => (
                <div key={match.id} className="bg-gray-900/50 rounded-lg p-3 border border-white/5">
                  <div className="text-orange-400 font-medium text-sm">{match.type}</div>
                  <div className="text-white text-sm mt-1">vs {match.opponent}</div>
                  <div className="text-gray-400 text-xs mt-1">
                    {match.date.toLocaleDateString()} at {match.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <button className="w-full mt-2 bg-orange-500 hover:bg-orange-600 text-white text-xs py-1 rounded transition-colors">
                    View Details
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="lg:col-span-3">
          <div className="bg-gray-800/50 rounded-lg border border-white/10 h-[600px] flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white">Clan Chat</h2>
              <p className="text-gray-400 text-sm">Stay connected with your team</p>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id} className="flex items-start gap-3">
                    {msg.senderPhoto ? (
                      <img src={msg.senderPhoto} alt={msg.sender} className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{msg.sender[0]}</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-white font-medium">{msg.sender}</span>
                        <span className="text-gray-500 text-xs">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-gray-300 mt-1">{msg.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Message Input */}
            <div className="border-t border-white/10 p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-900 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 border border-white/10"
                />
                <button
                  onClick={sendMessage}
                  className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-6 py-2 transition-colors font-medium"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clan Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-white/10 text-center">
          <div className="text-2xl font-bold text-orange-400">12</div>
          <div className="text-gray-400 text-sm">Total Wins</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-white/10 text-center">
          <div className="text-2xl font-bold text-blue-400">8</div>
          <div className="text-gray-400 text-sm">Tournaments</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-white/10 text-center">
          <div className="text-2xl font-bold text-green-400">75%</div>
          <div className="text-gray-400 text-sm">Win Rate</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-white/10 text-center">
          <div className="text-2xl font-bold text-purple-400">$2,450</div>
          <div className="text-gray-400 text-sm">Prize Pool</div>
        </div>
      </div>
    </div>
  );
}