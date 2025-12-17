'use client';

import { useAuth } from '@/lib/auth';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/admin';

export default function SecretaryMembersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/admin/login');
    } else if (user && user.role?.toLowerCase() !== 'secretary') {
      router.push('/admin/unauthorized');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Members Management</h1>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-800">Member Records</h3>
          </div>
          <div className="p-6">
            <p className="text-gray-600 mb-4">View and manage all member records, applications, and registrations.</p>
            <button 
              onClick={() => router.push('/admin/secretary/members/records')}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Manage Members
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}