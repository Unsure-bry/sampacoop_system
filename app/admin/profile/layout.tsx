'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { validateAdminRoute } from '@/lib/validators';
import { useRouter } from 'next/navigation';

export default function AdminProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

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

  // Don't render content if user is not authenticated or not admin
  if (loading || !user || !isValidAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {children}
      </div>
    </div>
  );
}