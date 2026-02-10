'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { SavingsTransaction } from '@/lib/types/savings';
import Card from '@/components/shared/Card';
import {
  getUserSavingsTransactions,
  getUserSavingsBalance
} from '@/lib/savingsService';
import { firestore } from '@/lib/firebase';
import { getMemberByUserId } from '@/lib/userMemberService';

interface ActiveSavingsProps {
  compact?: boolean;
}

export default function ActiveSavings({ compact = false }: ActiveSavingsProps) {
  const { user, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<SavingsTransaction[]>([]);
  const [totalSavings, setTotalSavings] = useState(0);
  const [memberSavingsCredit, setMemberSavingsCredit] = useState<number>(0);
  const [dataLoading, setDataLoading] = useState(true);

  // Fetch savings transactions function
  const fetchSavingsTransactions = async () => {
    try {
      if (!user) return;
      
      setDataLoading(true);
      
      // Use the savings service to get user's savings transactions
      const userTransactions = await getUserSavingsTransactions(user.uid);
      
      // Sort by date descending for display (newest first)
      const sortedTransactions = userTransactions.sort((a, b) => 
        new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
      );
      
      setTransactions(sortedTransactions);
      
      // Get the current balance using the savings service
      const currentBalance = await getUserSavingsBalance(user.uid);
      setTotalSavings(currentBalance);
      
      // Fetch member data to get savings credit
      const memberData = await getMemberByUserId(user.uid);
      if (memberData && memberData.paymentInfo && memberData.paymentInfo.savingsCredit) {
        setMemberSavingsCredit(memberData.paymentInfo.savingsCredit);
      } else {
        setMemberSavingsCredit(0);
      }
    } catch (error) {
      console.error('Error fetching savings transactions:', error);
      // Set defaults on error
      setTransactions([]);
      setTotalSavings(0);
      setMemberSavingsCredit(0);
    } finally {
      setDataLoading(false);
    }
  };

  // Track previous transactions to detect new ones
  const [previousTransactionIds, setPreviousTransactionIds] = useState<Set<string>>(new Set());

  // Function to refresh data
  const refreshData = async () => {
    if (user) {
      await fetchSavingsTransactions();
    }
  };

  useEffect(() => {
    if (user) {
      fetchSavingsTransactions();
      
      // Refresh data when the page becomes visible again (e.g., user returns to tab)
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          fetchSavingsTransactions();
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // Clean up the event listener when the component unmounts
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    } else if (user === null) {
      // User is explicitly not logged in
      setDataLoading(false);
      setTransactions([]);
      setTotalSavings(0);
    }
  }, [user]);

  // Effect to handle new transactions and create notifications
  useEffect(() => {
    if (transactions.length > 0 && user) {
      // Identify new transactions that weren't seen before
      const newTransactions = transactions.filter(transaction => {
        const transactionId = transaction.id || `${transaction.amount}-${transaction.createdAt || transaction.date}`;
        return !previousTransactionIds.has(transactionId);
      });
      
      // Create notifications for new transactions
      newTransactions.forEach(async (transaction) => {
        const transactionId = transaction.id || `${transaction.amount}-${transaction.createdAt || transaction.date}`;
        setPreviousTransactionIds(prev => new Set(prev).add(transactionId));
        await createSavingsNotification(user.uid, transaction);
      });
    }
  }, [transactions, user, previousTransactionIds]);

  // Expose refresh function to parent components if needed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).refreshSavingsData = refreshData;
    }
    
    return () => {
      if ((window as any).refreshSavingsData === refreshData) {
        (window as any).refreshSavingsData = null;
      }
    };
  }, [refreshData]);

  // Function to create notifications for savings transactions
  const createSavingsNotification = async (userId: string, transaction: SavingsTransaction) => {
    try {
      const notificationData = {
        userId: userId,
        userRole: user?.role || 'member',
        title: 'Savings Transaction',
        message: `A ${transaction.type} of ${formatCurrency(transaction.amount)} has been processed to your savings account.`,
        type: 'savings',
        status: 'unread',
        createdAt: new Date().toISOString(),
        relatedEntity: {
          type: 'savings_transaction',
          id: transaction.id
        }
      };
      
      // Generate a unique ID for the notification
      const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await firestore.setDocument('notifications', notificationId, notificationData);
    } catch (error) {
      console.error('Error creating savings notification:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  // Don't render anything while auth is loading
  if (authLoading) {
    if (compact) {
      return (
        <Card title="My Savings" className="h-full">
          <div className="flex flex-col items-center justify-center h-full py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
          </div>
        </Card>
      );
    }
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  // Don't render if user is not authenticated
  if (!user) {
    if (compact) {
      return (
        <Card title="My Savings" className="h-full">
          <div className="flex flex-col items-center justify-center h-full py-8">
            <div className="text-4xl font-bold text-gray-400 mb-2">0.00</div>
            <p className="text-gray-500 mb-4">Please log in</p>
          </div>
        </Card>
      );
    }
    return null;
  }

  if (compact) {
    // Compact version for dashboard cards
    return (
      <Card title="My Savings" className="h-full">
        <div className="flex flex-col items-center justify-center h-full py-8">
          <div className="text-4xl font-bold text-gray-800 mb-2">
            {dataLoading ? '...' : formatCurrency(totalSavings)}
          </div>
          <p className="text-gray-600 mb-2">Current Savings Balance</p>
          
          {/* Show member's savings credit if available */}
          {user?.role && (user.role.toLowerCase() === 'driver' || user.role.toLowerCase() === 'operator') && (
            <div className="text-2xl font-bold text-blue-600 mb-2">
              {dataLoading ? '...' : formatCurrency(memberSavingsCredit)}
            </div>
          )}
          {user?.role && (user.role.toLowerCase() === 'driver' || user.role.toLowerCase() === 'operator') && (
            <p className="text-blue-600 mb-4">Savings Credit</p>
          )}
          
          <div className="flex flex-col space-y-2">
            <button 
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.href = '/savings';
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              View Savings
            </button>
            <button 
              onClick={refreshData}
              disabled={dataLoading}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {dataLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </Card>
    );
  }

  // Full version for detailed display
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-col">
          <h2 className="text-xl font-semibold text-gray-800">Recent Savings Transactions</h2>
          
          {/* Show member's savings credit if available for drivers/operators */}
          {user?.role && (user.role.toLowerCase() === 'driver' || user.role.toLowerCase() === 'operator') && (
            <div className="flex items-center mt-2">
              <span className="text-sm text-gray-600 mr-2">Savings Credit:</span>
              <span className="text-lg font-semibold text-blue-600">{dataLoading ? '...' : formatCurrency(memberSavingsCredit)}</span>
            </div>
          )}
        </div>
        
        <button 
          onClick={refreshData}
          disabled={dataLoading}
          className="px-3 py-1 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {dataLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      
      {dataLoading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-8">
          <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No transactions yet</h3>
          <p className="text-gray-500">Your savings transactions will appear here.</p>
        </div>
      ) : (
        <div className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.slice(0, 5).map((transaction) => (
                  <tr 
                    key={transaction.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      // Show transaction details in an alert
                      const transactionDetails = `
Transaction Details:

Date: ${formatDate(transaction.createdAt || transaction.date)}
Type: ${transaction.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
Amount: ${transaction.type === 'deposit' ? '+' : '-'}${formatCurrency(transaction.amount)}
Balance: ${formatCurrency(transaction.balance || 0)}
`;
                      alert(transactionDetails);
                    }}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(transaction.createdAt || transaction.date)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        transaction.type === 'deposit' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                      </span>
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${
                      transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'deposit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(transaction.balance || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

}
