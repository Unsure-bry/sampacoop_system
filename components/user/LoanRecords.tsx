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
  paymentSchedule?: AmortizationSchedule[];
}

interface AmortizationSchedule {
  day: number;
  paymentDate: string;
  principal: number;
  interest: number;
  totalPayment: number;
  remainingBalance: number;
  status?: 'pending' | 'paid' | 'partial';
}

export default function LoanRecords() {
  const { user } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [amortizationSchedule, setAmortizationSchedule] = useState<AmortizationSchedule[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  
  // Pagination for loans table
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Pagination for amortization schedule
  const [schedulePage, setSchedulePage] = useState(1);
  const [scheduleItemsPerPage] = useState(10);

  useEffect(() => {
    if (user) {
      fetchUserLoans();
    }
  }, [user]);

  const fetchUserLoans = async () => {
    try {
      setLoading(true);
      
      // Validate that user has a UID
      if (!user?.uid) {
        throw new Error('User not properly authenticated');
      }
      
      // Check if Firestore is initialized
      if (!firestore) {
        throw new Error('Firestore not initialized');
      }
      
      const result = await firestore.queryDocuments('loans', [
        { field: 'userId', operator: '==', value: user?.uid }
      ]);

      if (result.success && result.data) {
        const loansData = result.data.map((doc: any) => ({
          id: doc.id,
          ...doc
        }));
        setLoans(loansData);
      } else {
        // Handle case where query was successful but no data was found
        setLoans([]);
        if (result.error) {
          console.error('Query returned error:', result.error);
        }
      }
    } catch (error: any) {
      console.error('Error fetching user loans:', error);
      toast.error('Failed to load loan records. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const calculateAmortizationSchedule = (loan: Loan): AmortizationSchedule[] => {
    const schedule: AmortizationSchedule[] = [];
    
    // Validate loan data
    if (!loan.amount || !loan.term || loan.interest === undefined) {
      console.error('Invalid loan data for amortization calculation:', loan);
      return schedule;
    }
    
    // Convert loan term to days (1 month = 30 days)
    const totalDays = loan.term * 30;
    
    // Calculate total interest: Principal × Interest Rate × Term (in months)
    // Example: 5000 × 2% × 3 months = 300
    const totalInterest = loan.amount * (loan.interest / 100) * loan.term;
    
    // Calculate daily payment using formula: (Amount + Total Interest) / Number of days
    const dailyPayment = (loan.amount + totalInterest) / totalDays;
    
    // Calculate daily interest and principal portions
    const dailyInterest = totalInterest / totalDays;
    const dailyPrincipal = loan.amount / totalDays;
    
    let remainingBalance = loan.amount + totalInterest;
    
    // Use loan start date or default to today if not available
    const startDate = loan.startDate ? new Date(loan.startDate) : new Date();
    let currentDate = new Date(startDate);
    
    for (let day = 1; day <= totalDays; day++) {
      // Add one day for each payment date
      currentDate.setDate(currentDate.getDate() + 1);
      
      remainingBalance -= dailyPayment;
      
      // Ensure remaining balance doesn't go below 0
      if (remainingBalance < 0) {
        remainingBalance = 0;
      }
      
      schedule.push({
        day,
        paymentDate: currentDate.toISOString().split('T')[0],
        principal: dailyPrincipal,
        interest: dailyInterest,
        totalPayment: dailyPayment,
        remainingBalance
      });
    }
    
    return schedule;
  };

  const handleViewSchedule = (loan: Loan) => {
    setScheduleLoading(true);
    setSelectedLoan(loan);
    setSchedulePage(1); // Reset to first page when selecting a new loan
    
    // If the loan already has a payment schedule from the database, use it
    if (loan.paymentSchedule && loan.paymentSchedule.length > 0) {
      // Map the payment schedule to ensure consistent structure and include status
      const mappedSchedule = loan.paymentSchedule.map((item: any) => ({
        day: item.day !== undefined ? item.day : item.month,
        paymentDate: item.paymentDate,
        principal: item.principal,
        interest: item.interest,
        totalPayment: item.totalPayment,
        remainingBalance: item.remainingBalance,
        status: item.status || (loan.status === 'completed' ? 'paid' : 'pending')
      }));
      setAmortizationSchedule(mappedSchedule);
    } else {
      // Otherwise, calculate the schedule dynamically with status based on loan status
      const schedule = calculateAmortizationSchedule(loan);
      // If loan is completed, mark all as paid, otherwise all pending
      const scheduleWithStatus = schedule.map(item => ({
        ...item,
        status: loan.status === 'completed' ? 'paid' : 'pending' as 'paid' | 'pending'
      }));
      setAmortizationSchedule(scheduleWithStatus);
    }
    
    setScheduleLoading(false);
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

  // Calculate pagination for loans
  const totalLoanPages = Math.ceil(loans.length / itemsPerPage);
  const indexOfLastLoan = currentPage * itemsPerPage;
  const indexOfFirstLoan = indexOfLastLoan - itemsPerPage;
  const currentLoans = loans.slice(indexOfFirstLoan, indexOfLastLoan);

  // Calculate pagination for amortization schedule
  const totalSchedulePages = Math.ceil(amortizationSchedule.length / scheduleItemsPerPage);
  const indexOfLastScheduleItem = schedulePage * scheduleItemsPerPage;
  const indexOfFirstScheduleItem = indexOfLastScheduleItem - scheduleItemsPerPage;
  const currentScheduleItems = amortizationSchedule.slice(indexOfFirstScheduleItem, indexOfLastScheduleItem);

  const handleLoanPageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleSchedulePageChange = (pageNumber: number) => {
    setSchedulePage(pageNumber);
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

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Loan Records</h2>
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Loan Records</h2>
      
      {loans.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">You don't have any loan records yet.</p>
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
                    onClick={() => handleViewSchedule(loan)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {loan.planName || 'Loan'}
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
                      <span className={`px-2 py-1 text-xs rounded-full ${
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
          
          {selectedLoan && (
            <div className="mt-6 border-t pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  Amortization Schedule for {selectedLoan.planName || 'Loan'} (ID: {selectedLoan.id.match(/\d{8}/)?.[0] || selectedLoan.id.slice(-8).padStart(8, '0')})
                </h3>
  
              </div>
              
              {scheduleLoading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
                </div>
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
                              {item.day || ''}
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

                  {/* Amortization Schedule Pagination */}
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