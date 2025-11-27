'use client';

import React, { useState } from 'react';
import CollapsibleSidebar from '@/components/shared/CollapsibleSidebar';

/**
 * Loan Layout Component
 * 
 * This component provides a layout for the loan page with a collapsible sidebar.
 * It includes:
 * - A collapsible sidebar on the left side
 * - A main content area on the right
 * - Responsive behavior for mobile devices
 * 
 * Usage:
 * Wrap loan-related pages with this layout component.
 */
export default function LoanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <CollapsibleSidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}