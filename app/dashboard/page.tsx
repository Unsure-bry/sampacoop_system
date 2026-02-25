'use client';

import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import ActiveSavings from '@/components/user/ActiveSavings';
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

  
  // State for savings data
  const [savingsData, setSavingsData] = useState({
    currentBalance: '0.00',
    totalDeposits: '0.00',
    totalWithdrawals: '0.00',
    lastTransaction: 'None'
  });
  
  // Fetch savings data from member collection
  useEffect(() => {
    const fetchSavingsData = async () => {
      if (!user || !isMember) return;
      
      try {
        // First, try to get user's member by querying members collection
        const membersRes = await firestore.queryDocuments('members', [
          { field: 'userId', operator: '==', value: user.uid }
        ]);
        
        if (membersRes.success && membersRes.data && membersRes.data.length > 0) {
          const member = membersRes.data[0];
          const memberId = member.id;
          
          // Get savings data from member's subcollection or main savings collection
          let savingsBalance = 0;
          let totalDeposits = 0;
          let totalWithdrawals = 0;
          let lastTransactionDate = '';
          
          // Try getting from member's savings subcollection
          // Since getSubCollection doesn't exist, we'll need to use a different approach
          // Query the main savings collection filtered by member ID
          const savingsRes = await firestore.queryDocuments('savings', [
            { field: 'memberId', operator: '==', value: memberId }
          ]);
          
          if (savingsRes.success && savingsRes.data) {
            const savings = savingsRes.data;
            
            savings.forEach((record: any) => {
              if (record.type === 'deposit' || record.transactionType === 'deposit') {
                totalDeposits += parseFloat(record.amount) || 0;
              } else if (record.type === 'withdrawal' || record.transactionType === 'withdrawal') {
                totalWithdrawals += parseFloat(record.amount) || 0;
              }
              
              if (record.createdAt && (!lastTransactionDate || new Date(record.createdAt) > new Date(lastTransactionDate))) {
                lastTransactionDate = record.createdAt;
              }
            });
          } else {
            // Alternative: check main savings collection by userId
            const mainSavingsRes = await firestore.queryDocuments('savings', [
              { field: 'userId', operator: '==', value: user.uid }
            ]);
            
            if (mainSavingsRes.success && mainSavingsRes.data) {
              const savings = mainSavingsRes.data;
              
              savings.forEach((record: any) => {
                if (record.type === 'deposit' || record.transactionType === 'deposit') {
                  totalDeposits += parseFloat(record.amount) || 0;
                } else if (record.type === 'withdrawal' || record.transactionType === 'withdrawal') {
                  totalWithdrawals += parseFloat(record.amount) || 0;
                }
                
                if (record.createdAt && (!lastTransactionDate || new Date(record.createdAt) > new Date(lastTransactionDate))) {
                  lastTransactionDate = record.createdAt;
                }
              });
            }
          }
          
          savingsBalance = totalDeposits - totalWithdrawals;
          
          setSavingsData({
            currentBalance: savingsBalance.toFixed(2),
            totalDeposits: totalDeposits.toFixed(2),
            totalWithdrawals: totalWithdrawals.toFixed(2),
            lastTransaction: lastTransactionDate || 'None'
          });
        }
      } catch (error) {
        console.error('Error fetching savings data:', error);
        // Set default values on error
        setSavingsData({
          currentBalance: '0.00',
          totalDeposits: '0.00',
          totalWithdrawals: '0.00',
          lastTransaction: 'Error loading'
        });
      }
    };
    
    if (user && isMember) {
      fetchSavingsData();
    }
  }, [user, isMember]);
  const statusBadgeClass = (status?: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'approved') return 'bg-green-100 text-green-800';
    if (s === 'rejected') return 'bg-red-100 text-red-800';
    if (s === 'unread' || s === 'new') return 'bg-red-100 text-red-800';
    if (s === 'read') return 'bg-gray-100 text-gray-600';
    return 'bg-gray-100 text-gray-800';
  };

  useEffect(() => {
    const checkNotifications = async () => {
      try {
        const res = await firestore.getCollection('notifications');
        if (res.success && res.data) {
          const docs = res.data as Array<{ userId?: string; userRole?: string; status?: string; type?: string }>;
          const has = docs.some((doc) => {
            const targeted =
              doc.userId === user?.uid ||
              doc.userRole === 'all' ||
              doc.userRole?.toLowerCase() === user?.role?.toLowerCase();
            const unread = doc.status === 'unread' || doc.status === 'new';
            
            // Include various notification types for driver/operator
            const validTypes = ['loan', 'savings', 'payment', 'application', 'request', 'general'];
            const hasValidType = !doc.type || validTypes.some(type => doc.type?.toLowerCase().includes(type));
            
            return targeted && unread && hasValidType;
          });
          setHasNewNotifications(has);
        }
      } catch {}
    };
    if (user && !loading) {
      checkNotifications();
    }
  }, [user, loading, notifications]);

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
            
            // Include various notification types for driver/operator
            const validTypes = ['loan', 'savings', 'payment', 'application', 'request', 'general'];
            const hasValidType = !doc.type || validTypes.some(type => doc.type?.toLowerCase().includes(type));
            
            return targeted && hasValidType;
          })
          .map(doc => {
            // Simplify loan payment messages for drivers and operators
            if (doc.type?.toLowerCase().includes('loan') && 
                doc.message?.toLowerCase().includes('paid') && 
                (user?.role?.toLowerCase() === 'driver' || user?.role?.toLowerCase() === 'operator')) {
              return {
                ...doc,
                message: 'Your loan payment has been processed successfully.',
                title: doc.title || 'Loan Payment'
              };
            }
            return doc;
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

  if (!user) {
    return null;
  }

  return (
    <DynamicDashboard>
      <div className="max-w-7xl mx-auto w-full">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Welcome</h1>
            
          </div>
        </div>

        <div className="w-full">
          <div className="flex justify-end mb-4">
            <div className="relative">
              <button
                onClick={async () => {
                  const next = !showNotifications;
                  setShowNotifications(next);
                  if (next) {
                    await loadNotifications();
                  }
                }}
                className="p-2 rounded-full hover:bg-gray-100 relative"
                aria-label="Notifications"
              >
                <Bell className="h-6 w-6 text-gray-700" />
                {hasNewNotifications && (
                  <>
                    <span className="absolute top-0 right-0 inline-flex h-2 w-2 rounded-full bg-red-600 animate-ping"></span>
                    <span className="absolute top-0 right-0 inline-flex h-2 w-2 rounded-full bg-red-600"></span>
                  </>
                )}
              </button>
              {showNotifications && (
                <div className="absolute top-10 right-0 w-80 bg-white shadow-lg border border-gray-200 rounded-lg z-10">
                  <div className="px-3 py-2 font-semibold text-gray-800">Notifications</div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <div key={n.id || `${n.type}-${n.createdAt}`} className="px-3 py-2 border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => {
                          // Mark notification as read when clicked
                          const updatedNotifications = [...notifications];
                          const index = updatedNotifications.findIndex(notification => notification.id === n.id);
                          if (index !== -1 && (updatedNotifications[index].status === 'unread' || updatedNotifications[index].status === 'new')) {
                            updatedNotifications[index].status = 'read';
                            setNotifications(updatedNotifications);
                            setHasNewNotifications(updatedNotifications.some(d => d.status === 'unread' || d.status === 'new'));
                            
                            // Update in Firestore
                            if (n.id) {
                              firestore.updateDocument('notifications', n.id, { status: 'read' });
                            }
                          }
                          
                          // Show full notification details in alert
                          const fullDetails = `
Title: ${n.title || n.type || 'Notification'}

Message: ${n.message || 'No message'}

Date: ${formatDateTime(n.createdAt)}
Status: ${n.status || 'N/A'}
`;
                          alert(fullDetails);
                        }}>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-800 font-medium">{n.title || (n.type || '').toUpperCase()}</span>
                            {(n.status === 'unread' || n.status === 'new') && (
                              <span className="inline-flex h-2 w-2 rounded-full bg-red-600"></span>
                            )}
                          </div>
                          {n.message && <div className="text-xs text-gray-600 mt-1 truncate">{n.message}</div>}
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
                      View all
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* My Savings Card */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">My Savings</h2>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-800">Current Balance</h3>
              <span className="text-2xl font-bold text-red-600">
                ₱{isMember ? savingsData.currentBalance : 'N/A'}
              </span>
            </div>
            <div className="mt-6">
              <button 
                onClick={() => router.push('/savings')}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md transition duration-200"
              >
                View Savings Details
              </button>
            </div>
          </div>
        </div>

        {/* Show appropriate content based on role */}
        {isMember && (
          <div className="mt-8">
            <ActiveSavings compact={true} />
          </div>
        )}

      </div>
    </DynamicDashboard>
    
  );
}

