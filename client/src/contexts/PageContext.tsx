'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

type PageType = 'home' | 'profile' | 'clan' | 'tournaments' | 'results' | 'bracket';

interface PageContextType {
  currentPage: PageType;
  setCurrentPage: (page: PageType) => void;
  pageData?: any;
  setPageData: (data: any) => void;
}

const PageContext = createContext<PageContextType | undefined>(undefined);

export function PageProvider({ children }: { children: ReactNode }) {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [pageData, setPageData] = useState<any>(null);

  return (
    <PageContext.Provider value={{ currentPage, setCurrentPage, pageData, setPageData }}>
      {children}
    </PageContext.Provider>
  );
}

export function usePageContext() {
  const context = useContext(PageContext);
  if (context === undefined) {
    throw new Error('usePageContext must be used within a PageProvider');
  }
  return context;
}