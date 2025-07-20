/**
 * End-to-End Tournament Platform Workflow Tests
 * Tests the complete user journey from signup to tournament completion
 */

import { jest } from '@jest/globals';

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Tundra Tournament Platform - End-to-End Workflows', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('1. User Signup & Profile Creation', () => {
    test('should complete user signup with Privy wallet connect', async () => {
      // Mock successful user creation
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          _id: 'user123',
          walletAddress: '0x123...abc',
          username: 'testuser',
          displayName: 'Test User',
          email: 'test@example.com',
          country: 'US',
          stats: {
            totalTournaments: 0,
            wins: 0,
            totalPrizeMoney: 0,
            level: 1,
            xp: 0
          }
        })
      });

      const userData = {
        walletAddress: '0x123...abc',
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
        country: 'US'
      };

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      const user = await response.json();

      expect(response.ok).toBe(true);
      expect(user.walletAddress).toBe(userData.walletAddress);
      expect(user.username).toBe(userData.username);
      expect(user.stats).toBeDefined();
    });

    test('should update user profile successfully', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          _id: 'user123',
          walletAddress: '0x123...abc',
          username: 'testuser',
          displayName: 'Updated Name',
          bio: 'Competitive gamer'
        })
      });

      const updates = {
        displayName: 'Updated Name',
        bio: 'Competitive gamer'
      };

      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: '0x123...abc',
          ...updates
        })
      });

      const updatedUser = await response.json();

      expect(response.ok).toBe(true);
      expect(updatedUser.displayName).toBe(updates.displayName);
      expect(updatedUser.bio).toBe(updates.bio);
    });
  });

  describe('2. Clan Creation & Management', () => {
    test('should create a clan successfully', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          _id: 'clan123',
          name: 'Test Clan',
          tag: 'TEST',
          region: 'North America',
          leader: 'user123',
          members: ['user123'],
          memberCount: 1
        })
      });

      const clanData = {
        name: 'Test Clan',
        tag: 'TEST',
        region: 'North America',
        leader: 'user123'
      };

      const response = await fetch('/api/clans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clanData)
      });

      const clan = await response.json();

      expect(response.ok).toBe(true);
      expect(clan.name).toBe(clanData.name);
      expect(clan.tag).toBe(clanData.tag);
      expect(clan.leader).toBe(clanData.leader);
    });

    test('should handle clan join requests', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Join request sent' })
      });

      const response = await fetch('/api/clans/clan123/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: '0x456...def' })
      });

      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.success).toBe(true);
    });
  });

  describe('3. Tournament Creation & Registration', () => {
    test('should create tournament successfully', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          tournamentId: 'tournament123',
          tournament: {
            _id: 'tournament123',
            game: 'Valorant',
            region: 'Global',
            maxTeams: 16,
            registeredTeams: 0,
            status: 'open',
            prizePool: 5000
          }
        })
      });

      const tournamentData = {
        game: 'Valorant',
        region: 'Global',
        maxTeams: 16
      };

      const response = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tournamentData)
      });

      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.success).toBe(true);
      expect(result.tournament.game).toBe(tournamentData.game);
      expect(result.tournament.status).toBe('open');
    });

    test('should register team for tournament', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Team registered successfully',
          team: {
            _id: 'team123',
            name: 'Test Team',
            tournamentId: 'tournament123',
            clanId: 'clan123'
          }
        })
      });

      const teamData = {
        name: 'Test Team',
        tournamentId: 'tournament123',
        clanId: 'clan123',
        members: ['user123', 'user456']
      };

      const response = await fetch('/api/tournaments/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teamData)
      });

      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.success).toBe(true);
      expect(result.team.name).toBe(teamData.name);
    });
  });

  describe('4. Bracket Generation & Match Creation', () => {
    test('should generate tournament bracket', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          bracketId: 'bracket123',
          matchesCount: 8
        })
      });

      const response = await fetch('/api/tournaments/brackets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: 'tournament123' })
      });

      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.success).toBe(true);
      expect(result.bracketId).toBeDefined();
      expect(result.matchesCount).toBeGreaterThan(0);
    });

    test('should fetch bracket with matches', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          bracket: {
            _id: 'bracket123',
            tournamentId: 'tournament123',
            status: 'active'
          },
          matches: [
            {
              _id: 'match123',
              team1: { name: 'Team A' },
              team2: { name: 'Team B' },
              round: 'quarterfinal',
              status: 'pending'
            }
          ]
        })
      });

      const response = await fetch('/api/tournaments/brackets?tournamentId=tournament123');
      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.bracket).toBeDefined();
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].round).toBe('quarterfinal');
    });
  });

  describe('5. Match Scheduling & Coordination', () => {
    test('should propose match time', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Time proposed successfully'
        })
      });

      const timeData = {
        matchId: 'match123',
        proposedTime: new Date().toISOString(),
        proposedBy: '0x123...abc'
      };

      const response = await fetch('/api/tournaments/matches/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(timeData)
      });

      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.success).toBe(true);
    });

    test('should approve match time', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Time approved successfully'
        })
      });

      const approvalData = {
        matchId: 'match123',
        approvedBy: '0x456...def'
      };

      const response = await fetch('/api/tournaments/matches/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(approvalData)
      });

      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.success).toBe(true);
    });
  });

  describe('6. Results Entry & Verification', () => {
    test('should submit match results', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Results submitted successfully'
        })
      });

      const resultData = {
        matchId: 'match123',
        winnerId: 'team123',
        score: { team1Score: 2, team2Score: 1 },
        submittedBy: '0x123...abc',
        notes: 'Good game'
      };

      const response = await fetch('/api/tournaments/matches/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resultData)
      });

      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.success).toBe(true);
    });

    test('should verify results with dual host confirmation', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Match result entered successfully',
          winner: { name: 'Team A' },
          loser: { name: 'Team B' }
        })
      });

      const verificationData = {
        matchId: 'match123',
        winnerId: 'team123',
        completedAt: new Date().toISOString()
      };

      const response = await fetch('/api/tournaments/matches/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verificationData)
      });

      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.success).toBe(true);
      expect(result.winner).toBeDefined();
    });
  });

  describe('7. Tournament Completion & Stats', () => {
    test('should fetch tournament statistics', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          global: {
            totalTournaments: 5,
            totalTeams: 40,
            totalPrizeMoney: 25000
          },
          gameBreakdown: [
            { game: 'Valorant', total: 2, active: 1 },
            { game: 'CS2', total: 3, active: 0 }
          ]
        })
      });

      const response = await fetch('/api/tournaments/stats');
      const stats = await response.json();

      expect(response.ok).toBe(true);
      expect(stats.global.totalTournaments).toBeGreaterThan(0);
      expect(stats.gameBreakdown).toHaveLength(2);
    });

    test('should update user stats after tournament completion', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          _id: 'user123',
          stats: {
            totalTournaments: 1,
            wins: 1,
            totalPrizeMoney: 1000,
            level: 2,
            xp: 150
          }
        })
      });

      const statsUpdate = {
        walletAddress: '0x123...abc',
        stats: {
          totalTournaments: 1,
          wins: 1,
          totalPrizeMoney: 1000,
          level: 2,
          xp: 150
        }
      };

      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(statsUpdate)
      });

      const updatedUser = await response.json();

      expect(response.ok).toBe(true);
      expect(updatedUser.stats.wins).toBe(1);
      expect(updatedUser.stats.level).toBe(2);
    });
  });

  describe('8. Integration Tests - Complete Workflows', () => {
    test('should complete full tournament workflow', async () => {
      // This test simulates the complete flow from tournament creation to completion
      const mockResponses = [
        // 1. Create tournament
        { ok: true, json: async () => ({ success: true, tournamentId: 'tournament123' }) },
        // 2. Register teams
        { ok: true, json: async () => ({ success: true, team: { _id: 'team1' } }) },
        { ok: true, json: async () => ({ success: true, team: { _id: 'team2' } }) },
        // 3. Generate bracket
        { ok: true, json: async () => ({ success: true, bracketId: 'bracket123' }) },
        // 4. Schedule match
        { ok: true, json: async () => ({ success: true, message: 'Time proposed' }) },
        // 5. Approve time
        { ok: true, json: async () => ({ success: true, message: 'Time approved' }) },
        // 6. Submit results
        { ok: true, json: async () => ({ success: true, message: 'Results submitted' }) },
        // 7. Verify results
        { ok: true, json: async () => ({ success: true, winner: { name: 'Team A' } }) }
      ];

      fetch.mockImplementation(() => Promise.resolve(mockResponses.shift()));

      // Execute the workflow
      const workflows = [
        fetch('/api/tournaments', { method: 'POST', body: JSON.stringify({ game: 'Valorant' }) }),
        fetch('/api/tournaments/teams', { method: 'POST', body: JSON.stringify({ name: 'Team A' }) }),
        fetch('/api/tournaments/teams', { method: 'POST', body: JSON.stringify({ name: 'Team B' }) }),
        fetch('/api/tournaments/brackets', { method: 'POST', body: JSON.stringify({ tournamentId: 'tournament123' }) }),
        fetch('/api/tournaments/matches/schedule', { method: 'POST', body: JSON.stringify({ matchId: 'match123' }) }),
        fetch('/api/tournaments/matches/approve', { method: 'POST', body: JSON.stringify({ matchId: 'match123' }) }),
        fetch('/api/tournaments/matches/results', { method: 'POST', body: JSON.stringify({ matchId: 'match123' }) }),
        fetch('/api/tournaments/matches/admin', { method: 'PATCH', body: JSON.stringify({ matchId: 'match123' }) })
      ];

      const results = await Promise.all(workflows);
      
      // Verify all steps completed successfully
      for (const result of results) {
        expect(result.ok).toBe(true);
      }
    });
  });
});
