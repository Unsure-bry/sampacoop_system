'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { getSidebarConfig } from '@/lib/sidebarConfig';
import { handleAdminLogout } from '@/lib/logoutUtils';

// Icons for navigation items
const DashboardIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const MembersIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const LoanIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const SavingsIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
  </svg>
);

const DocumentIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ReportIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

// Chevron icon for dropdown
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

// Logout icon component
const LogoutIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Home: DashboardIcon,
  Users: MembersIcon,
  FileText: LoanIcon,
  DollarSign: SavingsIcon,
  BarChart3: ReportIcon,
  Document: DocumentIcon,
};

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  role?: string;
}

/**
 * Admin Sidebar Component
 * 
 * Provides a collapsible sidebar navigation for the admin panel with:
 * - Role-based menu items
 * - Active route highlighting
 * - Collapsible functionality
 * - Dropdown menus for sections
 * - Logout button at the bottom
 * 
 * Props:
 * - collapsed: boolean - Whether the sidebar is collapsed
 * - onToggle: () => void - Function to toggle the sidebar state
 * - role: string - User role to determine which menu items to show
 */
export default function AdminSidebar({ 
  collapsed, 
  onToggle,
  role = 'admin'
}: AdminSidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Get sidebar configuration based on user role
  const navigationSections = getSidebarConfig(role);

  // Handle user logout
  const handleLogout = () => {
    try {
      // Call logout function to clear user state
      logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Perform immediate admin logout with proper redirection
      handleAdminLogout();
    }
  };

  // Toggle section expansion
  const toggleSection = (title: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  return (
    <aside 
      className={`flex flex-col bg-white shadow-md h-full transition-all duration-300 ease-in-out ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Sidebar header with logo and toggle button */}
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && (
          <h1 className="text-xl font-bold text-red-600">
            {role.charAt(0).toUpperCase() + role.slice(1)} Panel
          </h1>
        )}
        <button 
          onClick={onToggle}
          className="p-2 rounded-md hover:bg-gray-200"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
      
      {/* Navigation sections */}
      <div className="flex-1 overflow-y-auto py-4 flex flex-col">
        <nav className="flex-1">
          {navigationSections.map((section) => (
            <div key={section.title} className="mb-2">
              {!collapsed && section.items.length > 1 ? (
                // Section with dropdown for multiple items
                <>
                  <button
                    onClick={() => toggleSection(section.title)}
                    className={`flex items-center justify-between w-full px-4 py-3 rounded-md transition-colors ${
                      expandedSections[section.title] 
                        ? 'bg-red-50 text-red-600 font-medium' 
                        : 'text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className="flex items-center">
                      <span>{section.title}</span>
                    </div>
                    <ChevronDownIcon 
                      className={`h-4 w-4 transform transition-transform ${
                        expandedSections[section.title] ? 'rotate-180' : ''
                      }`} 
                    />
                  </button>
                  
                  {/* Dropdown menu */}
                  {expandedSections[section.title] && (
                    <ul className="ml-4 mt-1 space-y-1 border-l border-gray-200 pl-2">
                      {section.items.map((item) => {
                        const Icon = iconMap[item.name] || item.icon;
                        const isActive = pathname === item.path;
                        
                        return (
                          <li key={item.path}>
                            <Link
                              href={item.path}
                              className={`flex items-center p-2 rounded-md transition-colors ${
                                isActive
                                  ? 'bg-red-600 text-white font-medium'
                                  : 'text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              <Icon className="h-5 w-5" />
                              <span className="ml-2">{item.name}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </>
              ) : section.items.length > 1 ? (
                // Collapsed view with dropdown indicator
                <div className="px-2">
                  <button
                    onClick={() => toggleSection(section.title)}
                    className="flex items-center justify-center w-full p-3 rounded-md text-gray-700 hover:bg-gray-200"
                  >
                    <ChevronDownIcon className="h-4 w-4" />
                  </button>
                  
                  {/* Dropdown menu when collapsed */}
                  {expandedSections[section.title] && (
                    <ul className="ml-4 mt-1 space-y-1 border-l border-gray-200 pl-2">
                      {section.items.map((item) => {
                        const Icon = iconMap[item.name] || item.icon;
                        const isActive = pathname === item.path;
                        
                        return (
                          <li key={item.path}>
                            <Link
                              href={item.path}
                              className={`flex items-center p-2 rounded-md transition-colors ${
                                isActive
                                  ? 'bg-red-600 text-white font-medium'
                                  : 'text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              <Icon className="h-5 w-5" />
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ) : (
                // Single item section
                <ul className="space-y-1 px-2">
                  {section.items.map((item) => {
                    const Icon = iconMap[item.name] || item.icon;
                    const isActive = pathname === item.path;
                    
                    return (
                      <li key={item.path}>
                        <Link
                          href={item.path}
                          className={`flex items-center p-3 rounded-md transition-colors ${
                            isActive
                              ? 'bg-red-600 text-white font-medium'
                              : 'text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <Icon className="h-6 w-6" />
                          {!collapsed && (
                            <span className="ml-3">{item.name}</span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </nav>
        
        {/* Logout button at the bottom */}
        <div className="p-2 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center w-full p-3 rounded-md text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <LogoutIcon className="h-6 w-6" />
            {!collapsed && <span className="ml-3">Sign out</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}