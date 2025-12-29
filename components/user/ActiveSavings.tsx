'use client';

import { useState, useEffect } from 'react';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { SavingsTransaction } from '@/lib/types/savings';
import Card from '@/components/shared/Card';

interface ActiveSavingsProps {
  compact?: boolean;
}

export default function ActiveSavings({ compact = false }: ActiveSavingsProps) {
  const { user, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<SavingsTransaction[]>([]);
  const [totalSavings, setTotalSavings] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSavingsTransactions();
    } else if (user === null) {
      // User is explicitly not logged in
      setDataLoading(false);
      setTransactions([]);
      setTotalSavings(0);
    }
  }, [user]);

  const fetchSavingsTransactions = async () => {
    try {
      if (!user) return;
      
      setDataLoading(true);
      // Fetch savings transactions from /members/{memberId}/savings collection
      const result = await firestore.getCollection(`members/${user.uid}/savings`);
      
      if (result.success && result.data) {
        // Sort transactions by date (oldest first) to calculate running balance correctly
        const sortedTransactions = result.data
          .map((doc: any) => ({
            id: doc.id,
            ...doc
          }))
          .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        // Calculate running balance for each transaction
        let runningBalance = 0;
        const transactionsWithBalance = sortedTransactions.map((transaction: any) => {
          if (transaction.type === 'deposit') {
            runningBalance += transaction.amount;
          } else if (transaction.type === 'withdrawal') {
            runningBalance -= transaction.amount;
          }
          
          return {
            ...transaction,
            balance: runningBalance
          };
        });
        
        // Sort by date descending for display (newest first)
        const transactionsData = transactionsWithBalance
          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        setTransactions(transactionsData);
        
        // Use the balance from the most recent transaction, or 0 if no transactions
        const latestBalance = transactionsData.length > 0 ? transactionsData[0].balance : 0;
        setTotalSavings(latestBalance);
      }
    } catch (error) {
      console.error('Error fetching savings transactions:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
          <p className="text-gray-600 mb-4">Current Savings Balance</p>
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
        </div>
      </Card>
    );
  }

  // Full version for detailed display
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Recent Savings Transactions</h2>
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
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(transaction.date)}
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
                      {formatCurrency(transaction.balance)}
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