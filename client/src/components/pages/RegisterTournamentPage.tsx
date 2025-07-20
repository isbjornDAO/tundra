'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Layout } from '@/components/Layout';
import { useTournaments } from '@/hooks/useTournaments';
import { REGIONS, type Game, type Region, type Player } from '@/types/tournament';

interface User {
  _id: string;
  walletAddress: string;
  displayName: string;
  isClanLeader: boolean;
  country?: string;
  clan?: {
    _id: string;
    name: string;
    tag: string;
    members: User[];
  };
}

interface Clan {
  _id: string;
  name: string;
  tag: string;
  country: string;
  members: User[];
}

interface ClanMember {
  _id: string;
  walletAddress: string;
  displayName: string;
  selected: boolean;
}

type Step = 'game' | 'team' | 'players' | 'confirm';

export default function RegisterTournamentPage() {
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>('game');
  const [selectedGame, setSelectedGame] = useState<Game | ''>('');
  const [selectedTournament, setSelectedTournament] = useState<any>(null);
  const [teamName, setTeamName] = useState('');
  const [selectedClan, setSelectedClan] = useState<Clan | null>(null);
  const [userClans, setUserClans] = useState<Clan[]>([]);
  const [players, setPlayers] = useState<Player[]>(
    Array(5).fill(null).map((_, i) => ({ id: `${Date.now()}-${i}`, name: '', steamId: '' }))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [clanMembers, setClanMembers] = useState<ClanMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    if (mounted) {
      const formData = {
        currentStep,
        selectedGame,
        selectedTournament,
        selectedClan,
        players
      };
      localStorage.setItem('tournamentRegistration', JSON.stringify(formData));
    }
  }, [currentStep, selectedGame, selectedTournament, selectedClan, players, mounted]);

  // Load form data from localStorage on mount
  useEffect(() => {
    if (mounted) {
      const savedData = localStorage.getItem('tournamentRegistration');
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          setCurrentStep(parsedData.currentStep || 'game');
          setSelectedGame(parsedData.selectedGame || '');
          setSelectedTournament(parsedData.selectedTournament || null);
          setSelectedClan(parsedData.selectedClan || null);
          if (parsedData.players && Array.isArray(parsedData.players)) {
            setPlayers(parsedData.players);
          }
        } catch (error) {
          console.error('Error loading saved form data:', error);
        }
      }
    }
  }, [mounted]);
  
  const { data: tournamentsData, isLoading } = useTournaments();
  const tournaments = tournamentsData?.tournaments || [];
  const { address } = useAccount();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (address) {
      fetchUserData();
    }
  }, [address]);

  const fetchUserData = async () => {
    try {
      const response = await fetch(`/api/users?walletAddress=${address}`);
      if (!response.ok) {
        throw new Error('User not found');
      }
      const userData = await response.json();
      setUser(userData.user);
      
      // Fetch clans where user is a leader
      if (userData.user.isClanLeader) {
        const clansResponse = await fetch(`/api/clans?leaderAddress=${address}`);
        if (clansResponse.ok) {
          const clansData = await clansResponse.json();
          setUserClans(clansData.clans || []);
          
          // If user has a current clan, set it as selected
          if (userData.user.clan) {
            const currentClan = clansData.clans?.find((clan: Clan) => clan._id === userData.user.clan._id);
            if (currentClan) {
              setSelectedClan(currentClan);
              setClanMembers(
                currentClan.members.map((member: User) => ({
                  ...member,
                  selected: false
                }))
              );
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to load user data. Please ensure you have registered an account.');
    } finally {
      setLoading(false);
    }
  };

  const handleClanSelection = (clanId: string) => {
    const clan = userClans.find(c => c._id === clanId);
    if (clan) {
      setSelectedClan(clan);
      setClanMembers(
        clan.members.map((member: User) => ({
          ...member,
          selected: false
        }))
      );
    }
  };

  const toggleMemberSelection = (memberId: string) => {
    setClanMembers(prev => 
      prev.map(member => 
        member._id === memberId 
          ? { ...member, selected: !member.selected }
          : member
      )
    );
  };

  if (!mounted || loading) {
    return (
      <Layout>
        <div className="text-white text-center py-8">Loading...</div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto text-center">
          <div className="card p-8">
            <h2 className="text-2xl font-bold text-white mb-4">Registration Unavailable</h2>
            <p className="text-gray-400 mb-4">{error}</p>
            <p className="text-gray-400">Please create an account first or contact an admin to be granted clan leader permissions.</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto text-center">
          <div className="card p-8">
            <h2 className="text-2xl font-bold text-white mb-4">Account Required</h2>
            <p className="text-gray-400">You need to create an account to register for tournaments.</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Show tournaments to all users, but disable registration for non-clan leaders
  const canRegister = user && user.isClanLeader && userClans.length > 0;
  const restrictionMessage = !user ? 'You need to create an account to register for tournaments.' 
    : !user.isClanLeader ? 'Only clan leaders can register teams for tournaments. Contact an admin to be granted clan leader permissions.'
    : userClans.length === 0 ? 'You need to be a leader of a clan to register for tournaments. Create or join a clan first.'
    : null;

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
    if (!selectedTournament || selectedTournament.status !== 'open') {
      alert('Tournament is not available for registration');
      return;
    }

    const selectedMembers = clanMembers.filter(m => m.selected);
    if (selectedMembers.length < 3) {
      alert('You must select at least 3 clan members');
      return;
    }

    // Additional validation
    if (!address) {
      alert('Please connect your wallet');
      return;
    }

    if (!selectedClan?.country) {
      alert('Clan country information is missing. Please contact support.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/tournaments/clans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentId: selectedTournament._id,
          clanId: selectedClan?._id,
          organizer: address,
          selectedPlayers: selectedMembers.map((member) => ({
            userId: member._id,
            walletAddress: member.walletAddress,
            displayName: member.displayName
          }))
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to register clan');
      }

      alert(`Clan "${selectedClan?.tag}" successfully registered for ${selectedGame} tournament!`);
      
      // Clear localStorage and reset form
      localStorage.removeItem('tournamentRegistration');
      setSelectedClan(null);
      setSelectedGame('');
      setSelectedTournament(null);
      setClanMembers(prev => prev.map(m => ({ ...m, selected: false })));
      setCurrentStep('game');
      
    } catch (error) {
      console.error('Registration failed:', error);
      alert(`Registration failed: ${error.message || 'Please try again.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceedFromGame = selectedTournament && selectedTournament.status === 'open';
  const canProceedFromTeam = selectedClan;
  const canProceedFromPlayers = clanMembers.filter(m => m.selected).length >= 3;

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
          {canRegister && <StepIndicator />}

          {/* Restriction Message */}
          {!canRegister && restrictionMessage && (
            <div className="card mb-6 bg-amber-500/10 border-amber-500/20">
              <div className="flex items-center gap-3">
                <div className="text-amber-400 text-xl">⚠️</div>
                <div>
                  <h3 className="text-amber-400 font-semibold mb-1">Registration Restricted</h3>
                  <p className="text-amber-300 text-sm">{restrictionMessage}</p>
                  <p className="text-amber-300/70 text-xs mt-1">You can still view all open tournaments below.</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Choose Game */}
          {currentStep === 'game' && (
            <div className="card">
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold mb-2">{canRegister ? 'Choose Your Game' : 'Browse Open Tournaments'}</h2>
                <p className="text-body text-sm">{canRegister ? 'Select which tournament you want to join' : 'View all available tournaments'}</p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                {tournaments.map((tournament) => (
                  <div
                    key={tournament._id}
                    onClick={() => canRegister && tournament.status === 'open' && (setSelectedGame(tournament.game as Game), setSelectedTournament(tournament))}
                    className={`transition-all duration-200 ${
                      !canRegister ? 'opacity-70 cursor-not-allowed' 
                      : tournament.status !== 'open' ? 'opacity-50 cursor-not-allowed' 
                      : 'cursor-pointer hover:scale-102'
                    }`}
                  >
                    <div className={`card-compact h-56 flex flex-col transition-all duration-200 ${
                      selectedTournament?._id === tournament._id 
                        ? 'ring-2 ring-white/40 bg-white/5 scale-105' 
                        : ''
                    }`}>
                      <div className="flex flex-col h-full">
                        {/* Status Badge - Fixed height */}
                        <div className="flex justify-center mb-3 h-6 items-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            !canRegister && tournament.status === 'open'
                              ? 'bg-amber-500/20 text-amber-400'
                              : tournament.status === 'open' 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {!canRegister && tournament.status === 'open' 
                              ? 'VIEW ONLY' 
                              : tournament.status === 'open' ? 'OPEN' : 'FULL'}
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
                          <div className="text-lg font-bold text-white mb-1">
                            ${tournament.prizePool?.toLocaleString() || '5,000'}
                          </div>
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
                  onClick={canRegister ? nextStep : undefined}
                  disabled={!canRegister || !canProceedFromGame}
                  className={`btn ${canRegister && canProceedFromGame ? 'btn-primary' : 'btn-secondary opacity-50 cursor-not-allowed'}`}
                >
                  {!canRegister 
                    ? 'Registration Restricted' 
                    : selectedTournament ? `Continue with ${selectedTournament.game}` : 'Select a Tournament'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Team Details */}
          {canRegister && currentStep === 'team' && (
            <div className="card">
              <h2 className="heading-lg text-center mb-2">Team Information</h2>
              <p className="text-body text-center mb-8">Tell us about your team</p>
              
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="form-group">
                  <label className="form-label">Select Clan</label>
                  <select
                    value={selectedClan?._id || ''}
                    onChange={(e) => handleClanSelection(e.target.value)}
                    className="input-field"
                    required
                  >
                    <option value="">Select a clan...</option>
                    {userClans.map(clan => (
                      <option key={clan._id} value={clan._id} className="text-black">
                        [{clan.tag}] {clan.name} ({clan.country})
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-400 mt-1">
                    Choose which clan you're representing
                  </p>
                </div>

                {selectedClan && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Team Name</label>
                      <div className="input-field text-center text-xl bg-gray-700 text-white font-semibold">
                        [{selectedClan.tag}] {selectedClan.name}
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        Team name will automatically use your clan name
                      </p>
                    </div>

                    <div className="card-compact bg-blue-500/10 border-blue-500/20">
                      <h4 className="text-blue-400 font-medium mb-3">Clan Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Country:</span>
                          <span className="text-white">{selectedClan.country}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Members:</span>
                          <span className="text-white">{selectedClan.members?.length || 0}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}


                {selectedTournament && (
                  <div className="card-compact bg-white/5 border-white/20">
                    <div className="text-center">
                      <h4 className="text-white font-medium mb-2">Tournament: {selectedTournament.game}</h4>
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

          {/* Step 3: Select Clan Members */}
          {canRegister && currentStep === 'players' && (
            <div className="card">
              <h2 className="heading-lg text-center mb-2">Select Team Members</h2>
              <p className="text-body text-center mb-4">Choose clan members for your team (minimum 3 players)</p>
              <p className="text-center text-sm text-gray-400 mb-8">
                Clan: [{selectedClan?.tag}] {selectedClan?.name}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clanMembers.map((member) => (
                  <div 
                    key={member._id} 
                    onClick={() => toggleMemberSelection(member._id)}
                    className={`card-compact cursor-pointer transition-all ${
                      member.selected 
                        ? 'ring-2 ring-red-500 bg-red-500/10' 
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                        member.selected 
                          ? 'border-red-500 bg-red-500' 
                          : 'border-gray-400'
                      }`}>
                        {member.selected && (
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-white font-medium">{member.displayName}</h4>
                        <p className="text-gray-400 text-sm">
                          {member.walletAddress.slice(0, 6)}...{member.walletAddress.slice(-4)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center mt-6">
                <p className="text-sm text-gray-400">
                  Selected: {clanMembers.filter(m => m.selected).length} / {clanMembers.length} members
                </p>
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
          {canRegister && currentStep === 'confirm' && (
            <div className="card">
              <h2 className="heading-lg text-center mb-2">Confirm Registration</h2>
              <p className="text-body text-center mb-8">Review your details before submitting</p>
              
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="card-compact bg-gray-500/10">
                  <h3 className="text-white font-medium mb-4">Tournament Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Game:</span>
                      <span className="text-white">{selectedTournament?.game}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Prize Pool:</span>
                      <span className="text-white">
                        ${selectedTournament?.prizePool?.toLocaleString() || '5,000'}
                      </span>
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
                      <span className="text-gray-400">Clan:</span>
                      <span className="text-white">[{selectedClan?.tag}] {selectedClan?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Team Name:</span>
                      <span className="text-white">[{selectedClan?.tag}] {selectedClan?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Country:</span>
                      <span className="text-white">{selectedClan?.country}</span>
                    </div>
                  </div>
                </div>

                <div className="card-compact bg-gray-500/10">
                  <h3 className="text-white font-medium mb-4">Selected Players</h3>
                  <div className="space-y-2">
                    {clanMembers.filter(m => m.selected).map((member, index) => (
                      <div key={member._id} className="flex justify-between text-sm">
                        <span className="text-gray-400">Player {index + 1}:</span>
                        <span className="text-white">{member.displayName}</span>
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