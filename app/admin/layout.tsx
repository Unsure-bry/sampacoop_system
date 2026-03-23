'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import AdminSidebar from '@/components/admin/Sidebar';
import { validateAdminRoute } from '@/lib/validators';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check if user has valid admin role
  const isValidAdmin = user && validateAdminRoute(user);

  // Redirect unauthenticated users or users without admin roles to login
  useEffect(() => {
    if (!loading) {
      if (!user) {
        // User is not authenticated, redirect to login
        router.push('/admin/login');
      } else if (!isValidAdmin) {
        // User is authenticated but doesn't have admin role, redirect to login
        router.push('/admin/login');
      }
    }
  }, [user, loading, isValidAdmin, router]);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Don't show sidebar on login page
  const isLoginPage = pathname === '/admin/login';
  const isRegisterPage = pathname === '/admin/register';
  const showSidebar = !isLoginPage && !isRegisterPage;

  // On login/register pages, render children directly without any wrapper
  if (isLoginPage || isRegisterPage) {
    return <>{children}</>;
  }

  // Don't render sidebar or content if user is not authenticated or not admin
  if (loading || !user || !isValidAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop: always visible, Mobile: slide-in */}
      {showSidebar && (
        <div className={`
          fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <AdminSidebar 
            collapsed={!sidebarOpen} 
            onToggle={() => setSidebarOpen(!sidebarOpen)} 
            role={user.role || 'admin'}
          />
        </div>
      )}

      {/* Main content */}
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden ${showSidebar ? '' : 'w-full'}`}>
        {/* Mobile Header */}
        {showSidebar && (
          <header className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Open menu"
            >
              <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-red-600">SAMPA COOP</h1>
            <div className="w-10" /> {/* Spacer for alignment */}
          </header>
        )}

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-100">
          {children}
        </main>
      </div>
    </div>
  );
}