'use client';

import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import ActiveSavings from '@/components/user/ActiveSavings';
import DynamicDashboard from '@/components/user/DynamicDashboard';
import { Bell, X, Calendar, DollarSign, CreditCard, PiggyBank, AlertCircle, CheckCircle, Clock, User, Wallet, TrendingUp, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { firestore, db } from '@/lib/firebase';
import { getSavingsBalanceForMember, getMemberIdByUserId } from '@/lib/savingsService';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

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
    lastTransaction: 'None',
    lastDepositDate: 'None'
  });
  const [hasMemberRecord, setHasMemberRecord] = useState(false);
  
  // State for member profile
  const [memberProfile, setMemberProfile] = useState({
    fullName: '',
    memberType: 'Operator',
    membershipStatus: 'Active',
    dateJoined: ''
  });
  
  // State for loans
  const [loans, setLoans] = useState<any[]>([]);
  const [loanRequests, setLoanRequests] = useState<any[]>([]);
  const [totalLoanBalance, setTotalLoanBalance] = useState(0);
  
  // State for recent transactions
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  
  // State for next payment
  const [nextPayment, setNextPayment] = useState<any>(null);
  
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
          let lastDepositDate: string | null = null;
          
          if (savingsRes.success && savingsRes.data && savingsRes.data.length > 0) {
            const savings = savingsRes.data;
            console.log('Found savings transactions:', savings.length);
            
            savings.forEach((record: any) => {
              const amount = parseFloat(record.amount) || 0;
              const type = record.type || record.transactionType || '';
              
              if (type === 'deposit') {
                totalDeposits += amount;
                if (record.createdAt && (!lastDepositDate || new Date(record.createdAt) > new Date(lastDepositDate))) {
                  lastDepositDate = record.createdAt;
                }
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
            lastTransaction: lastTransactionDate || 'None',
            lastDepositDate: lastDepositDate ? new Date(lastDepositDate).toLocaleDateString('en-PH') : 'None'
          });
        } else {
          // If no member record found
          console.log('No member record found for user:', user.uid);
          setHasMemberRecord(false);
          setSavingsData({
            currentBalance: '0.00',
            totalDeposits: '0.00',
            totalWithdrawals: '0.00',
            lastTransaction: 'No member record',
            lastDepositDate: 'None'
          });
        }
      } catch (error) {
        console.error('Error fetching savings data:', error);
        setHasMemberRecord(false);
        setSavingsData({
          currentBalance: '0.00',
          totalDeposits: '0.00',
          totalWithdrawals: '0.00',
          lastTransaction: 'Error loading',
          lastDepositDate: 'None'
        });
      }
    };
    
    if (user) {
      fetchSavingsData();
    }
  }, [user]);

  // Fetch member profile
  useEffect(() => {
    const fetchMemberProfile = async () => {
      if (!user?.uid) return;
      
      try {
        // Get member data
        const memberResult = await firestore.getDocument('members', user.uid);
        if (memberResult.success && memberResult.data) {
          const memberData = memberResult.data;
          setMemberProfile({
            fullName: memberData.fullName || user.displayName || 'N/A',
            memberType: user.role === 'driver' ? 'Driver' : user.role === 'operator' ? 'Operator' : 'Member',
            membershipStatus: memberData.status || 'Active',
            dateJoined: memberData.createdAt ? new Date(memberData.createdAt).toLocaleDateString('en-PH') : 'N/A'
          });
        } else {
          // Fallback to user data
          setMemberProfile({
            fullName: user.displayName || 'N/A',
            memberType: user.role === 'driver' ? 'Driver' : user.role === 'operator' ? 'Operator' : 'Member',
            membershipStatus: 'Active',
            dateJoined: 'N/A'
          });
        }
      } catch (error) {
        console.error('Error fetching member profile:', error);
      }
    };
    
    if (user) {
      fetchMemberProfile();
    }
  }, [user]);

  // Fetch loans data
  useEffect(() => {
    if (!user?.uid || !db) return;

    const loansQuery = query(
      collection(db, 'loans'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(loansQuery, (snapshot) => {
      const loansData: any[] = [];
      let totalBalance = 0;
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const loan = {
          id: doc.id,
          loanId: data.loanId || doc.id,
          amount: data.amount || 0,
          remainingBalance: data.remainingBalance || 0,
          status: data.status || 'active',
          planName: data.planName || 'General Loan',
          ...data
        };
        loansData.push(loan);
        
        if (data.status === 'active' || data.status === 'approved') {
          totalBalance += data.remainingBalance || 0;
        }
      });
      
      setLoans(loansData);
      setTotalLoanBalance(totalBalance);
      
      const activeLoan = loansData.find(l => l.status === 'active');
      if (activeLoan && activeLoan.paymentSchedule) {
        const nextDue = activeLoan.paymentSchedule.find((p: any) => p.status === 'pending' || p.status === 'partial');
        if (nextDue) {
          setNextPayment({
            loanId: activeLoan.loanId || activeLoan.id,
            amount: nextDue.totalPayment,
            dueDate: nextDue.paymentDate
          });
        } else {
          setNextPayment(null);
        }
      } else {
        setNextPayment(null);
      }
    }, (error) => {
      console.error('Error fetching loans:', error);
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch loan requests
  useEffect(() => {
    if (!user?.uid || !db) return;

    const loanRequestsQuery = query(
      collection(db, 'loanRequests'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(loanRequestsQuery, (snapshot) => {
      const requestsData: any[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        requestsData.push({
          id: doc.id,
          loanId: data.loanId || doc.id,
          planName: data.planName || 'General Loan',
          amount: data.amount || 0,
          status: data.status || 'pending',
          createdAt: data.createdAt,
          ...data
        });
      });
      
      setLoanRequests(requestsData);
    }, (error) => {
      console.error('Error fetching loan requests:', error);
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch recent transactions
  useEffect(() => {
    if (!user?.uid) return;

    const fetchRecentTransactions = async () => {
      try {
        const transactions: any[] = [];
        
        const memberId = await getMemberIdByUserId(user.uid);
        if (memberId) {
          const savingsRes = await firestore.getCollection(`members/${memberId}/savings`);
          if (savingsRes.success && savingsRes.data) {
            savingsRes.data.slice(0, 5).forEach((record: any) => {
              const type = record.type || record.transactionType || '';
              transactions.push({
                id: record.id,
                date: record.createdAt ? new Date(record.createdAt) : new Date(),
                type: type === 'deposit' ? 'Savings Deposit' : type === 'withdrawal' ? 'Withdrawal' : 'Savings Transaction',
                amount: parseFloat(record.amount) || 0
              });
            });
          }
        }
        
        transactions.sort((a, b) => b.date - a.date);
        setRecentTransactions(transactions.slice(0, 5));
      } catch (error) {
        console.error('Error fetching recent transactions:', error);
      }
    };
    
    fetchRecentTransactions();
  }, [user]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
  };

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
                <div className="fixed sm:absolute top-16 sm:top-10 right-2 sm:right-0 w-[calc(100vw-1rem)] sm:w-96 max-w-sm bg-white shadow-xl border border-gray-200 rounded-xl z-50 max-h-[500px] flex flex-col">
                  <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800">Notifications</span>
                      {hasNewNotifications && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
                          New
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                      aria-label="Close notifications"
                    >
                      <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
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
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 1. Member Profile Summary */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <User className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Member Profile</h2>
                <p className="text-sm text-gray-500">Your membership information</p>
              </div>
            </div>
            {/* Full Name - Full Width */}
            <div className="bg-gray-50 rounded-lg p-3 lg:p-4 mb-3 overflow-hidden">
              <p className="text-xs text-gray-600 truncate">Full Name</p>
              <p className="text-base lg:text-lg font-semibold text-gray-800 truncate">{memberProfile.fullName}</p>
            </div>
            
            {/* Member Type, Date Joined - 2 Columns */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3 lg:p-4 overflow-hidden">
                <p className="text-xs text-gray-600 truncate">Member Type</p>
                <p className="text-sm lg:text-base font-semibold text-gray-800 truncate">{memberProfile.memberType}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 lg:p-4 overflow-hidden">
                <p className="text-xs text-gray-600 truncate">Date Joined</p>
                <p className="text-sm lg:text-base font-semibold text-gray-800 truncate">{memberProfile.dateJoined}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Financial Overview Panel */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-blue-100 rounded-full">
                <Wallet className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Financial Overview</h2>
                <p className="text-sm text-gray-500">Your loans and savings at a glance</p>
              </div>
            </div>
            
            {/* Summary Cards - Full Width Layout */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-blue-50 rounded-lg p-3 lg:p-4 overflow-hidden">
                <p className="text-xs text-blue-600 mb-1 truncate">Loan Balance</p>
                <p className="text-lg lg:text-xl font-bold text-blue-800 truncate">{formatCurrency(totalLoanBalance)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 lg:p-4 overflow-hidden">
                <p className="text-xs text-gray-600 mb-1 truncate">Active Loans</p>
                <p className="text-lg lg:text-xl font-bold text-gray-800 truncate">{loans.filter(l => l.status === 'active' || l.status === 'approved').length}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 lg:p-4 overflow-hidden">
                <p className="text-xs text-green-600 mb-1 truncate">Total Savings</p>
                <p className="text-lg lg:text-xl font-bold text-green-800 truncate">₱{parseFloat(savingsData.currentBalance).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 lg:p-4 overflow-hidden">
                <p className="text-xs text-gray-600 mb-1 truncate">Total Deposits</p>
                <p className="text-lg lg:text-xl font-bold text-gray-800 truncate">₱{parseFloat(savingsData.totalDeposits).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Loan Payment Reminder */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <Calendar className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Loan Payment Reminder</h2>
                <p className="text-sm text-gray-500">Upcoming payment due</p>
              </div>
            </div>
            
            {nextPayment ? (
              <div className="bg-red-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-red-600">Loan ID</p>
                    <p className="text-lg font-semibold text-red-800">{nextPayment.loanId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-red-600">Payment Amount</p>
                    <p className="text-lg font-semibold text-red-800">{formatCurrency(nextPayment.amount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-red-600">Due Date</p>
                    <p className="text-lg font-semibold text-red-800">{new Date(nextPayment.dueDate).toLocaleDateString('en-PH')}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-gray-600">No upcoming loan payments.</p>
              </div>
            )}
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
