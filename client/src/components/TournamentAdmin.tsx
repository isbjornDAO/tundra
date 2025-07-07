"use client";

import { useState } from "react";
import { useTournaments, useCreateTournament, useGenerateBracket, useTeams } from "@/hooks/useTournaments";
import { GAMES, type Game } from "@/types/tournament";

export function TournamentAdmin() {
  const { data: tournamentsData, refetch } = useTournaments();
  const createTournament = useCreateTournament();
  const generateBracket = useGenerateBracket();
  
  const [selectedGame, setSelectedGame] = useState<Game | "">("");
  const [maxTeams, setMaxTeams] = useState(16);

  const tournaments = tournamentsData?.tournaments || [];

  const handleCreateTournament = async () => {
    if (!selectedGame) return;

    try {
      await createTournament.mutateAsync({
        game: selectedGame,
        maxTeams,
      });
      alert("Tournament created successfully!");
      setSelectedGame("");
      setMaxTeams(16);
    } catch (error) {
      console.error("Failed to create tournament:", error);
      alert("Failed to create tournament");
    }
  };

  const handleGenerateBracket = async (tournamentId: string) => {
    try {
      await generateBracket.mutateAsync({ tournamentId });
      alert("Bracket generated successfully!");
      refetch();
    } catch (error) {
      console.error("Failed to generate bracket:", error);
      alert("Failed to generate bracket");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-white">Tournament Administration</h1>

      {/* Create Tournament */}
      <div className="bg-black/20 rounded-lg border border-white/10 p-6">
        <h2 className="text-xl font-bold mb-4 text-white">Create New Tournament</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-white">Game</label>
            <select
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value as Game)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" className="text-black">Select Game</option>
              {GAMES.map((game) => (
                <option key={game} value={game} className="text-black">
                  {game}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-white">Max Teams</label>
            <input
              type="number"
              value={maxTeams}
              onChange={(e) => setMaxTeams(parseInt(e.target.value))}
              min="4"
              max="32"
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleCreateTournament}
              disabled={!selectedGame || createTournament.isPending}
              className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
            >
              {createTournament.isPending ? "Creating..." : "Create Tournament"}
            </button>
          </div>
        </div>
      </div>

      {/* Tournament List */}
      <div className="bg-black/20 rounded-lg border border-white/10 p-6">
        <h2 className="text-xl font-bold mb-4 text-white">Active Tournaments</h2>
        
        <div className="space-y-4">
          {tournaments.map((tournament: any) => (
            <TournamentCard
              key={tournament._id}
              tournament={tournament}
              onGenerateBracket={handleGenerateBracket}
              generateBracketPending={generateBracket.isPending}
            />
          ))}
          
          {tournaments.length === 0 && (
            <p className="text-gray-400 text-center py-8">No tournaments found</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface TournamentCardProps {
  tournament: any;
  onGenerateBracket: (tournamentId: string) => void;
  generateBracketPending: boolean;
}

function TournamentCard({ tournament, onGenerateBracket, generateBracketPending }: TournamentCardProps) {
  const { data: teamsData } = useTeams(tournament._id);
  const teams = teamsData?.teams || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-green-600 text-white";
      case "full": return "bg-yellow-600 text-white";
      case "active": return "bg-blue-600 text-white";
      case "completed": return "bg-gray-600 text-white";
      default: return "bg-gray-600 text-white";
    }
  };

  return (
    <div className="bg-black/10 border border-white/20 rounded-lg p-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{tournament.game}</h3>
          <p className="text-gray-300">
            {tournament.registeredTeams}/{tournament.maxTeams} teams registered
          </p>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(tournament.status)}`}>
          {tournament.status.toUpperCase()}
        </span>
      </div>

      <div className="mb-4">
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(tournament.registeredTeams / tournament.maxTeams) * 100}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-300 mb-4">
        <div>
          <span className="font-medium text-white">Created:</span>
          <br />
          {new Date(tournament.createdAt).toLocaleDateString()}
        </div>
        <div>
          <span className="font-medium text-white">Teams:</span>
          <br />
          {teams.length} registered
        </div>
        <div>
          <span className="font-medium text-white">Max Teams:</span>
          <br />
          {tournament.maxTeams}
        </div>
        <div>
          <span className="font-medium text-white">Slots Left:</span>
          <br />
          {tournament.maxTeams - tournament.registeredTeams}
        </div>
      </div>

      {tournament.status === "full" && !tournament.bracketId && (
        <button
          onClick={() => onGenerateBracket(tournament._id)}
          disabled={generateBracketPending}
          className="py-2 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
        >
          {generateBracketPending ? "Generating..." : "Generate Bracket"}
        </button>
      )}

      {tournament.bracketId && (
        <div className="flex gap-2 items-center">
          <span className="text-green-400 text-sm font-medium">✓ Bracket Generated</span>
          <button
            onClick={() => window.open(`/tournament/bracket?tournamentId=${tournament._id}`, "_blank")}
            className="py-1 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            View Bracket
          </button>
        </div>
      )}

      {teams.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-blue-400 hover:text-blue-300">
            View Registered Teams ({teams.length})
          </summary>
          <div className="mt-2 space-y-2">
            {teams.map((team: any, index: number) => (
              <div key={team._id} className="text-sm border-l-2 border-white/20 pl-3">
                <div className="font-medium text-white">{team.name}</div>
                <div className="text-gray-300">{team.region}</div>
                <div className="text-xs text-gray-400">
                  {team.players?.length || 0} players • Organizer: {team.organizer.slice(0, 8)}...
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}