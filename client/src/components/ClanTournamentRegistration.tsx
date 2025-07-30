"use client";

import { useState, useEffect } from "react";
import { useTeam1Auth } from "@/hooks/useTeam1Auth";
import { useAuthGuard } from "@/providers/AuthGuard";

interface ClanTournamentRegistrationProps {
  tournamentId: string;
  game: string;
  onSuccess?: () => void;
}

interface ClanMember {
  _id: string;
  username: string;
  displayName: string;
  walletAddress: string;
}

export function ClanTournamentRegistration({ tournamentId, game, onSuccess }: ClanTournamentRegistrationProps) {
  const { address } = useTeam1Auth();
  const { user } = useAuthGuard();
  const [clanMembers, setClanMembers] = useState<ClanMember[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    const fetchClanMembers = async () => {
      if (!user?.clan?._id) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/clans/${user.clan._id}/members`);
        if (response.ok) {
          const data = await response.json();
          setClanMembers(data.members || []);
        }
      } catch (error) {
        console.error('Error fetching clan members:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClanMembers();
  }, [user?.clan?._id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address) {
      alert("Please connect your wallet first");
      return;
    }

    if (!user?.clan) {
      alert("You must be in a clan to register for tournaments");
      return;
    }

    if (selectedPlayers.length < 2) {
      alert("Please select at least 2 players for your roster");
      return;
    }

    setRegistering(true);

    try {
      // Get full player details for selected players
      const registeredPlayers = clanMembers
        .filter(member => selectedPlayers.includes(member._id))
        .map(member => ({
          userId: member._id,
          username: member.username,
          displayName: member.displayName,
          walletAddress: member.walletAddress
        }));

      const response = await fetch('/api/tournaments/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tournamentId,
          clanId: user.clan._id,
          organizer: address,
          selectedPlayers: registeredPlayers
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        alert(`Clan registered successfully for ${game} tournament!`);
        onSuccess?.();
      } else {
        alert(data.error || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error("Registration failed:", error);
      alert("Registration failed. Please try again.");
    } finally {
      setRegistering(false);
    }
  };

  const togglePlayerSelection = (playerId: string) => {
    setSelectedPlayers(prev => 
      prev.includes(playerId) 
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  if (!user?.clan) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-black/20 rounded-lg border border-white/10">
        <h2 className="text-2xl font-bold mb-6 text-white">Tournament Registration</h2>
        <div className="text-center py-8">
          <div className="text-yellow-400 mb-4 text-4xl">⚠️</div>
          <h3 className="text-white font-medium mb-2">Clan Required</h3>
          <p className="text-gray-400 text-sm">
            You must be in a clan to register for tournaments. Join or create a clan first.
          </p>
        </div>
      </div>
    );
  }

  if (!user.isClanLeader) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-black/20 rounded-lg border border-white/10">
        <h2 className="text-2xl font-bold mb-6 text-white">Tournament Registration</h2>
        <div className="text-center py-8">
          <div className="text-blue-400 mb-4 text-4xl">👑</div>
          <h3 className="text-white font-medium mb-2">Leader Only</h3>
          <p className="text-gray-400 text-sm">
            Only clan leaders can register their clan for tournaments.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-black/20 rounded-lg border border-white/10">
        <h2 className="text-2xl font-bold mb-6 text-white">Tournament Registration</h2>
        <div className="text-center py-8">
          <div className="text-gray-400">Loading clan members...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-black/20 rounded-lg border border-white/10">
      <h2 className="text-2xl font-bold mb-6 text-white">Register [{user.clan.tag}] {user.clan.name} for {game}</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-blue-400">ℹ️</div>
            <span className="text-blue-400 font-medium">Tournament Roster</span>
          </div>
          <p className="text-blue-300 text-sm">
            Select clan members who will compete in this tournament. Only selected players will be able to have their scores recorded in matches.
          </p>
        </div>

        <div>
          <label className="block text-lg font-semibold text-white mb-4">
            Select Players ({selectedPlayers.length} selected)
          </label>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {clanMembers.map((member) => (
              <div 
                key={member._id} 
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedPlayers.includes(member._id)
                    ? 'bg-blue-500/20 border-blue-500/40'
                    : 'bg-gray-800/50 border-gray-600/50 hover:bg-gray-800/70'
                }`}
                onClick={() => togglePlayerSelection(member._id)}
              >
                <input
                  type="checkbox"
                  checked={selectedPlayers.includes(member._id)}
                  onChange={() => togglePlayerSelection(member._id)}
                  className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {member.username?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <div className="text-white font-medium">{member.displayName || member.username}</div>
                    <div className="text-gray-400 text-sm">@{member.username}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {clanMembers.length === 0 && (
            <div className="text-center py-6 text-gray-400">
              <p>No clan members found</p>
            </div>
          )}
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-yellow-400">⚠️</div>
            <span className="text-yellow-400 font-medium">Important</span>
          </div>
          <ul className="text-yellow-300 text-sm space-y-1">
            <li>• Select at least 2 players (minimum requirement)</li>
            <li>• Only selected players can compete in tournament matches</li>
            <li>• Player roster is locked once tournament starts</li>
            <li>• Individual player stats will be tracked for selected members</li>
          </ul>
        </div>

        <button
          type="submit"
          disabled={registering || selectedPlayers.length < 2}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
        >
          {registering ? "Registering..." : `Register Clan (${selectedPlayers.length} players)`}
        </button>
      </form>
    </div>
  );
}