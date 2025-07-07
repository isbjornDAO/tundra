'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ClanWindowProps {
  isOpen: boolean;
  onClose: () => void;
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

export function ClanWindow({ isOpen, onClose, walletAddress }: ClanWindowProps) {
  const [messages, setMessages] = useState<ClanMessage[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [clanName, setClanName] = useState('');
  const [clanMembers, setClanMembers] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && walletAddress) {
      // TODO: Fetch clan data from backend
      // For now, using placeholder data
      setClanName('Elite Warriors');
      setClanMembers(['Player1', 'Player2', 'Player3']);
      
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
        }
      ]);
    }
  }, [isOpen, walletAddress]);

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

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/90 backdrop-blur-sm overflow-auto"
      style={{ zIndex: 99999 }}
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
      
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gray-900 border-2 border-orange-500 rounded-lg overflow-hidden h-[80vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-600 to-red-600 p-4">
              <h2 className="text-2xl font-bold text-white">{clanName || 'Your Clan'}</h2>
            </div>

        <div className="flex h-[calc(100%-4rem)]">
          {/* Left sidebar - Members */}
          <div className="w-64 bg-gray-800 p-4 border-r border-gray-700">
            <h3 className="text-white font-semibold mb-3">Members ({clanMembers.length})</h3>
            <div className="space-y-2">
              {clanMembers.map((member, index) => (
                <div key={index} className="flex items-center gap-2 text-gray-300">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">{member}</span>
                </div>
              ))}
            </div>

            {/* Upcoming Matches */}
            <h3 className="text-white font-semibold mt-6 mb-3">Upcoming Matches</h3>
            <div className="space-y-3">
              {matches.map((match) => (
                <div key={match.id} className="bg-gray-900 rounded p-3">
                  <div className="text-orange-400 font-medium text-sm">{match.type}</div>
                  <div className="text-white text-sm mt-1">vs {match.opponent}</div>
                  <div className="text-gray-400 text-xs mt-1">
                    {match.date.toLocaleDateString()} at {match.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col">
            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-3">
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

            {/* Message input */}
            <div className="border-t border-gray-700 p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  onClick={sendMessage}
                  className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-6 py-2 transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
    </div>,
    document.body
  );
}