'use client';

import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
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

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
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
    memberType: 'Member',
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

    // Set up real-time listener for loans
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
      
      // Find next payment due
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
        
        // Fetch savings transactions first (more reliable)
        const memberId = await getMemberIdByUserId(user.uid);
        if (memberId && db) {
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
        
        // Sort by date and take top 5
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
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-0">
        <div className="mb-6 sm:mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Welcome</h1>
            
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
                <div className="absolute top-10 right-0 w-72 sm:w-80 bg-white shadow-lg border border-gray-200 rounded-lg z-10">
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

        {/* 1. Member Profile Summary */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4 mb-4">
              <div className="p-2 sm:p-3 bg-red-100 rounded-full">
                <User className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Member Profile</h2>
                <p className="text-xs sm:text-sm text-gray-500">Your membership information</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Full Name</p>
                <p className="text-base sm:text-lg font-semibold text-gray-800 truncate">{memberProfile.fullName}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Member Type</p>
                <p className="text-base sm:text-lg font-semibold text-gray-800">{memberProfile.memberType}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Membership Status</p>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${
                  memberProfile.membershipStatus.toLowerCase() === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : memberProfile.membershipStatus.toLowerCase() === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {memberProfile.membershipStatus}
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Date Joined</p>
                <p className="text-base sm:text-lg font-semibold text-gray-800">{memberProfile.dateJoined}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Loan Summary */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4 mb-4">
              <div className="p-2 sm:p-3 bg-blue-100 rounded-full">
                <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Loan Summary</h2>
                <p className="text-xs sm:text-sm text-gray-500">Overview of your loans</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-blue-600 mb-1">Total Loan Balance</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-800">{formatCurrency(totalLoanBalance)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Active Loans</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-800">{loans.filter(l => l.status === 'active' || l.status === 'approved').length}</p>
              </div>
            </div>

            {loans.length > 0 && (
              <div className="overflow-x-auto -mx-4 sm:-mx-6">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase">Loan ID</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase hidden sm:table-cell">Amount</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase">Balance</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loans.map((loan) => (
                      <tr key={loan.id} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                          <div className="truncate max-w-[100px] sm:max-w-none">{loan.loanId || loan.id}</div>
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-900 hidden sm:table-cell">
                          {formatCurrency(loan.amount)}
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                          {formatCurrency(loan.remainingBalance || 0)}
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${
                            loan.status === 'active' || loan.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : loan.status === 'completed' || loan.status === 'paid'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {loan.status === 'active' ? 'Active' : loan.status === 'approved' ? 'Approved' : loan.status === 'completed' || loan.status === 'paid' ? 'Completed' : loan.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="mt-4">
              <button 
                onClick={() => router.push('/loan')}
                className="text-red-600 hover:text-red-700 font-medium text-sm"
              >
                View Loan Details →
              </button>
            </div>
          </div>
        </div>

        {/* 3. Savings / Share Capital Summary */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4 mb-4">
              <div className="p-2 sm:p-3 bg-green-100 rounded-full">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Savings Summary</h2>
                <p className="text-xs sm:text-sm text-gray-500">Your financial contributions</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-green-50 rounded-lg p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-green-600 mb-1">Total Savings Balance</p>
                <p className="text-xl sm:text-2xl font-bold text-green-800">₱{savingsData.currentBalance}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Deposits</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-800">₱{savingsData.totalDeposits}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Last Deposit Date</p>
                <p className="text-base sm:text-lg font-semibold text-gray-800">{savingsData.lastDepositDate}</p>
              </div>
            </div>
            <div className="mt-4">
              <button 
                onClick={() => router.push('/savings')}
                className="text-red-600 hover:text-red-700 font-medium text-sm"
              >
                View Savings Details →
              </button>
            </div>
          </div>
        </div>

        {/* 4. Recent Transactions */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4 mb-4">
              <div className="p-2 sm:p-3 bg-purple-100 rounded-full">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Recent Transactions</h2>
                <p className="text-xs sm:text-sm text-gray-500">Your latest financial activities</p>
              </div>
            </div>
            
            {recentTransactions.length > 0 ? (
              <div className="overflow-x-auto -mx-4 sm:-mx-6">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentTransactions.map((transaction, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                          {transaction.date.toLocaleDateString('en-PH')}
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                          {transaction.type}
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                          {formatCurrency(transaction.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No recent transactions</p>
            )}
          </div>
        </div>

        {/* 5. Loan Application Status */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4 mb-4">
              <div className="p-2 sm:p-3 bg-yellow-100 rounded-full">
                <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Loan Application Status</h2>
                <p className="text-xs sm:text-sm text-gray-500">Track your loan applications</p>
              </div>
            </div>
            
            {loanRequests.length > 0 ? (
              <div className="overflow-x-auto -mx-4 sm:-mx-6">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase">Loan ID</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase hidden sm:table-cell">Type</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase hidden md:table-cell">Date</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase">Amount</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loanRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                          <div className="truncate max-w-[100px] sm:max-w-none">{request.loanId || request.id}</div>
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-900 hidden sm:table-cell">
                          {request.planName || 'General Loan'}
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-900 hidden md:table-cell">
                          {request.createdAt ? new Date(request.createdAt).toLocaleDateString('en-PH') : 'N/A'}
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                          {formatCurrency(request.amount)}
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${
                            request.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : request.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : request.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {request.status === 'pending' ? 'Pending' : request.status === 'approved' ? 'Approved' : request.status === 'rejected' ? 'Rejected' : request.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No loan applications</p>
            )}
          </div>
        </div>

        {/* 6. Loan Payment Reminder */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4 mb-4">
              <div className="p-2 sm:p-3 bg-red-100 rounded-full">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Loan Payment Reminder</h2>
                <p className="text-xs sm:text-sm text-gray-500">Upcoming payment due</p>
              </div>
            </div>
            
            {nextPayment ? (
              <div className="bg-red-50 rounded-lg p-3 sm:p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <p className="text-xs sm:text-sm text-red-600 mb-1">Loan ID</p>
                    <p className="text-base sm:text-lg font-semibold text-red-800 truncate">{nextPayment.loanId}</p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-red-600 mb-1">Payment Amount</p>
                    <p className="text-base sm:text-lg font-semibold text-red-800">{formatCurrency(nextPayment.amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-red-600 mb-1">Due Date</p>
                    <p className="text-base sm:text-lg font-semibold text-red-800">{new Date(nextPayment.dueDate).toLocaleDateString('en-PH')}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 text-center">
                <p className="text-sm text-gray-600">No upcoming loan payments.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </DynamicDashboard>
  );
}

