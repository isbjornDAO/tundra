"use client";

import { useState } from "react";
import { useRegisterTeam } from "@/hooks/useTournaments";
import { useTeam1Auth } from "@/hooks/useTeam1Auth";
import { REGIONS, type Region } from "@/types/tournament";

interface TournamentRegistrationProps {
  tournamentId: string;
  game: string;
  onSuccess?: () => void;
}

export function TournamentRegistration({ tournamentId, game, onSuccess }: TournamentRegistrationProps) {
  const { address } = useTeam1Auth();
  const registerTeam = useRegisterTeam();
  
  const [formData, setFormData] = useState({
    name: "",
    region: "" as Region,
    players: [
      { name: "", steamId: "" },
      { name: "", steamId: "" },
      { name: "", steamId: "" },
      { name: "", steamId: "" },
      { name: "", steamId: "" },
    ],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address) {
      alert("Please connect your wallet first");
      return;
    }

    const validPlayers = formData.players.filter(p => p.name.trim());
    if (validPlayers.length < 2) {
      alert("Please add at least 2 players");
      return;
    }

    const team = {
      name: formData.name,
      region: formData.region,
      organizer: address,
      players: validPlayers.map((p, i) => ({
        id: `${tournamentId}-${address}-${i}`,
        name: p.name,
        steamId: p.steamId || undefined,
      })),
    };

    try {
      await registerTeam.mutateAsync({ tournamentId, team });
      alert("Team registered successfully!");
      onSuccess?.();
    } catch (error) {
      console.error("Registration failed:", error);
      alert("Registration failed. Please try again.");
    }
  };

  const updatePlayer = (index: number, field: "name" | "steamId", value: string) => {
    const newPlayers = [...formData.players];
    newPlayers[index][field] = value;
    setFormData({ ...formData, players: newPlayers });
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-black/20 rounded-lg border border-white/10">
      <h2 className="text-2xl font-bold mb-6 text-white">Register Team for {game}</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-white mb-2">Team Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter team name"
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">Region</label>
          <select
            value={formData.region}
            onChange={(e) => setFormData({ ...formData, region: e.target.value as Region })}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="" className="text-black">Select Region</option>
            {REGIONS.map((region) => (
              <option key={region} value={region} className="text-black">
                {region}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-lg font-semibold text-white mb-4">Players</label>
          <div className="space-y-4">
            {formData.players.map((player, index) => (
              <div key={index} className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder={`Player ${index + 1} Name ${index < 2 ? "(Required)" : "(Optional)"}`}
                  value={player.name}
                  onChange={(e) => updatePlayer(index, "name", e.target.value)}
                  className="px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required={index < 2}
                />
                <input
                  type="text"
                  placeholder="Steam ID (Optional)"
                  value={player.steamId}
                  onChange={(e) => updatePlayer(index, "steamId", e.target.value)}
                  className="px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={registerTeam.isPending}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
        >
          {registerTeam.isPending ? "Registering..." : "Register Team"}
        </button>
      </form>
    </div>
  );
}