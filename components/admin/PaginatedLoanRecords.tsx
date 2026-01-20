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

  useEffect(() => {
    fetchLoanRecords();
  }, []);

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

  // Filter loans based on search term
  const filterLoans = (loansList: Loan[]) => {
    if (!searchTerm.trim()) return loansList;
    
    const term = searchTerm.toLowerCase().trim();
    return loansList.filter(loan => {
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
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 w-full text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                  Amount
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Term
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Interest
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Start Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
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