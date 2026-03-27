'use client';

import { useState, useEffect } from 'react';
import { firestore, db } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { usePermissions } from '@/lib/rolePermissions';
import { formatCurrency } from '@/lib/settingsService';
import { X, Plus, Calendar, Receipt, User, DollarSign } from 'lucide-react';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface CapitalShareData {
  memberId: string;
  memberName: string;
  role: string;
  capitalShare: number;
  requiredCapitalShare: number;
  remainingBalance: number;
  status: 'Paid' | 'Pending' | 'Partial';
  paymentDate?: string;
}

interface CapitalShareTransaction {
  id: string;
  amount: number;
  date: string;
  receiptNumber: string;
  type: 'payment';
  recordedBy: string;
}

export default function CapitalSharesPage() {
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [capitalSharesData, setCapitalSharesData] = useState<CapitalShareData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Summary statistics
  const [totalCapitalShares, setTotalCapitalShares] = useState(0);
  const [paidCapitalShares, setPaidCapitalShares] = useState(0);
  const [pendingCapitalShares, setPendingCapitalShares] = useState(0);
  const [pendingMembersCount, setPendingMembersCount] = useState(0);
  
  // Modal states
  const [selectedMember, setSelectedMember] = useState<CapitalShareData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [transactions, setTransactions] = useState<CapitalShareTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  
  // Payment form states
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCapitalSharesData();
  }, []);

  const fetchCapitalSharesData = async () => {
    try {
      setLoading(true);
      
      // Fetch all members
      const membersResult = await firestore.getCollection('members');
      
      if (!membersResult.success || !membersResult.data) {
        toast.error('Failed to load capital shares data');
        return;
      }

      const capitalSharesList: CapitalShareData[] = [];
      let total = 0;
      let paid = 0;
      let pending = 0;
      let pendingCount = 0;
      
      // Fixed required capital share amount
      const REQUIRED_CAPITAL_SHARE = 10000;

      for (const member of membersResult.data) {
        // Cast to any to access dynamic Firestore data
        const memberData = member as any;
        
        // Get payment info which contains capital share
        const paymentInfo = memberData.paymentInfo || {};
        const capitalShare = paymentInfo.capitalShare || 0;
        
        // Skip members with no capital share
        if (capitalShare <= 0) continue;
        
        const fullName = `${memberData.firstName || ''} ${memberData.middleName ? memberData.middleName + ' ' : ''}${memberData.lastName || ''}${memberData.suffix ? ' ' + memberData.suffix : ''}`.trim();
        
        // Calculate remaining balance based on fixed required amount
        const remainingBalance = Math.max(0, REQUIRED_CAPITAL_SHARE - capitalShare);
        
        // Determine status based on capital share vs required amount
        let status: 'Paid' | 'Pending' | 'Partial';
        if (capitalShare >= REQUIRED_CAPITAL_SHARE) {
          status = 'Paid';
        } else if (capitalShare > 0 && capitalShare < REQUIRED_CAPITAL_SHARE) {
          status = 'Partial';
        } else {
          status = 'Pending';
        }
        
        const data: CapitalShareData = {
          memberId: member.id,
          memberName: fullName || 'Unknown',
          role: memberData.role || 'Member',
          capitalShare: capitalShare,
          requiredCapitalShare: REQUIRED_CAPITAL_SHARE,
          remainingBalance: remainingBalance,
          status: status,
          paymentDate: memberData.createdAt
        };
        
        capitalSharesList.push(data);
        
        // Calculate totals
        total += capitalShare;
        if (status === 'Paid') {
          paid += capitalShare;
        } else {
          // For pending/partial, add the remaining balance to pending total
          pending += remainingBalance;
          pendingCount++;
        }
      }

      setCapitalSharesData(capitalSharesList);
      setTotalCapitalShares(total);
      setPaidCapitalShares(paid);
      setPendingCapitalShares(pending);
      setPendingMembersCount(pendingCount);
    } catch (error) {
      console.error('Error fetching capital shares:', error);
      toast.error('Failed to load capital shares data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch transactions for a member
  const fetchMemberTransactions = async (memberId: string) => {
    try {
      setTransactionsLoading(true);
      const result = await firestore.getCollection(`members/${memberId}/capitalShareTransactions`);
      
      if (result.success && result.data) {
        const txs = result.data.map((doc: any) => ({
          id: doc.id,
          amount: doc.amount || 0,
          date: doc.date || doc.createdAt,
          receiptNumber: doc.receiptNumber || '-',
          type: doc.type || 'payment',
          recordedBy: doc.recordedBy || 'Admin'
        })) as CapitalShareTransaction[];
        
        // Sort by date descending
        txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(txs);
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  };

  // Handle member click
  const handleMemberClick = (member: CapitalShareData) => {
    setSelectedMember(member);
    setShowModal(true);
    fetchMemberTransactions(member.memberId);
    // Reset payment form
    setShowPaymentForm(false);
    setPaymentAmount('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setReceiptNumber('');
  };

  // Close modal
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedMember(null);
    setTransactions([]);
    setShowPaymentForm(false);
  };

  // Format currency input with commas
  const formatCurrencyInput = (value: string): string => {
    // Remove non-numeric characters except decimal point
    let numericValue = value.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const parts = numericValue.split('.');
    if (parts.length > 2) {
      numericValue = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      numericValue = parts[0] + '.' + parts[1].substring(0, 2);
    }
    
    return numericValue;
  };

  // Handle payment amount change
  const handlePaymentAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrencyInput(e.target.value);
    setPaymentAmount(formatted);
  };

  // Submit payment
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMember) return;
    
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    if (!receiptNumber.trim()) {
      toast.error('Please enter a receipt number');
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Add transaction record
      const transactionData = {
        amount: amount,
        date: paymentDate,
        receiptNumber: receiptNumber.trim(),
        type: 'payment',
        recordedBy: 'Admin', // TODO: Get from auth context
        createdAt: new Date().toISOString()
      };
      
      // Generate a unique document ID
      const transactionRef = doc(collection(db!, `members/${selectedMember.memberId}/capitalShareTransactions`));
      await setDoc(transactionRef, transactionData);
      
      if (true) {
        // Update member's capital share in paymentInfo
        const memberResult = await firestore.getDocument('members', selectedMember.memberId);
        if (memberResult.success && memberResult.data) {
          const memberData = memberResult.data as any;
          const currentCapitalShare = memberData.paymentInfo?.capitalShare || 0;
          const newCapitalShare = currentCapitalShare + amount;
          
          await firestore.updateDocument('members', selectedMember.memberId, {
            'paymentInfo.capitalShare': newCapitalShare
          });
        }
        
        toast.success('Payment recorded successfully!');
        
        // Refresh data
        fetchMemberTransactions(selectedMember.memberId);
        fetchCapitalSharesData();
        
        // Reset form
        setShowPaymentForm(false);
        setPaymentAmount('');
        setReceiptNumber('');
        
        // Update selected member data
        const updatedMember = { ...selectedMember };
        updatedMember.capitalShare += amount;
        updatedMember.remainingBalance = Math.max(0, updatedMember.requiredCapitalShare - updatedMember.capitalShare);
        if (updatedMember.remainingBalance === 0) {
          updatedMember.status = 'Paid';
        } else if (updatedMember.capitalShare > 0) {
          updatedMember.status = 'Partial';
        }
        setSelectedMember(updatedMember);
      } else {
        toast.error('Failed to record payment');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter data based on search and status filter
  const filteredData = capitalSharesData.filter(item => {
    const matchesSearch = item.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.memberId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Show access denied if user doesn't have viewMembers permission
  if (!hasPermission('viewMembers')) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Capital Shares</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <h2 className="text-lg font-semibold text-red-800">Access Denied</h2>
              <p className="text-red-600">You do not have permission to view capital shares records.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Capital Shares</h1>
          <p className="text-gray-600">Manage and track member capital shares</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Capital Shares Card */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Capital Shares</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{formatCurrency(totalCapitalShares)}</p>
              <p className="text-sm text-gray-500 mt-1">{filteredData.length} members</p>
            </div>
            <div className="bg-blue-100 rounded-full p-4">
              <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Paid Capital Shares Card */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Paid Capital Shares</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{formatCurrency(paidCapitalShares)}</p>
              <p className="text-sm text-gray-500 mt-1">{filteredData.filter(d => d.status === 'Paid').length} paid</p>
            </div>
            <div className="bg-green-100 rounded-full p-4">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Pending Capital Shares Card */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Pending Capital Shares</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{formatCurrency(pendingCapitalShares)}</p>
              <p className="text-sm text-gray-500 mt-1">{pendingMembersCount} members with remaining balance</p>
            </div>
            <div className="bg-orange-100 rounded-full p-4">
              <svg className="h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by member name or ID..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Partial">Partial</option>
          </select>
        </div>
      </div>

      {/* Capital Shares Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paid Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Required Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remaining Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center">
                    <p className="text-gray-500">
                      {searchTerm || statusFilter ? 'No capital shares found matching your filters.' : 'No capital shares records found.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr 
                    key={item.memberId} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleMemberClick(item)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.memberName}</div>
                      <div className="text-xs text-gray-500">ID: {item.memberId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {item.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(item.capitalShare)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {formatCurrency(item.requiredCapitalShare)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-semibold ${
                        item.remainingBalance > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {formatCurrency(item.remainingBalance)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.status === 'Paid' 
                          ? 'bg-green-100 text-green-800' 
                          : item.status === 'Partial'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.paymentDate ? new Date(item.paymentDate).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Results count */}
        {filteredData.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{filteredData.length}</span> capital share records
            </p>
          </div>
        )}
      </div>

      {/* Member Capital Share Modal */}
      {showModal && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 rounded-full p-2">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{selectedMember.memberName}</h3>
                  <p className="text-sm text-gray-500">Capital Share Details</p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Member Summary Cards */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-xs text-blue-600 mb-1">Required</p>
                  <p className="text-lg font-bold text-blue-800">{formatCurrency(selectedMember.requiredCapitalShare)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-xs text-green-600 mb-1">Paid</p>
                  <p className="text-lg font-bold text-green-800">{formatCurrency(selectedMember.capitalShare)}</p>
                </div>
                <div className={`rounded-lg p-4 text-center ${selectedMember.remainingBalance > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                  <p className={`text-xs mb-1 ${selectedMember.remainingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>Remaining</p>
                  <p className={`text-lg font-bold ${selectedMember.remainingBalance > 0 ? 'text-red-800' : 'text-green-800'}`}>
                    {formatCurrency(selectedMember.remainingBalance)}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center justify-center mb-6">
                <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                  selectedMember.status === 'Paid' 
                    ? 'bg-green-100 text-green-800' 
                    : selectedMember.status === 'Partial'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-orange-100 text-orange-800'
                }`}>
                  Status: {selectedMember.status}
                </span>
              </div>

              {/* Add Payment Button */}
              <div className="mb-6">
                {selectedMember.remainingBalance > 0 ? (
                  !showPaymentForm ? (
                    <button
                      onClick={() => setShowPaymentForm(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                      <Plus className="h-5 w-5" />
                      Add Payment
                    </button>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-800 mb-4">Record New Payment</h4>
                      <form onSubmit={handleSubmitPayment} className="space-y-4">
                        {/* Amount Input with Peso Sign */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Payment Amount <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-gray-500 font-medium">₱</span>
                            </div>
                            <input
                              type="text"
                              value={paymentAmount}
                              onChange={handlePaymentAmountChange}
                              placeholder="0.00"
                              className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                              required
                            />
                          </div>
                          {paymentAmount && (
                            <p className="text-xs text-gray-500 mt-1">
                              {formatCurrency(parseFloat(paymentAmount) || 0)}
                            </p>
                          )}
                        </div>

                        {/* Receipt Number Input */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Receipt Number <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Receipt className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                              type="text"
                              value={receiptNumber}
                              onChange={(e) => setReceiptNumber(e.target.value)}
                              placeholder="Enter receipt number"
                              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                              required
                            />
                          </div>
                        </div>

                        {/* Date Input */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Payment Date <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Calendar className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                              type="date"
                              value={paymentDate}
                              onChange={(e) => setPaymentDate(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                              required
                            />
                          </div>
                        </div>

                        {/* Form Actions */}
                        <div className="flex gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowPaymentForm(false);
                              setPaymentAmount('');
                              setReceiptNumber('');
                            }}
                            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {submitting ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                                Saving...
                              </>
                            ) : (
                              <>
                                <DollarSign className="h-4 w-4" />
                                Save Payment
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  )
                ) : (
                  <button
                    disabled
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed font-medium"
                  >
                    <Plus className="h-5 w-5" />
                    Fully Paid - No Payment Needed
                  </button>
                )}
              </div>

              {/* Transactions List */}
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-3">Payment History</h4>
                {transactionsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No payment records found</p>
                  </div>
                ) : (
                  <div className="overflow-hidden border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Receipt #</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {transactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {new Date(tx.date).toLocaleDateString('en-PH')}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {tx.receiptNumber}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-green-600 text-right">
                              {formatCurrency(tx.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={handleCloseModal}
                className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
