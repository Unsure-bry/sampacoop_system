'use client';

import { useState, useEffect } from 'react';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { Member } from '@/lib/types/member';
import { SavingsTransaction } from '@/lib/types/savings';
import { useParams, useRouter } from 'next/navigation';
import { AddSavingsModal } from '@/components/admin';
import {
  getSavingsBalanceForMember,
  addSavingsTransaction,
  getMemberIdByUserId
} from '@/lib/savingsService';

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
        
        // Use the savings service to get the current total balance
        const currentBalance = await getSavingsBalanceForMember(memberId);
        setTotalSavings(currentBalance);
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
      if (!member) {
        toast.error('Member not found');
        return false;
      }
      
      // For admin operations, we need to find the corresponding user ID for this member
      // We'll try to find the actual user ID that corresponds to this member using the service
      // The service has multiple fallback methods to link user IDs to member IDs
      
      // Use the member ID as a proxy for the user ID in the service
      // The service will handle the lookup using various methods
      const effectiveUserId = memberId;
      
      // Use the savings service to add the transaction
      const result = await addSavingsTransaction(effectiveUserId, {
        memberId: memberId,
        memberName: member ? `${member.firstName} ${member.lastName}` : 'Unknown',
        date: transactionData.date,
        type: transactionData.type,
        amount: parseFloat(transactionData.amount.toString()),
        balance: 0, // Will be calculated by the service
        remarks: transactionData.remarks
      });
      
      if (result.success) {
        toast.success(`Savings ${transactionData.type} recorded successfully!`);
        setShowAddModal(false);
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

  const getFullName = () => {
    if (!member) return 'Unknown Member';
    return `${member.firstName} ${member.middleName ? member.middleName + ' ' : ''}${member.lastName}${member.suffix ? ' ' + member.suffix : ''}`;
  };

  const handlePrint = () => {
    // Create a new window with printable content
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Member Savings Report - ${getFullName()}</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                margin: 20px;
                color: #333;
              }
              .header { 
                text-align: center; 
                margin-bottom: 30px; 
                border-bottom: 2px solid #333;
                padding-bottom: 20px;
              }
              .member-info {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-bottom: 30px;
              }
              .info-item {
                margin-bottom: 10px;
              }
              .info-label {
                font-weight: bold;
                color: #666;
              }
              table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-top: 20px;
              }
              th, td { 
                border: 1px solid #ddd; 
                padding: 12px; 
                text-align: left; 
              }
              th { 
                background-color: #f2f2f2; 
                font-weight: bold;
              }
              .balance-row {
                font-weight: bold;
                background-color: #f9f9f9;
              }
              .deposit { color: green; }
              .withdrawal { color: red; }
              .footer {
                margin-top: 30px;
                text-align: center;
                font-size: 12px;
                color: #666;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Member Savings Report</h1>
              <p>Generated on: ${new Date().toLocaleString()}</p>
            </div>
            
            <div class="member-info">
              <div>
                <div class="info-item">
                  <span class="info-label">Member Name:</span><br/>
                  ${getFullName()}
                </div>
                <div class="info-item">
                  <span class="info-label">Role:</span><br/>
                  ${member?.role || 'Member'}
                </div>
              </div>
              <div>
                <div class="info-item">
                  <span class="info-label">Current Balance:</span><br/>
                  <strong>₱${totalSavings.toFixed(2)}</strong>
                </div>
              </div>
            </div>
            
            <h2>Savings Transaction History</h2>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Transaction Type</th>
                  <th>Amount</th>
                  <th>Running Balance</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                ${transactions.map(transaction => `
                  <tr>
                    <td>${new Date(transaction.date).toLocaleDateString()}</td>
                    <td>${transaction.type === 'deposit' ? '<span style="color: green;">Deposit</span>' : '<span style="color: red;">Withdrawal</span>'}</td>
                    <td class="${transaction.type}">${transaction.type === 'deposit' ? '+' : '-'}₱${transaction.amount.toFixed(2)}</td>
                    <td>₱${transaction.balance.toFixed(2)}</td>
                    <td>${transaction.remarks || '-'}</td>
                  </tr>
                `).join('')}
                <tr class="balance-row">
                  <td colspan="3"><strong>CURRENT BALANCE</strong></td>
                  <td><strong>₱${totalSavings.toFixed(2)}</strong></td>
                  <td></td>
                </tr>
              </tbody>
            </table>
            
            <div class="footer">
              <p>This is an official savings report generated by SAMPA Cooperative System</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Member Savings Details</h1>
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
          <h1 className="text-2xl font-bold text-gray-800">Member Savings Details</h1>
          <p className="text-gray-600">View and manage savings for {member ? getFullName() : 'member'} ({member?.role || 'Member'})</p>
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
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-800">{getFullName()}</h2>
            <div className="mt-2 space-y-1">
              <p className="text-gray-600">Role: 
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ml-2">
                  {member?.role || 'Member'}
                </span>
              </p>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2 ${
                member?.archived ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'
              }`}>
                {member?.archived ? 'Archived' : (member?.status || 'Active')}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="text-right mb-4">
              <p className="text-sm text-gray-600">Current Savings Balance</p>
              <p className="text-3xl font-bold text-gray-800">₱{totalSavings.toFixed(2)}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
              >
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Report
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
              >
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Transaction
              </button>
            </div>
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