'use client';

import { Navigation } from '@/components/navigation';
import { ConnectButton } from './connect-button';

interface RootLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function RootLayout({ children, title }: RootLayoutProps) {
  return (
    <div className="min-h-screen bg-black">
      <header className="border-b border-white/[0.1]">
        <div className="container-main py-6 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-red-500" style={{ clipPath: 'polygon(50% 0%, 100% 86.6%, 0% 86.6%)' }}></div>
            <h1 className="text-xl font-bold text-white">Tundra</h1>
          </div>
          <ConnectButton />
        </div>
      </header>
      <Navigation />

      <main className="container-main py-12">
        {title && (
          <div className="text-center mb-12">
            <h1 className="heading-xl mb-4">{title}</h1>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}