'use client';

import { useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { ConnectWallet } from '@/components/ConnectWallet';
import { Navigation } from '@/components/Navigation';
import { useTeam1Auth } from '@/hooks/useTeam1Auth';
import { REGIONS, type Region } from '@/types/tournament';

interface TeamResult {
  teamName: string;
  placement: number;
  totalScore: number;
  players: { name: string; score: number }[];
}

export default function TournamentResults() {
  const { address } = useTeam1Auth();
  const [selectedRegion, setSelectedRegion] = useState<Region | ''>('');
  const [teamResults, setTeamResults] = useState<TeamResult[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addTeamResult = () => {
    const newResult: TeamResult = {
      teamName: '',
      placement: teamResults.length + 1,
      totalScore: 0,
      players: Array(5).fill(null).map(() => ({ name: '', score: 0 }))
    };
    setTeamResults([...teamResults, newResult]);
  };

  const updateTeamResult = (index: number, field: keyof TeamResult, value: any) => {
    const updated = [...teamResults];
    updated[index] = { ...updated[index], [field]: value };
    setTeamResults(updated);
  };

  const updatePlayerResult = (teamIndex: number, playerIndex: number, field: 'name' | 'score', value: string | number) => {
    const updated = [...teamResults];
    updated[teamIndex].players[playerIndex] = {
      ...updated[teamIndex].players[playerIndex],
      [field]: value
    };
    
    // Recalculate total team score
    const totalScore = updated[teamIndex].players.reduce((sum, player) => sum + player.score, 0);
    updated[teamIndex].totalScore = totalScore;
    
    setTeamResults(updated);
  };

  const removeTeamResult = (index: number) => {
    const updated = teamResults.filter((_, i) => i !== index);
    // Update placements
    updated.forEach((team, i) => {
      team.placement = i + 1;
    });
    setTeamResults(updated);
  };

  const sortByPlacement = () => {
    const sorted = [...teamResults].sort((a, b) => a.placement - b.placement);
    setTeamResults(sorted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRegion || teamResults.length === 0) return;

    // Ensure we have a winner (1st place)
    const winner = teamResults.find(team => team.placement === 1);
    if (!winner) {
      alert('Please ensure one team has 1st place placement');
      return;
    }

    setIsSubmitting(true);
    
    // TODO: Implement actual submission to backend/smart contract
    console.log('Submitting results:', {
      region: selectedRegion,
      organizer: address,
      results: teamResults,
      winner: winner
    });

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    alert('Tournament results submitted successfully!');
    setIsSubmitting(false);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <header className="p-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Tundra</h1>
          <ConnectWallet />
        </header>
        <Navigation />

        <main className="container mx-auto px-6 py-12">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-white mb-8 text-center">
              Submit Tournament Results
            </h2>

            <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-sm rounded-lg p-8 border border-white/20">
              <div className="mb-8">
                <label className="block text-white text-lg font-semibold mb-4">
                  Tournament Region
                </label>
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value as Region)}
                  className="w-full p-3 rounded-lg bg-white/20 text-white border border-white/30 focus:border-blue-400 focus:outline-none"
                  required
                >
                  <option value="">Choose a region...</option>
                  {REGIONS.map(region => (
                    <option key={region} value={region} className="text-black">
                      {region}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-white">Team Results</h3>
                  <div className="space-x-4">
                    <button
                      type="button"
                      onClick={sortByPlacement}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Sort by Placement
                    </button>
                    <button
                      type="button"
                      onClick={addTeamResult}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Add Team Result
                    </button>
                  </div>
                </div>

                {teamResults.map((result, teamIndex) => (
                  <div key={teamIndex} className="mb-6 p-6 bg-white/5 rounded-lg border border-white/10">
                    <div className="grid md:grid-cols-4 gap-4 mb-4">
                      <input
                        type="text"
                        placeholder="Team Name"
                        value={result.teamName}
                        onChange={(e) => updateTeamResult(teamIndex, 'teamName', e.target.value)}
                        className="bg-white/20 text-white p-2 rounded border border-white/30 focus:border-blue-400 focus:outline-none"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Placement"
                        min="1"
                        value={result.placement}
                        onChange={(e) => updateTeamResult(teamIndex, 'placement', parseInt(e.target.value) || 1)}
                        className="bg-white/20 text-white p-2 rounded border border-white/30 focus:border-blue-400 focus:outline-none"
                        required
                      />
                      <div className="bg-white/10 text-white p-2 rounded border border-white/20 flex items-center">
                        <span className="text-sm">Total Score: {result.totalScore}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTeamResult(teamIndex)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded transition-colors"
                      >
                        Remove Team
                      </button>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {result.players.map((player, playerIndex) => (
                        <div key={playerIndex} className="space-y-2">
                          <input
                            type="text"
                            placeholder={`Player ${playerIndex + 1} Name`}
                            value={player.name}
                            onChange={(e) => updatePlayerResult(teamIndex, playerIndex, 'name', e.target.value)}
                            className="w-full p-2 rounded bg-white/20 text-white border border-white/30 focus:border-blue-400 focus:outline-none"
                            required
                          />
                          <input
                            type="number"
                            placeholder="Score"
                            min="0"
                            value={player.score || ''}
                            onChange={(e) => updatePlayerResult(teamIndex, playerIndex, 'score', parseInt(e.target.value) || 0)}
                            className="w-full p-2 rounded bg-white/20 text-white border border-white/30 focus:border-blue-400 focus:outline-none"
                            required
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-yellow-600/20 border border-yellow-400/30 rounded-lg p-4 mb-6">
                <h4 className="text-yellow-300 font-semibold mb-2">Important Notes:</h4>
                <ul className="text-yellow-200 text-sm space-y-1">
                  <li>• Ensure one team has placement #1 - they will qualify for the global bracket</li>
                  <li>• Player scores should reflect their individual performance in the tournament</li>
                  <li>• Double-check all information before submitting - results cannot be easily modified</li>
                </ul>
              </div>

              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedRegion || teamResults.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
                >
                  {isSubmitting ? 'Submitting Results...' : 'Submit Tournament Results'}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}