'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';

export function Navigation() {
  const pathname = usePathname();
  const [showTournamentDropdown, setShowTournamentDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const tournamentItems = [
    { href: '/tournaments/register', label: 'Register', icon: '📝' },
    { href: '/tournaments/bracket', label: 'Brackets', icon: '🏆' },
    { href: '/tournaments/results', label: 'Results', icon: '📊' },
    { href: '/tournaments/admin', label: 'Admin', icon: '⚙️' },
  ];

  // Check if current path is tournament-related
  const isTournamentPath = tournamentItems.some(item => pathname === item.href);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowTournamentDropdown(false);
      }
    }

    if (showTournamentDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTournamentDropdown]);

  return (
    <nav className="flex space-x-6">
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowTournamentDropdown(!showTournamentDropdown)}
          className={`nav-link flex items-center gap-1 ${
            isTournamentPath ? 'nav-link-active' : ''
          }`}
        >
          Tournaments
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showTournamentDropdown && (
          <div className="absolute top-full left-0 mt-2 w-48 bg-black/95 backdrop-blur-sm border border-white/20 rounded-lg shadow-xl py-2" style={{zIndex: 999999}}>
            {tournamentItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => {
                  console.log('Tournament item clicked:', item.label);
                  setShowTournamentDropdown(false);
                }}
                className={`block w-full px-4 py-3 text-left transition-all duration-200 flex items-center gap-3 ${
                  pathname === item.href 
                    ? 'text-white bg-white/20 border-l-2 border-blue-500' 
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="text-sm">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}