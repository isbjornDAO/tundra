'use client';

import Link from 'next/link';
// import { AuthGuard } from '@/components/AuthGuard';
import dynamic from 'next/dynamic';
import { Navigation } from '@/components/Navigation';
import { SimpleTournamentMap } from '@/components/SimpleTournamentMap';
import { TournamentSetupGuide } from '@/components/TournamentSetupGuide';

// Make ConnectWallet client-side only to prevent wagmi SSR issues
const ConnectWallet = dynamic(() => import('@/components/ConnectWallet').then(mod => ({ default: mod.ConnectWallet })), {
  ssr: false,
  loading: () => <button className="btn btn-primary">Connect Wallet</button>
});

// Make LiveSnowstormStream client-side only to prevent SSR issues
const LiveSnowstormStream = dynamic(() => import('@/components/LiveSnowstormStream').then(mod => ({ default: mod.LiveSnowstormStream })), {
  ssr: false,
  loading: () => <div className="h-[400px] flex items-center justify-center text-white">Loading live stream...</div>
});
import { PageRouter } from '@/components/PageRouter';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalGames: 0,
    totalSlots: 0,
    totalTeams: 0,
    loading: true
  });

  // Generate snow properties once on component mount
  const snowflakes = Array.from({ length: 80 }, (_, i) => ({
    id: i,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 15 + 10,
    delay: Math.random() * 20,
    opacity: Math.random() * 0.4 + 0.1,
    drift: Math.random() * 100 - 50,
    left: Math.random() * 100,
  }));

  // Redirect to clan page if user is in a clan - DISABLED
  // useEffect(() => {
  //   if (!authLoading && user?.clan) {
  //     router.push('/clan');
  //   }
  // }, [user, authLoading, router]);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/tournaments/stats');
        if (response.ok) {
          const data = await response.json();
          
          // Calculate total available slots across all tournaments
          const totalSlots = data.gameBreakdown?.reduce((sum: number, game: any) => {
            return sum + (game.total * 12); // Assuming 12 teams per tournament max
          }, 0) || 0;
          
          setStats({
            totalGames: data.gameBreakdown?.length || 0,
            totalSlots: totalSlots,
            totalTeams: data.global?.totalTeams || 0,
            loading: false
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    }
    fetchStats();
  }, []);

  return (
    <PageRouter>
        <div className="min-h-screen bg-black relative overflow-hidden">
        {/* Falling Snow Background */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          {snowflakes.map((flake) => (
            <div
              key={`snowflake-${flake.id}`}
              className="absolute bg-white rounded-full"
              style={{
                width: `${flake.size}px`,
                height: `${flake.size}px`,
                left: `${flake.left}%`,
                top: '-20px',
                opacity: flake.opacity,
                animation: `snowfall ${flake.duration}s linear infinite`,
                animationDelay: `${flake.delay}s`,
                transform: `translateX(${flake.drift}px)`,
              }}
            />
          ))}
        </div>
        
        <header className="border-b border-white/[0.1] relative z-30">
          <div className="container-main py-6 flex justify-between items-center">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-xl font-bold text-white hover:text-gray-300 transition-colors">
                Tundra
              </Link>
              <Navigation />
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
              <ConnectWallet />
            </div>
          </div>
        </header>
        
        <main className="container-main py-8 relative z-20">
          {/* Hero Section */}
          <div className="text-center mb-24">
            <div className="mb-8">
              <LiveSnowstormStream />
            </div>
          </div>

          {/* Stats Section */}
          <div className="grid-3 mb-24">
            <div className="card text-center">
              <div className="heading-lg mb-2">{stats.loading ? '...' : stats.totalGames}</div>
              <div className="text-muted">Games Available</div>
            </div>
            <div className="card text-center">
              <div className="heading-lg text-gradient mb-2">{stats.loading ? '...' : stats.totalSlots}</div>
              <div className="text-muted">Total Slots</div>
            </div>
            <div className="card text-center">
              <div className="heading-lg mb-2">{stats.loading ? '...' : stats.totalTeams}</div>
              <div className="text-muted">Teams Registered</div>
            </div>
          </div>

          {/* Tournament Calendar Section */}
          <div className="mb-24">
            <SimpleTournamentMap />
          </div>

          {/* Features Grid */}
          <div className="grid-2 section-tight mb-24">
            <div className="card-interactive">
              <div className="flex items-start gap-6">
                <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="heading-sm mb-3">Global Tournaments</h3>
                  <p className="text-body mb-4">
                    Compete in worldwide tournaments across multiple games. 
                    12 teams per tournament, organized by Team1 ambassadors.
                  </p>
                  <a href="/tournaments/register" className="inline-flex items-center text-red-400 hover:text-red-300 text-sm font-medium">
                    Register Now
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            <div className="card-interactive">
              <div className="flex items-start gap-6">
                <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="heading-sm mb-3">Match Coordination</h3>
                  <p className="text-body mb-4">
                    Coordinate match times with other Team1 organizers. 
                    Both parties must agree before matches are official.
                  </p>
                  <a href="/tournaments/bracket" className="inline-flex items-center text-blue-400 hover:text-blue-300 text-sm font-medium">
                    View Matches
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            <div className="card-interactive">
              <div className="flex items-start gap-6">
                <div className="w-12 h-12 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="heading-sm mb-3">Multiple Games</h3>
                  <p className="text-body mb-4">
                    Support for Off the Grid, Shatterline, Counter-Strike 2, Valorant, 
                    Overwatch 2, and other FPS tournaments.
                  </p>
                  <a href="/tournaments/register" className="inline-flex items-center text-green-400 hover:text-green-300 text-sm font-medium">
                    Choose Game
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            <div className="card-interactive">
              <div className="flex items-start gap-6">
                <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="heading-sm mb-3">Team1 Verified</h3>
                  <p className="text-body mb-4">
                    Only verified Team1 members can organize tournaments, 
                    ensuring quality and trust in the ecosystem.
                  </p>
                  <div className="inline-flex items-center text-purple-400 text-sm font-medium">
                    Verified Only
                    <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>


          {/* CTA Section */}
          <div className="card text-center mb-24">
            <h2 className="heading-lg mb-4">Ready to Compete?</h2>
            <p className="text-body mb-8 max-w-lg mx-auto">
              Join the global esports tournament platform powered by Team1 and Avalanche. 
              Register your team today and start your journey to victory.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a href="/tournaments/register" className="btn btn-primary">
                Get Started
              </a>
              <a href="/tournaments/bracket" className="btn btn-outline">
                Learn More
              </a>
            </div>
            
            {/* Setup Guide for New Users */}
            {!user && (
              <div className="mt-8 p-4 bg-blue-600/10 border border-blue-600/20 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-2">New to Tundra?</h3>
                <p className="text-sm text-gray-300 mb-3">
                  Follow our step-by-step guide to get started with tournament competition.
                </p>
                <TournamentSetupGuide currentStep="wallet" />
              </div>
            )}
          </div>
        </main>
        
        {/* Setup Guide for authenticated users */}
        {user && <TournamentSetupGuide currentStep={user.clan ? 'tournament' : 'clan'} />}
        
        <style jsx global>{`
          @keyframes snowfall {
            0% {
              transform: translateY(0px);
            }
            100% {
              transform: translateY(calc(100vh + 40px));
            }
          }
        `}</style>
        </div>
      </PageRouter>
  );
}