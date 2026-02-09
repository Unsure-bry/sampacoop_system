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
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Array<{
    id?: string;
    title?: string;
    message?: string;
    type?: string;
    status?: string;
    createdAt?: string;
    userId?: string;
    userRole?: string;
  }>>([]);
  const statusBadgeClass = (status?: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'approved') return 'bg-green-100 text-green-800';
    if (s === 'rejected') return 'bg-red-100 text-red-800';
    if (s === 'unread' || s === 'new') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

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

  const loadNotifications = async () => {
    try {
      const res = await firestore.getCollection('notifications');
      if (res.success && res.data) {
        const docs = res.data as Array<{
          id?: string;
          title?: string;
          message?: string;
          type?: string;
          status?: string;
          createdAt?: string;
          userId?: string;
          userRole?: string;
        }>;
        const relevant = docs
          .filter((doc) => {
            const targeted =
              doc.userId === user?.uid ||
              doc.userRole === 'all' ||
              doc.userRole?.toLowerCase() === user?.role?.toLowerCase();
            return targeted;
          })
          .sort((a, b) => {
            const da = new Date(a.createdAt || '').getTime();
            const db = new Date(b.createdAt || '').getTime();
            return db - da;
          });
        setNotifications(relevant);
        setHasNewNotifications(
          relevant.some((d) => d.status === 'unread' || d.status === 'new')
        );
      }
    } catch {}
  };

  const formatDateTime = (d?: string) =>
    new Date(d || new Date().toISOString()).toLocaleString();

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
            <h1 className="text-3xl font-bold text-gray-800">Welcome User</h1>
            
          </div>
        </div>

        <div className="w-full">
          <div className="relative">
            <button
              onClick={async () => {
                const next = !showNotifications;
                setShowNotifications(next);
                if (next) {
                  await loadNotifications();
                }
              }}
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
            {showNotifications && (
              <div className="absolute top-12 right-2 w-80 bg-white shadow-lg border border-gray-200 rounded-lg z-10">
                <div className="px-3 py-2 font-semibold text-gray-800">Notifications</div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((n) => (
                      <div key={n.id || `${n.type}-${n.createdAt}`} className="px-3 py-2 border-t border-gray-100 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-800">{n.title || (n.type || '').toUpperCase()}</span>
                          {(n.status === 'unread' || n.status === 'new') && (
                            <span className="inline-flex h-2 w-2 rounded-full bg-red-600"></span>
                          )}
                        </div>
                        {n.message && <div className="text-xs text-gray-600 mt-1">{n.message}</div>}
                        {n.status && (
                          <span className={`mt-1 inline-flex px-2 py-0.5 text-xs rounded ${statusBadgeClass(n.status)}`}>
                            {n.status.charAt(0).toUpperCase() + n.status.slice(1)}
                          </span>
                        )}
                        <div className="text-xs text-gray-500 mt-1">{formatDateTime(n.createdAt)}</div>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-sm text-gray-500">No notifications</div>
                  )}
                </div>
                <div className="px-3 py-2 text-right">
                  <button
                    onClick={() => router.push('/profile/notifications')}
                    className="text-sm text-red-600 hover:underline"
                  >
                  
                  </button>
                </div>
              </div>
            )}
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
