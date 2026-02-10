'use client';

import { useEffect, useState } from 'react';
import { firestore } from '@/lib/firebase';
import { ChevronLeft, ChevronRight, Search, Wallet, Eye, X } from 'lucide-react';

interface SavingsTransaction {
  id: string;
  userId?: string;
  memberName?: string;
  amount?: number;
  type?: 'deposit' | 'withdrawal';
  status?: string;
  depositControlNumber?: string;
  createdAt?: string;
  date?: string;
}

interface MemberSavings {
  memberId?: string;
  memberName?: string;
  email?: string;
  totalSavings?: number;
  lastTransaction?: string;
}

export default function SavingsRecords() {
  const [savings, setSavings] = useState<MemberSavings[]>([]);
  const [filteredSavings, setFilteredSavings] = useState<MemberSavings[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<MemberSavings | null>(null);
  const [showModal, setShowModal] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchSavingsData();
  }, []);

  useEffect(() => {
    // Filter savings based on search term
    const filtered = savings.filter(saving => {
      const memberName = (saving.memberName || '').toLowerCase();
      const email = (saving.email || '').toLowerCase();
      const search = searchTerm.toLowerCase();
      return memberName.includes(search) || email.includes(search);
    });

    setFilteredSavings(filtered);
    setCurrentPage(1);
  }, [searchTerm, savings]);

  const fetchSavingsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch members to get savings credit info
      const membersResult = await firestore.getCollection('members');
      if (!membersResult.success) {
        throw new Error(`Failed to fetch members: ${membersResult.error || 'Unknown error'}`);
      }

      const members = membersResult.data || [];

      // Fetch savings transactions
      const savingsResult = await firestore.getCollection('savings');
      if (!savingsResult.success) {
        throw new Error(`Failed to fetch savings: ${savingsResult.error || 'Unknown error'}`);
      }

      const transactions = savingsResult.data || [];

      // Aggregate savings by member
      const memberSavingsMap = new Map<string, MemberSavings>();

      members.forEach((member: any) => {
        const memberId = member.id || member.userId;
        if (memberId) {
          memberSavingsMap.set(memberId, {
            memberId: memberId,
            memberName: `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Unknown Member',
            email: member.email || 'N/A',
            totalSavings: 0,
            lastTransaction: ''
          });
        }
      });

      // Calculate total savings from transactions
      transactions.forEach((transaction: SavingsTransaction) => {
        const userId = transaction.userId;
        if (userId && memberSavingsMap.has(userId)) {
          const memberData = memberSavingsMap.get(userId)!;
          const amount = transaction.amount || 0;
          
          if (transaction.type === 'deposit') {
            memberData.totalSavings = (memberData.totalSavings || 0) + amount;
          } else if (transaction.type === 'withdrawal') {
            memberData.totalSavings = (memberData.totalSavings || 0) - amount;
          }

          // Update last transaction date
          const transactionDate = transaction.createdAt || transaction.date;
          if (transactionDate && (!memberData.lastTransaction || new Date(transactionDate) > new Date(memberData.lastTransaction))) {
            memberData.lastTransaction = transactionDate;
          }
        }
      });

      const savingsData = Array.from(memberSavingsMap.values());
      // Sort by total savings descending
      savingsData.sort((a, b) => (b.totalSavings || 0) - (a.totalSavings || 0));

      setSavings(savingsData);
      setFilteredSavings(savingsData);
    } catch (err) {
      console.error('Error fetching savings data:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredSavings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSavings = filteredSavings.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleViewDetails = (member: MemberSavings) => {
    setSelectedMember(member);
    setShowModal(true);
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return 'N/A';
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded w-full"></div>
          {[...Array(5)].map((_, idx) => (
            <div key={idx} className="h-12 bg-gray-200 rounded w-full"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Savings</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchSavingsData}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-xl font-semibold text-gray-800">Savings Records</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Savings</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Transaction</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentSavings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    {searchTerm ? 'No members found matching your search.' : 'No savings records found.'}
                  </td>
                </tr>
              ) : (
                currentSavings.map((saving) => (
                  <tr key={saving.memberId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <Wallet className="h-4 w-4 text-gray-500" />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {saving.memberName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {saving.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {formatCurrency(saving.totalSavings)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(saving.lastTransaction)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewDetails(saving)}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredSavings.length)} of {filteredSavings.length} members
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Member Details Modal */}
      {showModal && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Member Savings Details</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{selectedMember.memberName}</h4>
                  <p className="text-sm text-gray-500">{selectedMember.email}</p>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600 mb-1">Total Savings</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(selectedMember.totalSavings)}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Last Transaction</p>
                <p className="font-medium text-gray-900">{formatDate(selectedMember.lastTransaction)}</p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setShowModal(false)}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
