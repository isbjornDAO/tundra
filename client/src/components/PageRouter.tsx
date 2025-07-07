'use client';

import { usePageContext } from '@/contexts/PageContext';
import { ProfilePage } from './pages/ProfilePage';
import { ClanPage } from './pages/ClanPage';

export function PageRouter({ children }: { children: React.ReactNode }) {
  const { currentPage, pageData } = usePageContext();

  // If we're on a specific page, render that page instead of children
  switch (currentPage) {
    case 'profile':
      return (
        <ProfilePage 
          walletAddress={pageData?.walletAddress}
          displayName={pageData?.displayName}
          onProfileUpdate={(displayName, photo) => {
            // Handle profile updates if needed
            console.log('Profile updated:', displayName, photo);
          }}
        />
      );
    
    case 'clan':
      return (
        <ClanPage 
          walletAddress={pageData?.walletAddress}
        />
      );
    
    default:
      // For 'home' and other pages, render the original children
      return <>{children}</>;
  }
}