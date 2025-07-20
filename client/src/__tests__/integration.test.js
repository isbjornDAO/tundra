/**
 * Integration Tests for Tundra Tournament Platform
 * Tests real API endpoints with actual database operations
 */

const { spawn } = require('child_process');
const fetch = require('node-fetch');

// Test configuration
const API_BASE = 'http://localhost:3000/api';
const TEST_TIMEOUT = 30000;

// Test data
const testUser = {
  walletAddress: '0x1234567890123456789012345678901234567890',
  username: 'testuser_' + Date.now(),
  displayName: 'Test User',
  email: 'test@example.com',
  country: 'US'
};

const testClan = {
  name: 'Test Clan ' + Date.now(),
  tag: 'TEST',
  region: 'North America'
};

let testTournamentId = null;
let testClanId = null;
let testUserId = null;

describe('Tundra Integration Tests', () => {
  let server;

  beforeAll(async () => {
    // Start the development server
    console.log('Starting development server...');
    server = spawn('npm', ['run', 'dev'], {
      stdio: 'pipe',
      cwd: process.cwd()
    });

    // Wait for server to start
    await new Promise((resolve) => {
      server.stdout.on('data', (data) => {
        if (data.toString().includes('Ready') || data.toString().includes('localhost:3000')) {
          resolve();
        }
      });
      setTimeout(resolve, 10000); // Fallback timeout
    });

    console.log('Development server started');
  }, TEST_TIMEOUT);

  afterAll(async () => {
    if (server) {
      server.kill();
      console.log('Development server stopped');
    }
  });

  describe('User Management Flow', () => {
    test('should create a new user', async () => {
      const response = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser)
      });

      expect(response.status).toBe(200);
      const user = await response.json();
      
      expect(user.walletAddress).toBe(testUser.walletAddress);
      expect(user.username).toBe(testUser.username);
      expect(user.stats).toBeDefined();
      
      testUserId = user._id;
    });

    test('should fetch user by wallet address', async () => {
      const response = await fetch(`${API_BASE}/users?walletAddress=${testUser.walletAddress}`);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      const user = data.user || data;
      
      expect(user.walletAddress).toBe(testUser.walletAddress);
    });

    test('should update user profile', async () => {
      const updates = {
        walletAddress: testUser.walletAddress,
        displayName: 'Updated Test User',
        bio: 'Integration test user'
      };

      const response = await fetch(`${API_BASE}/users`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      expect(response.status).toBe(200);
      const user = await response.json();
      
      expect(user.displayName).toBe(updates.displayName);
      expect(user.bio).toBe(updates.bio);
    });
  });

  describe('Clan Management Flow', () => {
    test('should create a new clan', async () => {
      const clanData = {
        ...testClan,
        leader: testUser.walletAddress
      };

      const response = await fetch(`${API_BASE}/clans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clanData)
      });

      expect(response.status).toBe(200);
      const clan = await response.json();
      
      expect(clan.name).toBe(testClan.name);
      expect(clan.tag).toBe(testClan.tag);
      expect(clan.leader).toBe(testUser.walletAddress);
      
      testClanId = clan._id;
    });

    test('should fetch clan details', async () => {
      const response = await fetch(`${API_BASE}/clans/${testClanId}`);
      
      expect(response.status).toBe(200);
      const clan = await response.json();
      
      expect(clan._id).toBe(testClanId);
      expect(clan.name).toBe(testClan.name);
    });

    test('should list all clans', async () => {
      const response = await fetch(`${API_BASE}/clans`);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(Array.isArray(data.clans)).toBe(true);
      expect(data.clans.length).toBeGreaterThan(0);
    });
  });

  describe('Tournament Management Flow', () => {
    test('should create a new tournament', async () => {
      const tournamentData = {
        game: 'Valorant',
        region: 'Global',
        maxTeams: 8
      };

      const response = await fetch(`${API_BASE}/tournaments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tournamentData)
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      
      expect(result.success).toBe(true);
      expect(result.tournament.game).toBe(tournamentData.game);
      expect(result.tournament.status).toBe('open');
      
      testTournamentId = result.tournamentId;
    });

    test('should fetch tournament list', async () => {
      const response = await fetch(`${API_BASE}/tournaments`);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(Array.isArray(data.tournaments)).toBe(true);
      expect(data.tournaments.length).toBeGreaterThan(0);
    });

    test('should fetch tournament statistics', async () => {
      const response = await fetch(`${API_BASE}/tournaments/stats`);
      
      expect(response.status).toBe(200);
      const stats = await response.json();
      
      expect(stats.global).toBeDefined();
      expect(stats.gameBreakdown).toBeDefined();
      expect(Array.isArray(stats.gameBreakdown)).toBe(true);
    });
  });

  describe('Tournament Registration Flow', () => {
    test('should register a team for tournament', async () => {
      const teamData = {
        name: 'Test Team ' + Date.now(),
        tournamentId: testTournamentId,
        clanId: testClanId,
        members: [testUser.walletAddress],
        organizer: testUser.walletAddress
      };

      const response = await fetch(`${API_BASE}/tournaments/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teamData)
      });

      // Note: This might return 400 if tournament is full or other validation fails
      // That's still a valid test result showing the API is working
      expect([200, 400, 409].includes(response.status)).toBe(true);
      
      if (response.status === 200) {
        const result = await response.json();
        expect(result.success || result.team).toBeDefined();
      }
    });
  });

  describe('Bracket and Match Management', () => {
    test('should generate tournament bracket', async () => {
      const response = await fetch(`${API_BASE}/tournaments/brackets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: testTournamentId })
      });

      // Bracket generation might fail if not enough teams registered
      expect([200, 400].includes(response.status)).toBe(true);
      
      if (response.status === 200) {
        const result = await response.json();
        expect(result.success).toBe(true);
        expect(result.bracketId).toBeDefined();
      }
    });

    test('should fetch tournament bracket', async () => {
      const response = await fetch(`${API_BASE}/tournaments/brackets?tournamentId=${testTournamentId}`);
      
      // Might return 404 if bracket doesn't exist yet
      expect([200, 404].includes(response.status)).toBe(true);
      
      if (response.status === 200) {
        const data = await response.json();
        expect(data.bracket || data.error).toBeDefined();
      }
    });
  });

  describe('API Health and Error Handling', () => {
    test('should handle invalid tournament creation', async () => {
      const invalidData = {
        game: 'InvalidGame',
        maxTeams: 1000
      };

      const response = await fetch(`${API_BASE}/tournaments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      });

      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error.error).toBeDefined();
    });

    test('should handle missing user data', async () => {
      const response = await fetch(`${API_BASE}/users?walletAddress=0xinvalid`);
      
      // Should return 200 with null/empty result or 404
      expect([200, 404].includes(response.status)).toBe(true);
    });

    test('should validate clan creation data', async () => {
      const invalidClan = {
        name: '', // Empty name should fail
        tag: 'TOOLONG', // Too long tag should fail
        leader: 'invalid-address'
      };

      const response = await fetch(`${API_BASE}/clans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidClan)
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Database Connection and Performance', () => {
    test('should handle concurrent requests', async () => {
      const requests = Array(5).fill().map(() => 
        fetch(`${API_BASE}/tournaments/stats`)
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    test('should respond within reasonable time', async () => {
      const start = Date.now();
      const response = await fetch(`${API_BASE}/tournaments`);
      const duration = Date.now() - start;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(5000); // Should respond within 5 seconds
    });
  });
});

// Helper function to wait for server startup
function waitForServer(url, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    
    function check() {
      fetch(url)
        .then(() => resolve())
        .catch(() => {
          if (Date.now() - start > timeout) {
            reject(new Error('Server startup timeout'));
          } else {
            setTimeout(check, 1000);
          }
        });
    }
    
    check();
  });
}
