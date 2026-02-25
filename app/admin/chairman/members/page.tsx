'use client';

import { useAuth } from '@/lib/auth';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MemberRecordsReadOnly from '@/components/admin/MemberRecordsReadOnly';

export default function ChairmanMembersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/admin/login');
    } else if (user && user.role?.toLowerCase() !== 'chairman') {
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
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Member Records</h1>
          <p className="text-gray-600">View cooperative members</p>
        </div>
      </div>
      <MemberRecordsReadOnly />
    </div>
  );
}