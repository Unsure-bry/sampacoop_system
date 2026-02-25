'use client';

import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import ActiveSavings from '@/components/user/ActiveSavings';
import DynamicDashboard from '@/components/user/DynamicDashboard';
import { Bell, X, Calendar, DollarSign, CreditCard, PiggyBank, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { firestore } from '@/lib/firebase';
import { getSavingsBalanceForMember, getMemberIdByUserId } from '@/lib/savingsService';

interface Notification {
  id?: string;
  title?: string;
  message?: string;
  type?: string;
  status?: string;
  createdAt?: string;
  userId?: string;
  userRole?: string;
  metadata?: {
    loanId?: string;
    amount?: number;
    reason?: string;
    scheduleDate?: string;
    transactionType?: string;
    paymentDate?: string;
  };
}

export default function OperatorDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const role = (user?.role ?? '').trim().toLowerCase();
  const roleReady = role.length > 0;
  const isOperator = role === 'operator';
  
  // Automatically redirect if user is not an operator
  useEffect(() => {
    if (!loading && user && role && role !== 'operator') {
      // Redirect to appropriate dashboard based on role
      switch(role) {
        case 'member':
          router.push('/dashboard');
          break;
        case 'admin':
        case 'superadmin':
          router.push('/admin/dashboard');
          break;
        case 'driver':
          router.push('/driver/dashboard');
          break;
        case 'chairman':
          router.push('/admin/chairman/home');
          break;
        case 'vice-chairman':
          router.push('/admin/vice-chairman/home');
          break;
        case 'secretary':
          router.push('/admin/secretary/home');
          break;
        case 'treasurer':
          router.push('/admin/treasurer/home');
          break;
        case 'manager':
          router.push('/admin/manager/home');
          break;
        default:
          router.push('/unauthorized');
      }
    }
  }, [user, loading, role, router]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  
  // State for savings data
  const [savingsData, setSavingsData] = useState({
    currentBalance: '0.00',
    totalDeposits: '0.00',
    totalWithdrawals: '0.00',
    lastTransaction: 'None'
  });
  const [hasMemberRecord, setHasMemberRecord] = useState(false);
  
  // Fetch savings data from member collection
  useEffect(() => {
    const fetchSavingsData = async () => {
      if (!user) return;
      
      try {
        console.log('Fetching savings for user:', user.uid);
        
        // Get member ID using the savings service
        const memberId = await getMemberIdByUserId(user.uid);
        console.log('Found memberId:', memberId);
        
        if (memberId) {
          setHasMemberRecord(true);
          
          // Get accurate savings balance using the service
          const savingsBalance = await getSavingsBalanceForMember(memberId);
          console.log('Savings balance:', savingsBalance);
          
          // Get transactions for deposits/withdrawals totals
          const savingsRes = await firestore.getCollection(`members/${memberId}/savings`);
          let totalDeposits = 0;
          let totalWithdrawals = 0;
          let lastTransactionDate = '';
          
          if (savingsRes.success && savingsRes.data && savingsRes.data.length > 0) {
            const savings = savingsRes.data;
            console.log('Found savings transactions:', savings.length);
            
            savings.forEach((record: any) => {
              const amount = parseFloat(record.amount) || 0;
              const type = record.type || record.transactionType || '';
              
              if (type === 'deposit') {
                totalDeposits += amount;
              } else if (type === 'withdrawal') {
                totalWithdrawals += amount;
              }
              
              if (record.createdAt && (!lastTransactionDate || new Date(record.createdAt) > new Date(lastTransactionDate))) {
                lastTransactionDate = record.createdAt;
              }
            });
          }
          
          setSavingsData({
            currentBalance: savingsBalance.toFixed(2),
            totalDeposits: totalDeposits.toFixed(2),
            totalWithdrawals: totalWithdrawals.toFixed(2),
            lastTransaction: lastTransactionDate || 'None'
          });
        } else {
          // If no member record found
          console.log('No member record found for user:', user.uid);
          setHasMemberRecord(false);
          setSavingsData({
            currentBalance: '0.00',
            totalDeposits: '0.00',
            totalWithdrawals: '0.00',
            lastTransaction: 'No member record'
          });
        }
      } catch (error) {
        console.error('Error fetching savings data:', error);
        setHasMemberRecord(false);
        setSavingsData({
          currentBalance: '0.00',
          totalDeposits: '0.00',
          totalWithdrawals: '0.00',
          lastTransaction: 'Error loading'
        });
      }
    };
    
    if (user) {
      fetchSavingsData();
    }
  }, [user]);

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
        if (!user?.uid) return;
        
        // Try to query with userId filter first
        let res = await firestore.queryDocuments('notifications', [
          { field: 'userId', operator: '==', value: user.uid }
        ]);
        
        // Fallback to getCollection if query fails (e.g., missing index)
        if (!res.success) {
          console.warn('Notification query failed, using fallback:', res.error);
          const allRes = await firestore.getCollection('notifications');
          if (allRes.success && allRes.data) {
            // Filter in memory
            res = {
              success: true,
              data: allRes.data.filter((doc: any) => doc.userId === user.uid)
            };
          }
        }
        
        if (res.success && res.data) {
          const docs = res.data as Array<{ userId?: string; userRole?: string; status?: string; type?: string }>;
          const has = docs.some((doc) => {
            const relevant = ['loan', 'savings', 'payment', 'approval', 'rejection', 'pending', 'welcome', 'general'].some(type => 
              (doc.type || '').toLowerCase().includes(type)
            );
            const unread = doc.status === 'unread' || doc.status === 'new';
            return relevant && unread;
          });
          setHasNewNotifications(has);
        }
      } catch (error) {
        console.error('Error checking notifications:', error);
      }
    };
    if (user && !loading) {
      checkNotifications();
    }
  }, [user, loading]);

  const loadNotifications = async () => {
    try {
      if (!user?.uid) return;
      
      // Try to query with userId filter and sorting first
      let res = await firestore.queryDocuments('notifications', [
        { field: 'userId', operator: '==', value: user.uid }
      ], { field: 'createdAt', direction: 'desc' });
      
      // Fallback to getCollection if query fails (e.g., missing index)
      if (!res.success) {
        console.warn('Notification query with orderBy failed, using fallback:', res.error);
        const allRes = await firestore.getCollection('notifications');
        if (allRes.success && allRes.data) {
          // Filter in memory and sort
          const filtered = allRes.data
            .filter((doc: any) => doc.userId === user.uid)
            .sort((a: any, b: any) => {
              const da = new Date(a.createdAt || '').getTime();
              const db = new Date(b.createdAt || '').getTime();
              return db - da;
            });
          res = { success: true, data: filtered };
        }
      }
      
      if (res.success && res.data) {
        const docs = res.data as Notification[];
        const relevant = docs
          .filter((doc) => {
            const t = (doc.type || '').toLowerCase();
            const matchesType =
              t.includes('loan') || 
              t.includes('savings') || 
              t.includes('payment') ||
              t.includes('approval') ||
              t.includes('rejection') ||
              t.includes('pending') ||
              t.includes('schedule') ||
              t.includes('welcome') || 
              t.includes('general');
            return matchesType;
          });
        setNotifications(relevant);
        setHasNewNotifications(
          relevant.some((d) => d.status === 'unread' || d.status === 'new')
        );
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await firestore.updateDocument('notifications', notificationId, {
        status: 'read',
        readAt: new Date().toISOString()
      });
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, status: 'read' } : n
        )
      );
      setHasNewNotifications(prev => 
        notifications.some(n => n.id !== notificationId && (n.status === 'unread' || n.status === 'new'))
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    setSelectedNotification(notification);
    setShowNotificationModal(true);
    setShowNotifications(false);
    
    // Mark as read if unread
    if (notification.id && (notification.status === 'unread' || notification.status === 'new')) {
      await markAsRead(notification.id);
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (type?: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('approval') || t.includes('approved')) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (t.includes('rejection') || t.includes('rejected')) return <AlertCircle className="h-5 w-5 text-red-600" />;
    if (t.includes('payment')) return <DollarSign className="h-5 w-5 text-blue-600" />;
    if (t.includes('savings')) return <PiggyBank className="h-5 w-5 text-purple-600" />;
    if (t.includes('schedule')) return <Calendar className="h-5 w-5 text-orange-600" />;
    if (t.includes('loan')) return <CreditCard className="h-5 w-5 text-indigo-600" />;
    return <Bell className="h-5 w-5 text-gray-600" />;
  };

  // Format notification type for display
  const formatNotificationType = (type?: string) => {
    if (!type) return 'General';
    return type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
  };

  const formatDateTime = (d?: string) =>
    new Date(d || new Date().toISOString()).toLocaleString();

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (roleReady && !isOperator) {
    return null;
  }

  return (
    <DynamicDashboard>
      <div className="max-w-7xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Welcome</h1>
          
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
                <div className="absolute top-10 right-0 w-96 bg-white shadow-xl border border-gray-200 rounded-xl z-50 max-h-[500px] flex flex-col">
                  <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <span className="font-semibold text-gray-800">Notifications</span>
                    {hasNewNotifications && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
                        New
                      </span>
                    )}
                  </div>
                  <div className="overflow-y-auto flex-1 max-h-[400px]">
                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <button
                          key={n.id || `${n.type}-${n.createdAt}`}
                          onClick={() => handleNotificationClick(n)}
                          className={`w-full px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left ${
                            n.status === 'unread' || n.status === 'new' ? 'bg-red-50' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              {getNotificationIcon(n.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium text-gray-800 truncate">
                                  {n.title || formatNotificationType(n.type)}
                                </span>
                                {(n.status === 'unread' || n.status === 'new') && (
                                  <span className="flex-shrink-0 h-2 w-2 rounded-full bg-red-600"></span>
                                )}
                              </div>
                              {n.message && (
                                <div className="text-xs text-gray-600 mt-1 line-clamp-2">{n.message}</div>
                              )}
                              <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDateTime(n.createdAt)}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center">
                        <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">No notifications yet</p>
                      </div>
                    )}
                  </div>
                  <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                    <button
                      onClick={() => {
                        setShowNotifications(false);
                        router.push('/profile/notifications');
                      }}
                      className="w-full text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* My Savings Card - shown for all users */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">My Savings</h2>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-800">Current Balance</h3>
              <span className="text-2xl font-bold text-red-600">
                ₱{savingsData.currentBalance}
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
      </div>

      {/* Notification Detail Modal */}
      {showNotificationModal && selectedNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 rounded-t-xl">
              <div className="flex items-center gap-3">
                {getNotificationIcon(selectedNotification.type)}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {selectedNotification.title || formatNotificationType(selectedNotification.type)}
                  </h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    selectedNotification.status === 'read' 
                      ? 'bg-gray-100 text-gray-600' 
                      : 'bg-red-100 text-red-600'
                  }`}>
                    {selectedNotification.status === 'read' ? 'Read' : 'Unread'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowNotificationModal(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4">
              {/* Message */}
              <div className="mb-6">
                <p className="text-gray-700 leading-relaxed">
                  {selectedNotification.message}
                </p>
              </div>

              {/* Metadata Section */}
              {selectedNotification.metadata && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Details</h4>
                  <div className="space-y-2">
                    {selectedNotification.metadata.amount && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Amount:</span>
                        <span className="text-sm font-medium text-gray-800">
                          ₱{selectedNotification.metadata.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    {selectedNotification.metadata.loanId && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Loan ID:</span>
                        <span className="text-sm font-medium text-gray-800">
                          {selectedNotification.metadata.loanId}
                        </span>
                      </div>
                    )}
                    {selectedNotification.metadata.reason && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Reason:</span>
                        <span className="text-sm font-medium text-red-600">
                          {selectedNotification.metadata.reason}
                        </span>
                      </div>
                    )}
                    {selectedNotification.metadata.scheduleDate && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Schedule Date:</span>
                        <span className="text-sm font-medium text-gray-800">
                          {new Date(selectedNotification.metadata.scheduleDate).toLocaleDateString('en-PH', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    )}
                    {selectedNotification.metadata.transactionType && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Transaction Type:</span>
                        <span className={`text-sm font-medium ${
                          selectedNotification.metadata.transactionType === 'deposit' 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {selectedNotification.metadata.transactionType.charAt(0).toUpperCase() + 
                           selectedNotification.metadata.transactionType.slice(1)}
                        </span>
                      </div>
                    )}
                    {selectedNotification.metadata.paymentDate && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Payment Date:</span>
                        <span className="text-sm font-medium text-gray-800">
                          {new Date(selectedNotification.metadata.paymentDate).toLocaleDateString('en-PH', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                <span>Received: {formatDateTime(selectedNotification.createdAt)}</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex gap-3">
              <button
                onClick={() => setShowNotificationModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
              >
                Close
              </button>
              {selectedNotification.type?.toLowerCase().includes('loan') && (
                <button
                  onClick={() => {
                    setShowNotificationModal(false);
                    router.push('/loan');
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  View Loan
                </button>
              )}
              {selectedNotification.type?.toLowerCase().includes('savings') && (
                <button
                  onClick={() => {
                    setShowNotificationModal(false);
                    router.push('/savings');
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  View Savings
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </DynamicDashboard>
  );
}
