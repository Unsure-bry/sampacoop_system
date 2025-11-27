'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loansOpen, setLoansOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);

  // Check if we're on the admin login page
  const isAdminLoginPage = pathname === '/admin/login';
  const isAdminRegisterPage = pathname === '/admin/register';

  useEffect(() => {
    // Only redirect if we're not on the login page or register page
    if (!isAdminLoginPage && !isAdminRegisterPage) {
      if (!loading && user) {
        // Redirect to role-specific dashboard
        const role = user.role?.toLowerCase() || '';
        if (role === 'admin') {
          // Stay on current page for admin users
        } else if (role === 'secretary') {
          router.push('/admin/secretary/home');
        } else if (role === 'chairman') {
          router.push('/admin/chairman/home');
        } else if (role === 'vice chairman') {
          router.push('/admin/vice-chairman/home');
        } else if (role === 'manager') {
          router.push('/admin/manager/home');
        } else if (role === 'treasurer') {
          router.push('/admin/treasurer/home');
        } else if (role === 'board of directors') {
          router.push('/admin/bod/home');
        } else {
          router.push('/admin/login');
        }
      } else if (!loading && !user) {
        router.push('/admin/login');
      }
    }
  }, [user, loading, router, isAdminLoginPage, isAdminRegisterPage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  // Allow login page and register page to render without authentication
  if (!user && !isAdminLoginPage && !isAdminRegisterPage) {
    return null;
  }

  // Render simplified layout for login page and register page
  if (isAdminLoginPage || isAdminRegisterPage) {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    try {
      await logout();
      // Redirect to main login page instead of admin login
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Function to check if a link is active
  const isActive = (path: string) => pathname === path;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`bg-white shadow-md ${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 ease-in-out`}>
        <div className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="flex items-center justify-between p-4 border-b">
            {sidebarOpen && (
              <h1 className="text-xl font-bold text-red-600">Admin Panel</h1>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-md hover:bg-gray-200"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Sidebar navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-2">
              <li>
                <Link
                  href="/admin/dashboard"
                  className={`flex items-center p-3 rounded-md transition-colors ${
                    isActive('/admin/dashboard')
                      ? 'bg-red-600 text-white font-medium'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  {sidebarOpen && <span className="ml-3">Dashboard</span>}
                </Link>
              </li>
              
              {/* Members section with dropdown */}
              <li>
                <button
                  onClick={() => setMembersOpen(!membersOpen)}
                  className={`flex items-center justify-between w-full p-3 rounded-md transition-colors ${
                    isActive('/admin/members') || isActive('/admin/members/records') || isActive('/admin/members/membership')
                      ? 'bg-red-600 text-white font-medium'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {sidebarOpen && <span className="ml-3">Members</span>}
                  </div>
                  {sidebarOpen && (
                    <svg 
                      className={`h-5 w-5 transform transition-transform ${membersOpen ? 'rotate-180' : ''}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>
                
                {membersOpen && sidebarOpen && (
                  <ul className="ml-8 mt-1 space-y-1 border-l border-gray-200 pl-2">
                    <li>
                      <Link
                        href="/admin/members/records"
                        className={`flex items-center p-2 rounded-md transition-colors ${
                          isActive('/admin/members/records')
                            ? 'bg-red-600 text-white font-medium'
                            : 'text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <span className="ml-2">Member Records</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/admin/members/membership"
                        className={`flex items-center p-2 rounded-md transition-colors ${
                          isActive('/admin/members/membership')
                            ? 'bg-red-600 text-white font-medium'
                            : 'text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <span className="ml-2">Membership</span>
                      </Link>
                    </li>
                  </ul>
                )}
              </li>
              
              {/* Loans section with dropdown */}
              <li>
                <button
                  onClick={() => setLoansOpen(!loansOpen)}
                  className={`flex items-center justify-between w-full p-3 rounded-md transition-colors ${
                    isActive('/admin/loans') || isActive('/admin/loans/records') || isActive('/admin/loans/requests') || isActive('/admin/loans/plans')
                      ? 'bg-red-600 text-white font-medium'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {sidebarOpen && <span className="ml-3">Loans</span>}
                  </div>
                  {sidebarOpen && (
                    <svg 
                      className={`h-5 w-5 transform transition-transform ${loansOpen ? 'rotate-180' : ''}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>
                
                {loansOpen && sidebarOpen && (
                  <ul className="ml-8 mt-1 space-y-1 border-l border-gray-200 pl-2">
                    <li>
                      <Link
                        href="/admin/loans/records"
                        className={`flex items-center p-2 rounded-md transition-colors ${
                          isActive('/admin/loans/records')
                            ? 'bg-red-600 text-white font-medium'
                            : 'text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <span className="ml-2">Loan Records</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/admin/loans/requests"
                        className={`flex items-center p-2 rounded-md transition-colors ${
                          isActive('/admin/loans/requests')
                            ? 'bg-red-600 text-white font-medium'
                            : 'text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <span className="ml-2">Loan Requests</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/admin/loans/plans"
                        className={`flex items-center p-2 rounded-md transition-colors ${
                          isActive('/admin/loans/plans')
                            ? 'bg-red-600 text-white font-medium'
                            : 'text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <span className="ml-2">Loan Plans</span>
                      </Link>
                    </li>
                  </ul>
                )}
              </li>
              
              <li>
                <Link
                  href="/admin/savings"
                  className={`flex items-center p-3 rounded-md transition-colors ${
                    isActive('/admin/savings')
                      ? 'bg-red-600 text-white font-medium'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                  </svg>
                  {sidebarOpen && <span className="ml-3">Savings</span>}
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/reports"
                  className={`flex items-center p-3 rounded-md transition-colors ${
                    isActive('/admin/reports')
                      ? 'bg-red-600 text-white font-medium'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  {sidebarOpen && <span className="ml-3">Reports</span>}
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/profile"
                  className={`flex items-center p-3 rounded-md transition-colors ${
                    isActive('/admin/profile')
                      ? 'bg-red-600 text-white font-medium'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {sidebarOpen && <span className="ml-3">Profile</span>}
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-800">Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user?.email || 'Admin'}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-100">
          {children}
        </main>
      </div>
    </div>
  );
}