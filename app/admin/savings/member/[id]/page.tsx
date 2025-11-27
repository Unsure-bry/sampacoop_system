'use client';

import { useState, useEffect } from 'react';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { Member } from '@/lib/types/member';
import { SavingsTransaction } from '@/lib/types/savings';
import { useParams, useRouter } from 'next/navigation';
import { AddSavingsModal } from '@/components/admin';

export default function MemberSavingsPage() {
  const [member, setMember] = useState<Member | null>(null);
  const [transactions, setTransactions] = useState<SavingsTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [totalSavings, setTotalSavings] = useState(0);
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;

  useEffect(() => {
    if (memberId) {
      fetchMemberData();
      fetchSavingsTransactions();
    }
  }, [memberId]);

  const fetchMemberData = async () => {
    try {
      const result = await firestore.getDocument('members', memberId);
      
      if (result.success && result.data) {
        setMember({
          id: memberId,
          ...result.data
        } as Member);
      } else {
        toast.error('Member not found');
        router.push('/admin/savings');
      }
    } catch (error) {
      console.error('Error fetching member:', error);
      toast.error('Failed to load member data');
      router.push('/admin/savings');
    }
  };

  const fetchSavingsTransactions = async () => {
    try {
      setLoading(true);
      // Fetch savings transactions from /members/{memberId}/savings collection
      const result = await firestore.getCollection(`members/${memberId}/savings`);
      
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
      toast.error('Failed to load savings transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSavings = async (transactionData: { type: 'deposit' | 'withdrawal', amount: number, date: string, remarks: string }) => {
    try {
      // Calculate new balance
      const amount = parseFloat(transactionData.amount.toString());
      const newBalance = transactionData.type === 'deposit' 
        ? totalSavings + amount 
        : totalSavings - amount;
      
      // Validate withdrawal doesn't exceed balance
      if (transactionData.type === 'withdrawal' && amount > totalSavings) {
        toast.error('Withdrawal amount cannot exceed current balance');
        return false;
      }
      
      // Create transaction object
      const newTransaction = {
        memberId: memberId,
        memberName: member ? `${member.firstName} ${member.lastName}` : 'Unknown',
        date: transactionData.date,
        type: transactionData.type,
        amount: amount,
        balance: newBalance,
        remarks: transactionData.remarks,
        createdAt: new Date().toISOString()
      };
      
      // Generate a unique ID for the transaction
      const transactionId = `${transactionData.type}-${Date.now()}`;
      
      // Save to Firestore under /members/{memberId}/savings collection
      const result = await firestore.setDocument(`members/${memberId}/savings`, transactionId, newTransaction);
      
      if (result.success) {
        toast.success(`Savings ${transactionData.type} recorded successfully!`);
        setShowAddModal(false);
        // Refresh transactions
        fetchSavingsTransactions();
        return true;
      } else {
        toast.error('Failed to record savings transaction');
        return false;
      }
    } catch (error) {
      console.error('Error adding savings transaction:', error);
      toast.error('Failed to record savings transaction');
      return false;
    }
  };

  const getFullName = () => {
    if (!member) return 'Unknown Member';
    return `${member.firstName} ${member.middleName ? member.middleName + ' ' : ''}${member.lastName}${member.suffix ? ' ' + member.suffix : ''}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Member Savings</h1>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Member Savings</h1>
          <p className="text-gray-600">View and manage savings for {member ? getFullName() : 'member'}</p>
        </div>
        <button
          onClick={() => router.push('/admin/savings')}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center"
        >
          <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Savings
        </button>
      </div>
      
      {/* Member Summary Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">{getFullName()}</h2>
            <p className="text-gray-600">Member ID: {memberId}</p>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2 ${
              member?.archived ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'
            }`}>
              {member?.archived ? 'Archived' : (member?.status || 'Active')}
            </span>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Current Savings Balance</p>
            <p className="text-3xl font-bold text-gray-800">₱{totalSavings.toFixed(2)}</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
            >
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Savings Transaction
            </button>
          </div>
        </div>
      </div>
      
      {/* Savings History */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Savings History</h3>
        </div>
        
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No savings transactions found for this member.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Add First Transaction
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Running Balance
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(transaction.date).toLocaleDateString()}
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.type === 'deposit' ? '+' : '-'}₱{transaction.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₱{transaction.balance.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {transaction.remarks || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Add Savings Modal */}
      <AddSavingsModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddSavings={handleAddSavings}
        currentBalance={totalSavings}
      />
    </div>
  );
}