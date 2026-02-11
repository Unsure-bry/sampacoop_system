'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';

interface Loan {
  id: string;
  userId: string;
  amount: number;
  term: number;
  startDate: string;
  interest: number;
  status: string;
  planName?: string;
  paymentSchedule?: PaymentScheduleItem[];
}

interface PaymentScheduleItem {
  day: number;
  paymentDate: string;
  principal: number;
  interest: number;
  totalPayment: number;
  remainingBalance: number;
  status?: 'pending' | 'paid' | 'partial';
}

interface ActiveLoansProps {
  onLoanStatusChange?: () => void;
}

export default function ActiveLoans({ onLoanStatusChange }: ActiveLoansProps) {
  const { user } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Selected loan for amortization view
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [schedulePage, setSchedulePage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    if (user) {
      fetchActiveLoans();
    }
  }, [user]);

  const fetchActiveLoans = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Validate that user has a UID
      if (!user?.uid) {
        throw new Error('User not properly authenticated');
      }
      
      // Check if Firestore is initialized
      if (!firestore) {
        throw new Error('Firestore not initialized');
      }
      
      const result = await firestore.queryDocuments('loans', [
        { field: 'userId', operator: '==', value: user?.uid },
        { field: 'status', operator: '==', value: 'active' }
      ]);

      if (result.success && result.data) {
        const loansData = result.data.map((doc: any) => ({
          id: doc.id,
          ...doc
        }));
        setLoans(loansData);
        // Notify parent component about loan status change
        if (onLoanStatusChange) {
          onLoanStatusChange();
        }
      } else {
        // Handle case where query was successful but no data was found
        setLoans([]);
        if (result.error) {
          console.error('Query returned error:', result.error);
          setError('No active loans found');
        }
        // Notify parent component about loan status change (no active loans)
        if (onLoanStatusChange) {
          onLoanStatusChange();
        }
      }
    } catch (error: any) {
      console.error('Error fetching active loans:', error);
      setError(error.message || 'Failed to load active loans');
      toast.error('Failed to load active loans. Please try again later.');
      // Notify parent component about loan status change (error state)
      if (onLoanStatusChange) {
        onLoanStatusChange();
      }
    } finally {
      setLoading(false);
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

  const handleLoanClick = (loan: Loan) => {
    setSelectedLoan(loan);
    setSchedulePage(1); // Reset schedule pagination
  };

  const getStatusBadgeClass = (status?: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate pagination for loans table
  const totalLoanPages = Math.ceil(loans.length / itemsPerPage);
  const indexOfLastLoan = currentPage * itemsPerPage;
  const indexOfFirstLoan = indexOfLastLoan - itemsPerPage;
  const currentLoans = loans.slice(indexOfFirstLoan, indexOfLastLoan);

  // Calculate pagination for schedule
  const scheduleItems = selectedLoan?.paymentSchedule || [];
  const totalSchedulePages = Math.ceil(scheduleItems.length / itemsPerPage);
  const indexOfLastScheduleItem = schedulePage * itemsPerPage;
  const indexOfFirstScheduleItem = indexOfLastScheduleItem - itemsPerPage;
  const currentScheduleItems = scheduleItems.slice(indexOfFirstScheduleItem, indexOfLastScheduleItem);

  const handleLoanPageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleSchedulePageChange = (pageNumber: number) => {
    setSchedulePage(pageNumber);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Active Loans</h2>
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  // Show error message if there was an issue
  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Active Loans</h2>
        <div className="text-center py-8">
          <div className="text-red-500 mb-2">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-gray-500 mb-4">Unable to load loan information</p>
          <p className="text-sm text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchActiveLoans}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Active Loans</h2>
      
      {loans.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">You don't have any active loans at the moment.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Loans Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Loan Plan
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Term
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Interest
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Date
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentLoans.map((loan) => (
                  <tr 
                    key={loan.id} 
                    className={`cursor-pointer transition-colors ${
                      selectedLoan?.id === loan.id 
                        ? 'bg-red-50 hover:bg-red-100' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleLoanClick(loan)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {loan.planName || 'Active Loan'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(loan.amount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {loan.term} months
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {loan.interest}%
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(loan.startDate)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Loans Pagination */}
          {totalLoanPages > 1 && (
            <div className="flex justify-center items-center space-x-2">
              <button
                onClick={() => handleLoanPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalLoanPages}
              </span>
              <button
                onClick={() => handleLoanPageChange(currentPage + 1)}
                disabled={currentPage === totalLoanPages}
                className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}

          {/* Amortization Schedule */}
          {selectedLoan && (
            <div className="mt-6 border-t pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  Payment Schedule for {selectedLoan.planName || 'Active Loan'}
                </h3>
                <button
                  onClick={() => setSelectedLoan(null)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Close
                </button>
              </div>
              
              {scheduleItems.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No payment schedule available.</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Day
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Payment Date
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Principal
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Interest
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Payment
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Remaining Balance
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {currentScheduleItems.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {item.day}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(item.paymentDate)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(item.principal)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(item.interest)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {formatCurrency(item.totalPayment)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {formatCurrency(item.remainingBalance)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(item.status)}`}>
                                {item.status || 'pending'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Schedule Pagination */}
                  {totalSchedulePages > 1 && (
                    <div className="flex justify-center items-center space-x-2 mt-4">
                      <button
                        onClick={() => handleSchedulePageChange(schedulePage - 1)}
                        disabled={schedulePage === 1}
                        className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-gray-600">
                        Page {schedulePage} of {totalSchedulePages}
                      </span>
                      <button
                        onClick={() => handleSchedulePageChange(schedulePage + 1)}
                        disabled={schedulePage === totalSchedulePages}
                        className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}