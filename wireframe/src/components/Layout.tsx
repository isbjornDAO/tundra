'use client';

import { ConnectWallet } from '@/components/ConnectWallet';
import { Navigation } from '@/components/Navigation';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function Layout({ children, title }: LayoutProps) {
  return (
    <div className="min-h-screen bg-black">
      <header className="border-b border-white/[0.1]">
        <div className="container-main py-6 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-red-500 transform rotate-0" style={{clipPath: 'polygon(50% 15%, 85% 85%, 15% 85%)'}}></div>
            <h1 className="text-xl font-bold text-white">Tundra</h1>
          </div>
          <ConnectWallet />
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