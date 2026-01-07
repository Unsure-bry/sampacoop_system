'use client';

import React, { useState } from 'react';
import CollapsibleSidebar from '@/components/shared/CollapsibleSidebar';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';

export default function SavingsPagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      <CollapsibleSidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}