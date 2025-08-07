import { useUserContext } from '@/context/AuthContext';
import { useState, useEffect } from 'react';

import { useTournaments } from '@/hooks/useTournaments';
import { type Game, type Region, type Player, Clan, ClanMember } from '@/types';

type Step = 'game' | 'team' | 'players' | 'confirm';

const Register = () => {
    const { address } = useUserContext();
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

  return (
    <div>Register</div>
  )
}

export default Register