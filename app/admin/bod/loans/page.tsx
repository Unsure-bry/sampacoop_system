'use client';

import PaginatedLoanRecords from '@/components/admin/PaginatedLoanRecords';
import { useAuth } from '@/lib/auth';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BODLoanRecordsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/admin/login');
    } else if (user && user.role?.toLowerCase() !== 'board of directors') {
      router.push('/admin/unauthorized');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        
      </div>
      
      <PaginatedLoanRecords />
    </div>
  );
}
