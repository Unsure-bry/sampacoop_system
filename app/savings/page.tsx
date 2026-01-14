'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { toast } from 'react-hot-toast';
import { SavingsTransaction } from '@/lib/types/savings';
import AddSavingsTransactionModal from '@/components/user/AddSavingsTransactionModal';
import {
  getUserSavingsTransactions,
  addSavingsTransaction,
  getUserSavingsBalance
} from '@/lib/savingsService';

export default function UserSavingsPage() {
  const [transactions, setTransactions] = useState<SavingsTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSavings, setTotalSavings] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchSavingsTransactions();
    } else {
      setTransactions([]);
      setTotalSavings(0);
    }
  }, [user]);

  const fetchSavingsTransactions = async () => {
    try {
      setLoading(true);
      if (!user) return;
      
      // Fetch savings transactions using the new service
      const userTransactions = await getUserSavingsTransactions(user.uid);
      
      // Sort by date descending for display (newest first)
      const sortedTransactions = userTransactions.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      setTransactions(sortedTransactions);
      
      // Get the current balance
      const currentBalance = await getUserSavingsBalance(user.uid);
      setTotalSavings(currentBalance);
    } catch (error) {
      console.error('Error fetching savings transactions:', error);
      toast.error('Failed to load savings transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSavings = async (transactionData: { type: 'deposit' | 'withdrawal', amount: number, date: string, remarks: string }) => {
    try {
      if (!user) {
        toast.error('User not authenticated');
        return false;
      }

      // Get the member ID that corresponds to this user
      const { getMemberIdByUserId } = await import('@/lib/savingsService');
      const memberId = await getMemberIdByUserId(user.uid);
      
      if (!memberId) {
        toast.error('No member found for this user');
        return false;
      }
      
      // Get member name for the transaction
      const { getMemberInfoByUserId } = await import('@/lib/savingsService');
      const memberInfo = await getMemberInfoByUserId(user.uid);
      const memberName = memberInfo 
        ? `${memberInfo.firstName || ''} ${memberInfo.lastName || ''}`.trim()
        : user.displayName || user.email || 'Unknown Member';
      
      // Add savings transaction using the new service
      const result = await addSavingsTransaction(user.uid, {
        memberId: memberId,
        memberName: memberName,
        date: transactionData.date,
        type: transactionData.type,
        amount: parseFloat(transactionData.amount.toString()),
        balance: 0, // Will be calculated by the service
        remarks: transactionData.remarks
      });
      
      if (result.success) {
        toast.success(`Savings ${transactionData.type} recorded successfully!`);
        // Refresh transactions
        fetchSavingsTransactions();
        return true;
      } else {
        toast.error(result.error || 'Failed to record savings transaction');
        return false;
      }
    } catch (error) {
      console.error('Error adding savings transaction:', error);
      toast.error('Failed to record savings transaction');
      return false;
    }
  };

  // Removed handleTransactionComplete function since it's no longer needed

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
      month: 'long',
      day: 'numeric'
    });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">My Savings</h1>
        <p className="text-gray-600 mt-2">View your savings history and balance</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Summary Card */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-medium text-gray-600">Current Savings Balance</h2>
              <p className="text-3xl font-bold text-green-600 mt-2">{formatCurrency(totalSavings)}</p>
            </div>
            <div className="mt-4 md:mt-0">
              <p className="text-sm text-gray-500">
                {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Savings History - Full Width */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Savings History</h2>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
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
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(transaction.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            transaction.type === 'deposit' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {transaction.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                          </span>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                          transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'deposit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
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
      </div>

      {/* Add Savings Transaction Modal */}
      <AddSavingsTransactionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddSavings={handleAddSavings}
        currentBalance={totalSavings}
      />
    </div>
  );
}