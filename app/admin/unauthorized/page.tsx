'use client';

import { useAuth } from '@/lib/auth';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';

export default function UnauthorizedPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Don't automatically redirect to login page
    // Let the user see the unauthorized message
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const handleGoBack = () => {
    router.back();
  };

  const handleGoHome = () => {
    // Redirect to role-specific dashboard
    if (user?.role) {
      const role = user.role.toLowerCase();
      if (role === 'admin') {
        router.push('/admin/dashboard');
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
      } else if (['member', 'driver', 'operator'].includes(role)) {
        router.push('/dashboard');
      } else {
        router.push('/dashboard');
      }
    } else {
      router.push('/admin/login');
    }
  };

  // Clean component for unauthorized access
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-600" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Access Denied</h2>
          <p className="mt-2 text-sm text-gray-600">
            You don't have permission to access this page.
          </p>
        </div>

        <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-sm text-gray-500">
                Your current role does not have access to this resource.
              </p>
              {user?.role && (
                <p className="mt-2 text-sm text-gray-500">
                  Current role: <span className="font-medium">{user.role}</span>
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleGoBack}
                className="flex-1 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Go Back
              </button>
              <button
                onClick={handleGoHome}
                className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}