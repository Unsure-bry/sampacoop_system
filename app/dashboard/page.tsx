'use client';

import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { ActiveSavings } from '@/components';
import DynamicDashboard from '@/components/user/DynamicDashboard';
import { Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { firestore } from '@/lib/firebase';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const isMember = (user?.role || '').toLowerCase() === 'member';

  useEffect(() => {
    const checkNotifications = async () => {
      try {
        const res = await firestore.getCollection('notifications');
        if (res.success && res.data) {
          const docs = res.data as Array<{ userId?: string; userRole?: string; status?: string }>;
          const has = docs.some((doc) => {
            const targeted =
              doc.userId === user?.uid ||
              doc.userRole === 'all' ||
              doc.userRole?.toLowerCase() === user?.role?.toLowerCase();
            const unread = doc.status === 'unread' || doc.status === 'new';
            return targeted && unread;
          });
          setHasNewNotifications(has);
        }
      } catch {}
    };
    if (user && !loading) {
      checkNotifications();
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!isMember) {
    return null;
  }

  return (
    <DynamicDashboard>
      <div className="max-w-7xl mx-auto w-full">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Welcome, {user?.email}</h1>
            <p className="text-gray-600 mt-2">Member Dashboard</p>
          </div>
        </div>

        <div className="w-full">
          <div className="relative">
            <button
              onClick={() => router.push('/profile/notifications')}
              className="absolute top-2 right-2 p-2 rounded-full hover:bg-gray-100"
              aria-label="Notifications"
            >
              <Bell className="h-6 w-6 text-gray-700" />
              {hasNewNotifications && (
                <>
                  <span className="absolute top-1.5 right-1.5 inline-flex h-2 w-2 rounded-full bg-red-600 animate-ping"></span>
                  <span className="absolute top-1.5 right-1.5 inline-flex h-2 w-2 rounded-full bg-red-600"></span>
                </>
              )}
            </button>
            <ActiveSavings compact={true} />
          </div>
        </div>

        {/* Recent Savings Transactions Section */}
        <div className="mt-8">
          <ActiveSavings compact={false} />
        </div>

      </div>
    </DynamicDashboard>
  );
}
