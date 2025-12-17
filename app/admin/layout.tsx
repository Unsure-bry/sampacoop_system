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
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

  // Don't render sidebar or content if user is not authenticated or not admin
  if (loading || !user || !isValidAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  // Don't show sidebar on login page
  const isLoginPage = pathname === '/admin/login';
  const isRegisterPage = pathname === '/admin/register';
  const showSidebar = !isLoginPage && !isRegisterPage;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - only shown when authenticated and not on login/register pages */}
      {showSidebar && (
        <AdminSidebar 
          collapsed={!sidebarOpen} 
          onToggle={() => setSidebarOpen(!sidebarOpen)} 
          role={user.role || 'admin'}
        />
      )}

      {/* Main content */}
      <div className={`flex-1 flex flex-col overflow-hidden ${showSidebar ? '' : 'w-full'}`}>
        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-100">
          {children}
        </main>
      </div>
    </div>
  );
}