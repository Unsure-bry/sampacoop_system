'use client';

import { useAuth } from '@/lib/auth';
import { useState } from 'react';

// Icons for header
const MenuIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const UserIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const LogoutIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

/**
 * Admin Header Component
 * 
 * Provides the top navigation bar for the admin panel with:
 * - Toggle button for sidebar
 * - Application title
 * - User profile dropdown
 * 
 * Props:
 * - sidebarCollapsed: boolean - Current state of sidebar
 * - onToggleSidebar: () => void - Function to toggle sidebar state
 */
export default function AdminHeader({ 
  sidebarCollapsed, 
  onToggleSidebar 
}: { 
  sidebarCollapsed: boolean; 
  onToggleSidebar: () => void; 
}) {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Handle user logout
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className="bg-red-600 text-white shadow-md">
      <div className="flex items-center justify-between h-16 px-4">
        {/* Left side - Menu toggle and title */}
        <div className="flex items-center">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-md text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-white"
          >
            <MenuIcon className="h-6 w-6" />
          </button>
          <h1 className="ml-4 text-xl font-bold">SAMPA COOP Admin</h1>
        </div>

        {/* Right side - User profile */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-white"
          >
            <div className="h-8 w-8 rounded-full bg-red-800 flex items-center justify-center">
              <UserIcon className="h-5 w-5 text-white" />
            </div>
            <span className="ml-2 hidden md:block">{user?.email || 'Admin User'}</span>
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
              <div className="py-1" role="none">
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <LogoutIcon className="h-5 w-5 mr-2 text-gray-500" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}