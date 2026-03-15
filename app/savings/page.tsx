'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { toast } from 'react-hot-toast';
import { SavingsTransaction } from '@/lib/types/savings';
import AddSavingsTransactionModal from '@/components/user/AddSavingsTransactionModal';
import {
  addSavingsTransaction,
  getMemberIdByUserId,
  getSavingsBalanceForMember
} from '@/lib/savingsService';
import { firestore } from '@/lib/firebase';
import DynamicDashboard from '@/components/user/DynamicDashboard';

interface FirestoreTimestampLike {
  toDate?: () => Date;
  seconds?: number;
}

type RawDate = any;

type RawDoc = {
  id: string;
} & Partial<SavingsTransaction> & {
  date?: RawDate;
  createdAt?: RawDate;
};

export default function UserSavingsPage() {
  const [transactions, setTransactions] = useState<SavingsTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSavings, setTotalSavings] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { user } = useAuth();

  const fetchSavingsTransactions = useCallback(async () => {
    try {
      setLoading(true);
      if (!user) return;

      let memberId = await getMemberIdByUserId(user.uid);

      let txResult = memberId
        ? await firestore.getCollection(`members/${memberId}/savings`)
        : await firestore.getCollection(`members/${user.uid}/savings`);

      if (!memberId && txResult.success && txResult.data && txResult.data.length > 0) {
        memberId = user.uid;
      }

      if (!memberId) {
        setTransactions([]);
        setTotalSavings(0);
        toast.error('Member record not found for this account');
        return;
      }

      if (!txResult.success) {
        txResult = await firestore.getCollection(`members/${memberId}/savings`);
      }

      let fetched: SavingsTransaction[] = [];
      if (txResult.success && txResult.data) {
        const data = txResult.data as unknown as RawDoc[];
        fetched = data.map((doc) => {
          const rawDate = doc.date ?? doc.createdAt;
          let dateString: string;
          if (typeof rawDate === 'string') {
            dateString = rawDate;
          } else if (rawDate instanceof Date) {
            dateString = rawDate.toISOString();
          } else if (typeof rawDate === 'number') {
            dateString = new Date(rawDate).toISOString();
          } else if (rawDate && typeof (rawDate as any).toDate === 'function') {
            dateString = (rawDate as any).toDate().toISOString();
          } else if (rawDate && typeof (rawDate as any).seconds === 'number') {
            dateString = new Date((rawDate as any).seconds * 1000).toISOString();
          } else {
            dateString = new Date().toISOString();
          }
          const { id, ...rest } = doc as SavingsTransaction & { id: string };
          return { id: doc.id, ...rest, date: dateString };
        });
      }

      const sortedTransactions = fetched.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setTransactions(sortedTransactions);

      const currentBalance = await getSavingsBalanceForMember(memberId);
      setTotalSavings(currentBalance);
    } catch (error) {
      console.error('Error fetching savings transactions:', error);
      toast.error('Failed to load savings transactions');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchSavingsTransactions();
    } else {
      setTransactions([]);
      setTotalSavings(0);
    }
  }, [user, fetchSavingsTransactions]);

  const handleAddSavings = async (transactionData: { type: 'deposit' | 'withdrawal', amount: number, date: string, remarks: string, depositControlNumber?: string }) => {
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
        remarks: transactionData.remarks,
        depositControlNumber: transactionData.depositControlNumber
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

  const totalDeposits = useMemo(() => {
    return transactions
      .filter(t => t.type === 'deposit')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [transactions]);

  const totalWithdrawals = useMemo(() => {
    return transactions
      .filter(t => t.type === 'withdrawal')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [transactions]);

  const lastUpdated = useMemo(() => {
    return transactions.length > 0 ? transactions[0].date : null;
  }, [transactions]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(transactions.length / pageSize));
  }, [transactions, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return transactions.slice(start, start + pageSize);
  }, [transactions, currentPage, pageSize]);

  if (!user) {
    return (
      <DynamicDashboard>
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
        </div>
      </DynamicDashboard>
    );
  }

  return (
    <DynamicDashboard>
      <div className="max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="mb-2 sm:mb-0">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Current Savings Balance</p>
                <p className="text-2xl sm:text-4xl font-bold text-green-600">{formatCurrency(totalSavings)}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="text-center bg-gray-50 rounded-lg p-2 sm:p-3">
                  <p className="text-xs text-gray-500 mb-1">Transactions</p>
                  <p className="text-base sm:text-lg font-semibold text-gray-800">{transactions.length}</p>
                </div>
                <div className="text-center bg-gray-50 rounded-lg p-2 sm:p-3">
                  <p className="text-xs text-gray-500 mb-1">Last Updated</p>
                  <p className="text-xs sm:text-sm font-medium text-gray-800">
                    {lastUpdated ? formatDate(lastUpdated) : '—'}
                  </p>
                </div>
                <div className="text-center bg-gray-50 rounded-lg p-2 sm:p-3">
                  <p className="text-xs text-gray-500 mb-1">Total Deposits</p>
                  <p className="text-base sm:text-lg font-semibold text-green-600">{formatCurrency(totalDeposits)}</p>
                </div>
                <div className="text-center bg-gray-50 rounded-lg p-2 sm:p-3">
                  <p className="text-xs text-gray-500 mb-1">Total Withdrawals</p>
                  <p className="text-base sm:text-lg font-semibold text-red-600">{formatCurrency(totalWithdrawals)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
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
                <div className="overflow-x-auto -mx-4 sm:-mx-6">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Date
                        </th>
                        <th scope="col" className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Type
                        </th>
                        <th scope="col" className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Amount
                        </th>
                        <th scope="col" className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden sm:table-cell">
                          Balance
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedTransactions.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-700">
                            {formatDate(transaction.date)}
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                            <span className={`inline-block px-2 py-1 text-xs font-bold rounded-full ${
                              transaction.type === 'deposit' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {transaction.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                            </span>
                          </td>
                          <td className={`px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-bold ${
                            transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.type === 'deposit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900 hidden sm:table-cell">
                            {formatCurrency(transaction.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-3">
                  <div className="text-xs sm:text-sm text-gray-600">
                    Page {currentPage} of {totalPages} • Showing {paginatedTransactions.length} of {transactions.length}
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button
                      className="px-2 sm:px-3 py-1 rounded border border-gray-300 text-gray-700 disabled:opacity-50 text-xs sm:text-sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      Prev
                    </button>
                    {totalPages <= 5 ? (
                      Array.from({ length: totalPages }).map((_, idx) => {
                        const page = idx + 1;
                        return (
                          <button
                            key={page}
                            className={`px-2 sm:px-3 py-1 rounded border text-xs sm:text-sm ${
                              currentPage === page
                                ? 'border-red-600 bg-red-600 text-white'
                                : 'border-gray-300 text-gray-700'
                            }`}
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </button>
                        );
                      })
                    ) : (
                      <>
                        <button
                          className={`px-2 sm:px-3 py-1 rounded border text-xs sm:text-sm ${currentPage === 1 ? 'border-red-600 bg-red-600 text-white' : 'border-gray-300 text-gray-700'}`}
                          onClick={() => setCurrentPage(1)}
                        >
                          1
                        </button>
                        {currentPage > 3 && <span className="px-1">...</span>}
                        {currentPage > 2 && currentPage < totalPages && (
                          <button
                            className="px-2 sm:px-3 py-1 rounded border border-red-600 bg-red-600 text-white text-xs sm:text-sm"
                          >
                            {currentPage}
                          </button>
                        )}
                        {currentPage < totalPages - 2 && <span className="px-1">...</span>}
                        <button
                          className={`px-2 sm:px-3 py-1 rounded border text-xs sm:text-sm ${currentPage === totalPages ? 'border-red-600 bg-red-600 text-white' : 'border-gray-300 text-gray-700'}`}
                          onClick={() => setCurrentPage(totalPages)}
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                    <button
                      className="px-2 sm:px-3 py-1 rounded border border-gray-300 text-gray-700 disabled:opacity-50 text-xs sm:text-sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </button>
                    <select
                      className="ml-1 sm:ml-2 px-2 py-1 border border-gray-300 rounded text-gray-700 text-xs sm:text-sm"
                      value={pageSize}
                      onChange={(e) => {
                        const size = parseInt(e.target.value, 10);
                        setPageSize(size);
                        setCurrentPage(1);
                      }}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <AddSavingsTransactionModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAddSavings={handleAddSavings}
          currentBalance={totalSavings}
        />
      </div>
    </DynamicDashboard>
  );
}
