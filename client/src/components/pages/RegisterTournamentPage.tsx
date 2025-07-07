'use client';

import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useTournaments } from '@/hooks/useTournaments';
import { useTeam1Auth } from '@/hooks/useTeam1Auth';
import { REGIONS, type Game, type Region, type Player } from '@/types/tournament';

type Step = 'game' | 'team' | 'players' | 'confirm';

export default function RegisterTournamentPage() {
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>('game');
  const [selectedGame, setSelectedGame] = useState<Game | ''>('');
  const [teamName, setTeamName] = useState('');
  const [teamRegion, setTeamRegion] = useState<Region | ''>('');
  const [players, setPlayers] = useState<Player[]>(
    Array(5).fill(null).map((_, i) => ({ id: `${Date.now()}-${i}`, name: '', steamId: '' }))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { data: tournamentsData, isLoading, error } = useTournaments();
  const tournaments = tournamentsData?.tournaments || [];
  const { address } = useTeam1Auth();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Layout>
        <div className="text-white text-center py-8">Loading...</div>
      </Layout>
    );
  }

  const updatePlayer = (playerIndex: number, field: 'name' | 'steamId', value: string) => {
    const updatedPlayers = [...players];
    updatedPlayers[playerIndex][field] = value;
    setPlayers(updatedPlayers);
  };

  const nextStep = () => {
    if (currentStep === 'game') setCurrentStep('team');
    else if (currentStep === 'team') setCurrentStep('players');
    else if (currentStep === 'players') setCurrentStep('confirm');
  };

  const prevStep = () => {
    if (currentStep === 'confirm') setCurrentStep('players');
    else if (currentStep === 'players') setCurrentStep('team');
    else if (currentStep === 'team') setCurrentStep('game');
  };

  const handleSubmit = async () => {
    const selectedTournament = tournaments.find(t => t.game === selectedGame);
    if (!selectedTournament || selectedTournament.status !== 'open') {
      alert('Tournament is not available for registration');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/tournaments/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentId: selectedTournament._id,
          team: {
            name: teamName,
            region: teamRegion,
            organizer: address,
            players: players.filter(p => p.name.trim() !== '').map((p, i) => ({
              id: `${selectedTournament._id}-${address}-${i}`,
              name: p.name,
              steamId: p.steamId || undefined,
            })),
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to register team');
      }

      alert(`Team "${teamName}" successfully registered for ${selectedGame} tournament!`);
      
      // Reset form
      setTeamName('');
      setTeamRegion('');
      setSelectedGame('');
      setPlayers(Array(5).fill(null).map((_, i) => ({ id: `${Date.now()}-${i}`, name: '', steamId: '' })));
      setCurrentStep('game');
      
    } catch (error) {
      console.error('Registration failed:', error);
      alert('Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTournament = tournaments.find(t => t.game === selectedGame);
  const canProceedFromGame = selectedGame && selectedTournament?.status === 'open';
  const canProceedFromTeam = teamName && teamRegion;
  const canProceedFromPlayers = players.filter(p => p.name.trim() !== '').length >= 3;

  const InfoModal = () => {
    const [showInfo, setShowInfo] = useState(false);
  
    return (
      <>
        <button
          onClick={() => setShowInfo(true)}
          className="w-6 h-6 rounded-full border border-gray-400 text-gray-400 hover:border-white hover:text-white transition-colors flex items-center justify-center text-sm ml-3"
        >
          i
        </button>
  
        {showInfo && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="card max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="heading-md">Registration Information</h3>
                <button onClick={() => setShowInfo(false)} className="text-gray-400 hover:text-white text-2xl">×</button>
              </div>
              
              <div className="space-y-3 text-body text-sm">
                <div>
                  <h4 className="text-white font-medium mb-2">🎮 How to Register</h4>
                  <ul className="space-y-1 text-gray-300">
                    <li>• Choose your game from available tournaments</li>
                    <li>• Enter your team name and select region</li>
                    <li>• Add minimum 3 players to your roster</li>
                    <li>• Review and confirm your registration</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-white font-medium mb-2">⚠️ Important Notes</h4>
                  <ul className="space-y-1 text-gray-300">
                    <li>• Only Team1 verified members can organize</li>
                    <li>• Registration closes when tournament is full</li>
                    <li>• Match scheduling happens after registration</li>
                    <li>• Contact opponents via Team1 Discord</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-white font-medium mb-2">🏆 Tournament Rules</h4>
                  <ul className="space-y-1 text-gray-300">
                    <li>• Single elimination format</li>
                    <li>• 16 teams maximum per tournament</li>
                    <li>• Matches played on Team1 Discord</li>
                    <li>• Winners advance to next round</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  const StepIndicator = () => (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center">
        <h2 className="text-2xl font-bold text-white">Register for Tournament</h2>
        <InfoModal />
      </div>
      <div className="flex items-center space-x-2">
        {['game', 'team', 'players', 'confirm'].map((step, index) => (
          <div key={step} className="flex items-center">
            <div 
              className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                currentStep === step 
                  ? 'bg-white text-black' 
                  : ['game', 'team', 'players', 'confirm'].indexOf(currentStep) > index
                  ? 'bg-gray-500 text-white'
                  : 'bg-gray-600 text-gray-300'
              }`}
            >
              {['game', 'team', 'players', 'confirm'].indexOf(currentStep) > index ? '✓' : index + 1}
            </div>
            {index < 3 && (
              <div 
                className={`w-7 h-0.5 transition-colors ${
                  ['game', 'team', 'players', 'confirm'].indexOf(currentStep) > index 
                    ? 'bg-gray-500' 
                    : 'bg-gray-600'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  if (isLoading) return <Layout><div className="text-white text-center py-8">Loading tournaments...</div></Layout>;
  if (error) return <Layout><div className="text-red-400 text-center py-8">Error loading tournaments</div></Layout>;

  return (
    <Layout>
        <div className="max-w-6xl mx-auto">
          <StepIndicator />

          {/* Step 1: Choose Game */}
          {currentStep === 'game' && (
            <div className="card">
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold mb-2">Choose Your Game</h2>
                <p className="text-body text-sm">Select which tournament you want to join</p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                {tournaments.map((tournament) => (
                  <div
                    key={tournament.game}
                    onClick={() => tournament.status === 'open' && setSelectedGame(tournament.game as Game)}
                    className={`cursor-pointer transition-all duration-200 ${tournament.status !== 'open' ? 'opacity-50 cursor-not-allowed' : 'hover:scale-102'}`}
                  >
                    <div className={`card-compact h-56 flex flex-col transition-all duration-200 ${
                      selectedGame === tournament.game 
                        ? 'ring-2 ring-white/40 bg-white/5 scale-105' 
                        : ''
                    }`}>
                      <div className="flex flex-col h-full">
                        {/* Status Badge - Fixed height */}
                        <div className="flex justify-center mb-3 h-6 items-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            tournament.status === 'open' 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {tournament.status === 'open' ? 'OPEN' : 'FULL'}
                          </span>
                        </div>
                        
                        {/* Game Title - Fixed height */}
                        <div className="text-center mb-3 h-8 flex items-center justify-center px-2">
                          <h3 className={`font-semibold text-center leading-tight ${
                            tournament.game.length > 15 
                              ? 'text-xs' 
                              : tournament.game.length > 12 
                              ? 'text-sm' 
                              : tournament.game.length > 8 
                              ? 'text-sm' 
                              : 'text-base'
                          } text-white`}>{tournament.game}</h3>
                        </div>
                        
                        {/* Prize Pool - Fixed height */}
                        <div className="text-center mb-4 h-12 flex flex-col justify-center">
                          <div className="text-lg font-bold text-white mb-1">$5,000</div>
                          <div className="text-xs text-gray-400">Prize Pool</div>
                        </div>

                        {/* Teams Section - Fixed height at bottom */}
                        <div className="mt-auto flex flex-col px-3 pb-6">
                          <div className="progress-bar mb-3">
                            <div 
                              className="progress-fill"
                              style={{ width: `${(tournament.registeredTeams / tournament.maxTeams) * 100}%` }}
                            />
                          </div>
                          
                          <div className="flex justify-between text-sm mb-4">
                            <span className="text-gray-400">Teams</span>
                            <span className="text-white font-medium">
                              {tournament.registeredTeams}/{tournament.maxTeams}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-center">
                <button
                  onClick={nextStep}
                  disabled={!canProceedFromGame}
                  className={`btn ${canProceedFromGame ? 'btn-primary' : 'btn-secondary opacity-50 cursor-not-allowed'}`}
                >
                  {selectedGame ? `Continue with ${selectedGame}` : 'Select a Game'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Team Details */}
          {currentStep === 'team' && (
            <div className="card">
              <h2 className="heading-lg text-center mb-2">Team Information</h2>
              <p className="text-body text-center mb-8">Tell us about your team</p>
              
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="form-group">
                  <label className="form-label">Team Name</label>
                  <input
                    type="text"
                    placeholder="Enter your team name"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="input-field text-center text-xl"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Team Region</label>
                  <select
                    value={teamRegion}
                    onChange={(e) => setTeamRegion(e.target.value as Region)}
                    className="input-field"
                    required
                  >
                    <option value="">Select your region...</option>
                    {REGIONS.map(region => (
                      <option key={region} value={region} className="text-black">
                        {region}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedTournament && (
                  <div className="card-compact bg-white/5 border-white/20">
                    <div className="text-center">
                      <h4 className="text-white font-medium mb-2">Tournament: {selectedGame}</h4>
                      <p className="text-sm text-gray-300">
                        {selectedTournament.registeredTeams}/{selectedTournament.maxTeams} teams registered
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-center space-x-4 mt-8">
                <button onClick={prevStep} className="btn btn-secondary">
                  Back
                </button>
                <button
                  onClick={nextStep}
                  disabled={!canProceedFromTeam}
                  className="btn btn-primary"
                >
                  Add Players
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Players */}
          {currentStep === 'players' && (
            <div className="card">
              <h2 className="heading-lg text-center mb-2">Team Roster</h2>
              <p className="text-body text-center mb-8">Add your team members (minimum 3 players)</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {players.map((player, playerIndex) => (
                  <div key={player.id} className="card-compact">
                    <div className="text-center mb-4">
                      <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-white font-medium">{playerIndex + 1}</span>
                      </div>
                      <h4 className="text-white font-medium">Player {playerIndex + 1}</h4>
                    </div>
                    
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Player name"
                        value={player.name}
                        onChange={(e) => updatePlayer(playerIndex, 'name', e.target.value)}
                        className="input-field"
                        required={playerIndex < 3}
                      />
                      <input
                        type="text"
                        placeholder="Steam ID (optional)"
                        value={player.steamId}
                        onChange={(e) => updatePlayer(playerIndex, 'steamId', e.target.value)}
                        className="input-field"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-center space-x-4 mt-8">
                <button onClick={prevStep} className="btn btn-secondary">
                  Back
                </button>
                <button
                  onClick={nextStep}
                  disabled={!canProceedFromPlayers}
                  className="btn btn-primary"
                >
                  Review & Submit
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {currentStep === 'confirm' && (
            <div className="card">
              <h2 className="heading-lg text-center mb-2">Confirm Registration</h2>
              <p className="text-body text-center mb-8">Review your details before submitting</p>
              
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="card-compact bg-gray-500/10">
                  <h3 className="text-white font-medium mb-4">Tournament Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Game:</span>
                      <span className="text-white">{selectedGame}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Prize Pool:</span>
                      <span className="text-white">$5,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Teams Registered:</span>
                      <span className="text-white">{selectedTournament?.registeredTeams}/{selectedTournament?.maxTeams}</span>
                    </div>
                  </div>
                </div>

                <div className="card-compact bg-gray-500/10">
                  <h3 className="text-white font-medium mb-4">Team Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Team Name:</span>
                      <span className="text-white">{teamName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Region:</span>
                      <span className="text-white">{teamRegion}</span>
                    </div>
                  </div>
                </div>

                <div className="card-compact bg-gray-500/10">
                  <h3 className="text-white font-medium mb-4">Players</h3>
                  <div className="space-y-2">
                    {players.filter(p => p.name.trim() !== '').map((player, index) => (
                      <div key={player.id} className="flex justify-between text-sm">
                        <span className="text-gray-400">Player {index + 1}:</span>
                        <span className="text-white">{player.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-center space-x-4 mt-8">
                <button onClick={prevStep} className="btn btn-secondary">
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="btn btn-primary"
                >
                  {isSubmitting ? 'Registering Team...' : 'Register Team'}
                </button>
              </div>
            </div>
          )}
        </div>
      </Layout>
  );
}