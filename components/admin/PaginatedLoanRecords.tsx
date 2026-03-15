'use client';

import { useState, useEffect } from 'react';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import LoanDetailsModal from './LoanDetailsModal';
import Pagination from './Pagination';

interface Loan {
  id: string;
  userId: string;
  fullName: string;
  role: string;
  amount: number;
  term: number;
  startDate: string;
  interest: number;
  status: string;
}

interface User {
  id: string;
  displayName: string;
  role: string;
  email: string;
  [key: string]: any;
}

export default function PaginatedLoanRecords() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  
  // Column filter states
  const [amountFilter, setAmountFilter] = useState<string>('all');
  const [termFilter, setTermFilter] = useState<string>('all');
  const [interestFilter, setInterestFilter] = useState<string>('all');
  const [startDateFilter, setStartDateFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchLoanRecords();
  }, []);
  
  // Effect to handle column filtering
  useEffect(() => {
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [amountFilter, termFilter, interestFilter, startDateFilter, statusFilter]);

  const fetchLoanRecords = async () => {
    try {
      setLoading(true);
      
      // Fetch all loans
      const result = await firestore.getCollection('loans');

      if (result.success && result.data) {
        const loansData = result.data.map((doc: any) => ({
          id: doc.id,
          ...doc
        }));
        
        // Sort loans by startDate in descending order (most recent first)
        loansData.sort((a: any, b: any) => {
          const dateA = new Date(a.startDate || 0);
          const dateB = new Date(b.startDate || 0);
          return dateB.getTime() - dateA.getTime();
        });
        
        setLoans(loansData);
        
        // Fetch user data for each loan
        fetchUsersForLoans(loansData);
      }
    } catch (error) {
      console.error('Error fetching loan records:', error);
      toast.error('Failed to load loan records');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersForLoans = async (loans: Loan[]) => {
    try {
      const userIds = [...new Set(loans.map(loan => loan.userId))];
      const usersData: Record<string, User> = {};
      
      // Fetch each user individually
      for (const userId of userIds) {
        const userResult = await firestore.getDocument('users', userId);
        if (userResult.success && userResult.data) {
          usersData[userId] = {
            id: userId,
            ...userResult.data as any
          };
        }
      }
      
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
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
      month: 'long',
      day: 'numeric'
    });
  };

  const getFullName = (loan: Loan, user: User | undefined) => {
    
    // Prioritize embedded user data in loan record
    if (loan.fullName && loan.fullName !== 'Unknown Member' && loan.fullName !== 'User Not Found') {
      return loan.fullName;
    }
    
    // Fallback to fetched user data
    if (!user) return '';
    
    // Use displayName from user data
    return user.displayName || 'User Unknown';
  };

  const getUserRole = (loan: Loan, user: User | undefined) => {
    // Prioritize embedded user data in loan record
    if (loan.role && loan.role !== 'N/A') {
      return loan.role;
    }
    
    // Fallback to fetched user data
    if (!user) return 'N/A';
    return user.role || 'N/A';
  };

  const handleViewLoanDetails = (loan: Loan) => {
    setSelectedLoan(loan);
    setIsModalOpen(true);
  };

  // Filter loans based on search term and column filters
  const filterLoans = (loansList: Loan[]) => {
    let filtered = [...loansList];
      
    // Apply search term filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(loan => {
        const fullName = getFullName(loan, users[loan.userId]);
        const user = users[loan.userId];
        const email = user?.email || '';
          
        return (
          fullName.toLowerCase().includes(term) ||
          email.toLowerCase().includes(term) ||
          loan.id.toLowerCase().includes(term) ||
          (loan.role && loan.role.toLowerCase().includes(term)) ||
          loan.status.toLowerCase().includes(term)
        );
      });
    }
      
    // Apply amount filter
    if (amountFilter !== 'all') {
      filtered = filtered.filter(loan => {
        if (amountFilter === 'low') return loan.amount < 10000;
        if (amountFilter === 'medium') return loan.amount >= 10000 && loan.amount < 50000;
        if (amountFilter === 'high') return loan.amount >= 50000;
        return true;
      });
    }
      
    // Apply term filter
    if (termFilter !== 'all') {
      filtered = filtered.filter(loan => {
        if (termFilter === 'short') return loan.term <= 6;
        if (termFilter === 'medium') return loan.term > 6 && loan.term <= 12;
        if (termFilter === 'long') return loan.term > 12;
        return true;
      });
    }
      
    // Apply interest filter
    if (interestFilter !== 'all') {
      filtered = filtered.filter(loan => {
        if (interestFilter === 'low') return loan.interest < 5;
        if (interestFilter === 'medium') return loan.interest >= 5 && loan.interest < 10;
        if (interestFilter === 'high') return loan.interest >= 10;
        return true;
      });
    }
      
    // Apply start date filter
    if (startDateFilter !== 'all') {
      filtered = filtered.filter(loan => {
        const loanDate = new Date(loan.startDate);
        const today = new Date();
        
        // Reset hours to compare dates only
        const loanDateOnly = new Date(loanDate.getFullYear(), loanDate.getMonth(), loanDate.getDate());
        const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        if (startDateFilter === 'today') {
          return loanDateOnly.getTime() === todayOnly.getTime();
        }
        
        const diffTime = Math.abs(today.getTime() - loanDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
        if (startDateFilter === 'last-week') return diffDays <= 7;
        if (startDateFilter === 'last-month') return diffDays <= 30;
        if (startDateFilter === 'last-year') return diffDays <= 365;
        return true;
      });
    }
      
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(loan => {
        return loan.status.toLowerCase() === statusFilter.toLowerCase();
      });
    }
      
    return filtered;
  };

  // Get current page data
  const filteredLoans = filterLoans(loans);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageLoans = filteredLoans.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredLoans.length / itemsPerPage);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Loan Records</h1>
          <p className="text-gray-600">View all loan records</p>
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
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Loan Records</h1>
            <p className="text-gray-600">View all loan records</p>
          </div>
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search by name, email, ID, or status..."
              className="pl-10 pr-4 py-2 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 w-full text-sm text-gray-900 placeholder-gray-500 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex flex-col gap-2">
                    <span>Amount</span>
                    <select
                      value={amountFilter}
                      onChange={(e) => setAmountFilter(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="all">All Amounts</option>
                      <option value="low">Low (&lt; ₱10,000)</option>
                      <option value="medium">Medium (₱10,000 - ₱49,999)</option>
                      <option value="high">High (&#8805; &#8369;50,000)</option>
                    </select>
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex flex-col gap-2">
                    <span>Term</span>
                    <select
                      value={termFilter}
                      onChange={(e) => setTermFilter(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="all">All Terms</option>
                      <option value="short">Short (≤ 6 months)</option>
                      <option value="medium">Medium (7-12 months)</option>
                      <option value="long">Long (&gt; 12 months)</option>
                    </select>
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex flex-col gap-2">
                    <span>Interest</span>
                    <select
                      value={interestFilter}
                      onChange={(e) => setInterestFilter(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="all">All Rates</option>
                      <option value="low">Low (&lt; 5%)</option>
                      <option value="medium">Medium (5% - 9.99%)</option>
                      <option value="high">High (≥ 10%)</option>
                    </select>
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex flex-col gap-2">
                    <span>Start Date</span>
                    <select
                      value={startDateFilter}
                      onChange={(e) => setStartDateFilter(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="all">All Dates</option>
                      <option value="today">Today</option>
                      <option value="last-week">Last Week</option>
                      <option value="last-month">Last Month</option>
                      <option value="last-year">Last Year</option>
                    </select>
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex flex-col gap-2">
                    <span>Status</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentPageLoans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No loan records found
                  </td>
                </tr>
              ) : (
                currentPageLoans.map((loan) => {
                  const user = users[loan.userId];
                  const fullName = getFullName(loan, user);
                  const role = getUserRole(loan, user);
                  
                  return (
                    <tr 
                      key={loan.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleViewLoanDetails(loan)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {fullName} — {role}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(loan.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {loan.term} month{loan.term !== 1 ? 's' : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {loan.interest}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(loan.startDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          loan.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : loan.status === 'completed' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-gray-100 text-gray-800'
                        }`}>
                          {loan.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {loans.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <Pagination 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={setCurrentPage} 
            />
          </div>
        )}
      </div>
      
      <LoanDetailsModal 
        loan={selectedLoan}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}