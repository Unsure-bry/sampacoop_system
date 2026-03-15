'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { firestore, db } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';

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
  remainingBalance?: number;
  totalPaid?: number;
  loanId?: string;
}

interface PaymentScheduleItem {
  day: number;
  paymentDate: string;
  principal: number;
  interest: number;
  totalPayment: number;
  remainingBalance: number;
  status?: 'pending' | 'paid' | 'partial';
  paidAmount?: number;
  receiptNumber?: string;
  paymentDateProcessed?: string;
}

interface PaymentTransaction {
  id?: string;
  loanId: string;
  userId: string;
  amount: number;
  paymentDate: any;
  receiptNumber: string;
  appliedToDays: number[];
  remainingAmount: number;
  createdAt: any;
}

interface ActiveLoansProps {
  onLoanStatusChange?: () => void;
}

const ITEMS_PER_PAGE = 10;

export default function ActiveLoans({ onLoanStatusChange }: ActiveLoansProps) {
  const { user } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [completedLoans, setCompletedLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Selected loan for payment schedule view
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentScheduleItem[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  
  // Pagination for schedule
  const [schedulePage, setSchedulePage] = useState(1);
  
  // Pagination for completed loans
  const [completedLoansPage, setCompletedLoansPage] = useState(1);
  
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  // Real-time listener for approved/active loans
  useEffect(() => {
    if (!user?.uid || !db) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Set up real-time listener for loans (both active and approved)
    const loansQuery = query(
      collection(db, 'loans'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(loansQuery, (snapshot) => {
      const loansData: Loan[] = [];
      const completedLoansData: Loan[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const loanData = {
          id: doc.id,
          userId: data.userId,
          amount: data.amount,
          term: data.term,
          startDate: data.startDate,
          interest: data.interest,
          status: data.status,
          planName: data.planName,
          paymentSchedule: data.paymentSchedule || [],
          remainingBalance: data.remainingBalance,
          totalPaid: data.totalPaid || 0
        };
        
        // Separate active/approved loans from completed loans
        if (data.status === 'active' || data.status === 'approved') {
          loansData.push(loanData);
        } else if (data.status === 'completed' || data.status === 'paid') {
          completedLoansData.push(loanData);
        }
      });
      setLoans(loansData);
      setCompletedLoans(completedLoansData);
      setLoading(false);
      
      if (onLoanStatusChange) {
        onLoanStatusChange();
      }
    }, (error) => {
      console.error('Error listening to loans:', error);
      setError('Failed to load loan information');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, onLoanStatusChange]);

  // Calculate amortization schedule
  // Logic: Total Amount = Principal + (Principal × Interest Rate), then divide by days
  // Example: 3000 + (3000 × 5%) = 3150, then 3150 / 30 days = 105 per day
  // This matches the Admin calculation exactly
  const calculateAmortizationSchedule = (loan: Loan): PaymentScheduleItem[] => {
    const schedule: PaymentScheduleItem[] = [];
    
    // Validate loan data
    if (!loan.amount || !loan.term || loan.interest === undefined) {
      console.error('Invalid loan data for amortization calculation:', loan);
      return schedule;
    }
    
    // Convert loan term to days (1 month = 30 days)
    const totalDays = loan.term * 30;
    
    // Step 1: Calculate interest amount (Principal × Interest Rate × Term)
    // Example: 5000 × 2% × 3 months = 300
    const interestAmount = loan.amount * (loan.interest / 100) * loan.term;
    
    // Step 2: Calculate total amount (Principal + Interest)
    // Example: 3000 + 150 = 3150
    const totalAmount = loan.amount + interestAmount;
    
    // Step 3: Calculate principal per day (Principal / Days)
    // Example: 3000 / 30 = 100
    const principalPerDay = loan.amount / totalDays;
    
    // Step 4: Calculate interest per day (Interest Amount / Days)
    // Example: 150 / 30 = 5
    const interestPerDay = interestAmount / totalDays;
    
    // Step 5: Calculate total payment per day (Total Amount / Days)
    // Example: 3150 / 30 = 105
    const totalPaymentPerDay = totalAmount / totalDays;
    
    // Step 6: Remaining balance starts at total amount
    let remainingBalance = totalAmount;
    
    // Use loan start date or default to today if not available
    const startDate = loan.startDate ? new Date(loan.startDate) : new Date();
    let currentDate = new Date(startDate);
    
    for (let day = 1; day <= totalDays; day++) {
      // Add one day for each payment date
      currentDate.setDate(currentDate.getDate() + 1);
      
      // Subtract total payment from remaining balance
      remainingBalance -= totalPaymentPerDay;
      
      // Ensure remaining balance doesn't go below 0
      if (remainingBalance < 0) {
        remainingBalance = 0;
      }
      
      schedule.push({
        day,
        paymentDate: currentDate.toISOString().split('T')[0],
        principal: principalPerDay,
        interest: interestPerDay,
        totalPayment: totalPaymentPerDay,
        remainingBalance: remainingBalance,
        status: 'pending',
        paidAmount: 0
      });
    }
    
    return schedule;
  };

  // Apply existing payments from Firestore to the calculated schedule
  // IMPORTANT: Always use the calculated schedule values (principal, interest, totalPayment, remainingBalance)
  // Only merge the payment status info (status, paidAmount, receiptNumber, paymentDateProcessed) from Firestore
  const applyPaymentsToSchedule = (schedule: PaymentScheduleItem[], loan: Loan): PaymentScheduleItem[] => {
    // If no schedule calculated, return empty array
    if (!schedule || schedule.length === 0) {
      return [];
    }
    
    // If loan has payment schedule with status info from Firestore, merge only the payment status
    if (loan.paymentSchedule && loan.paymentSchedule.length > 0) {
      return schedule.map((calcItem, index) => {
        const storedItem = loan.paymentSchedule?.[index];
        if (storedItem) {
          return {
            ...calcItem, // Keep calculated values (principal, interest, totalPayment, remainingBalance)
            status: storedItem.status || 'pending', // Merge payment status
            paidAmount: storedItem.paidAmount || 0, // Merge paid amount
            receiptNumber: storedItem.receiptNumber, // Merge receipt number
            paymentDateProcessed: storedItem.paymentDateProcessed // Merge processed date
          };
        }
        return calcItem;
      });
    }
    
    return schedule;
  };

  const handleViewSchedule = async (loan: Loan) => {
    setScheduleLoading(true);
    setSelectedLoan(loan);
    setSchedulePage(1);
    
    // Calculate schedule using EXACT Admin logic
    const calculatedSchedule = calculateAmortizationSchedule(loan);
    
    // Apply any existing payments from Firestore
    const scheduleWithPayments = applyPaymentsToSchedule(calculatedSchedule, loan);
    
    setPaymentSchedule(scheduleWithPayments);
    setScheduleLoading(false);
  };

  const handleCloseSchedule = () => {
    setSelectedLoan(null);
    setPaymentSchedule([]);
    setShowPaymentModal(false);
    setPaymentAmount('');
    setReceiptNumber('');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadgeClass = (status?: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get remaining balance from loan or calculate it
  const getRemainingBalance = (loan: Loan): number => {
    // First priority: use the stored remainingBalance from database
    if (loan.remainingBalance !== undefined && loan.remainingBalance !== null) {
      return Math.max(0, loan.remainingBalance);
    }
    
    // Calculate total amount (principal + interest)
    const totalAmount = loan.amount + calculateTotalInterest(loan);
    
    // Calculate from payment schedule if available
    if (loan.paymentSchedule && loan.paymentSchedule.length > 0) {
      const totalPaid = loan.paymentSchedule.reduce((sum, item) => {
        return sum + (item.paidAmount || 0);
      }, 0);
      return Math.max(0, totalAmount - totalPaid);
    }
    
    // If no payments made yet, return full amount
    return totalAmount;
  };

  // Calculate total interest
  // Formula: Principal × Interest Rate × Term (in months)
  // Example: 5000 × 2% × 3 months = 300
  const calculateTotalInterest = (loan: Loan): number => {
    if (!loan.amount || loan.interest === undefined || !loan.term) {
      return 0;
    }
    return loan.amount * (loan.interest / 100) * loan.term;
  };

  // Pagination for schedule
  const totalSchedulePages = Math.ceil(paymentSchedule.length / ITEMS_PER_PAGE);
  const indexOfLastItem = schedulePage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentScheduleItems = paymentSchedule.slice(indexOfFirstItem, indexOfLastItem);

  const handleSchedulePageChange = (pageNumber: number) => {
    setSchedulePage(pageNumber);
  };

  // Process payment with auto-marking logic
  const handleProcessPayment = async () => {
    if (!selectedLoan || !user || !db) return;
    
    const amount = parseFloat(paymentAmount);
    
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    
    if (!receiptNumber.trim()) {
      toast.error('Please enter a receipt number');
      return;
    }
    
    setProcessingPayment(true);
    
    try {
      let remainingPayment = amount;
      const updatedSchedule = [...paymentSchedule];
      const appliedDays: number[] = [];
      
      // Apply payment to unpaid/partial installments
      for (let i = 0; i < updatedSchedule.length; i++) {
        if (remainingPayment <= 0) break;
        
        const item = updatedSchedule[i];
        const currentPaid = item.paidAmount || 0;
        const amountDue = item.totalPayment - currentPaid;
        
        if (item.status !== 'paid' && amountDue > 0) {
          if (remainingPayment >= amountDue) {
            // Full payment for this installment
            updatedSchedule[i] = {
              ...item,
              status: 'paid',
              paidAmount: item.totalPayment,
              receiptNumber: receiptNumber,
              paymentDateProcessed: new Date().toISOString()
            };
            remainingPayment -= amountDue;
            appliedDays.push(item.day);
          } else {
            // Partial payment
            updatedSchedule[i] = {
              ...item,
              status: 'partial',
              paidAmount: currentPaid + remainingPayment,
              receiptNumber: receiptNumber,
              paymentDateProcessed: new Date().toISOString()
            };
            remainingPayment = 0;
            appliedDays.push(item.day);
          }
        }
      }
      
      // Calculate new remaining balance
      const totalPaid = updatedSchedule.reduce((sum, item) => sum + (item.paidAmount || 0), 0);
      const totalAmount = selectedLoan.amount + calculateTotalInterest(selectedLoan);
      const newRemainingBalance = Math.max(0, totalAmount - totalPaid);
      
      // Check if loan is fully paid
      const isFullyPaid = newRemainingBalance <= 0;
      
      // Update loan document in Firestore
      const loanRef = doc(db, 'loans', selectedLoan.id);
      await updateDoc(loanRef, {
        paymentSchedule: updatedSchedule,
        remainingBalance: newRemainingBalance,
        totalPaid: totalPaid,
        status: isFullyPaid ? 'completed' : (selectedLoan.status === 'approved' ? 'active' : selectedLoan.status),
        updatedAt: serverTimestamp()
      });
      
      // Save payment transaction to loanPayments collection
      const paymentData: Omit<PaymentTransaction, 'id'> = {
        loanId: selectedLoan.id,
        userId: user.uid,
        amount: amount,
        paymentDate: serverTimestamp(),
        receiptNumber: receiptNumber,
        appliedToDays: appliedDays,
        remainingAmount: remainingPayment,
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'loanPayments'), paymentData);
      
      // Update local state
      setPaymentSchedule(updatedSchedule);
      
      toast.success(`Payment of ${formatCurrency(amount)} processed successfully!`);
      
      // Close payment modal
      setShowPaymentModal(false);
      setPaymentAmount('');
      setReceiptNumber('');
      
      // Show completion message if fully paid
      if (isFullyPaid) {
        toast.success('Congratulations! Your loan has been fully paid.');
      }
      
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Failed to process payment. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Active Loan</h2>
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Active Loan</h2>
        <div className="text-center py-8">
          <div className="text-red-500 mb-2">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-gray-500 mb-4">Unable to load loan information</p>
          <p className="text-sm text-gray-400 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Active Loan</h2>
      
      {loans.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">You don&apos;t have any active loans at the moment.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Loans Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Loan ID
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Loan Plan
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Principal Amount
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Interest Rate
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Loan Term
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
                {loans.map((loan) => (
                  <tr 
                    key={loan.id} 
                    className="cursor-pointer transition-colors hover:bg-gray-50"
                    onClick={() => handleViewSchedule(loan)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {loan.loanId || loan.id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {loan.planName || 'Active Loan'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(loan.amount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {loan.interest}%
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {loan.term} months
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(getRemainingBalance(loan))}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        loan.status === 'approved' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {loan.status === 'approved' ? 'Approved' : 'Active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-sm text-gray-500 italic">
            Click on your loan row to view payment schedule and make payments.
          </p>
        </div>
      )}

      {/* Completed Loans Section */}
      {completedLoans.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Completed Loans</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Loan ID
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Loan Plan
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Principal Amount
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Interest Rate
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Loan Term
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Paid
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {completedLoans
                  .slice((completedLoansPage - 1) * ITEMS_PER_PAGE, completedLoansPage * ITEMS_PER_PAGE)
                  .map((loan) => (
                  <tr 
                    key={loan.id} 
                    className="cursor-pointer transition-colors hover:bg-gray-50"
                    onClick={() => handleViewSchedule(loan)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {loan.loanId || loan.id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {loan.planName || 'Loan'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(loan.amount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {loan.interest}%
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {loan.term} months
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(loan.totalPaid || (loan.amount + (loan.amount * loan.interest / 100)))}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        Completed
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination for Completed Loans */}
          {completedLoans.length > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50 mt-4">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{(completedLoansPage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(completedLoansPage * ITEMS_PER_PAGE, completedLoans.length)}
                </span>{' '}
                of <span className="font-medium">{completedLoans.length}</span> loans
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => setCompletedLoansPage(completedLoansPage - 1)}
                  disabled={completedLoansPage === 1}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    completedLoansPage === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Previous
                </button>
                
                <span className="px-3 py-1 text-sm font-medium text-gray-700">
                  Page {completedLoansPage} of {Math.ceil(completedLoans.length / ITEMS_PER_PAGE)}
                </span>
                
                <button
                  onClick={() => setCompletedLoansPage(completedLoansPage + 1)}
                  disabled={completedLoansPage >= Math.ceil(completedLoans.length / ITEMS_PER_PAGE)}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    completedLoansPage >= Math.ceil(completedLoans.length / ITEMS_PER_PAGE)
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          <p className="text-sm text-gray-500 italic mt-4">
            Click on a completed loan to view its payment history.
          </p>
        </div>
      )}

      {/* Payment Schedule Modal */}
      {selectedLoan && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-start sm:items-center">
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                  Amortization Schedule - {selectedLoan.planName || 'Active Loan'}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 mt-1 truncate">
                  Loan ID: {selectedLoan.loanId || selectedLoan.id} | 
                  Principal: {formatCurrency(selectedLoan.amount)} | 
                  Interest Rate: {selectedLoan.interest}% | 
                  Term: {selectedLoan.term} months
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCloseSchedule}
                  className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-3 sm:p-6">
              {/* Loan Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
                <div className="bg-white border border-gray-200 p-3 sm:p-4 rounded-lg shadow-sm">
                  <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-1">Principal Amount</p>
                  <p className="text-sm sm:text-base font-bold text-gray-900">{formatCurrency(selectedLoan.amount)}</p>
                </div>
                <div className="bg-white border border-gray-200 p-3 sm:p-4 rounded-lg shadow-sm">
                  <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-1">Interest Rate</p>
                  <p className="text-sm sm:text-base font-bold text-gray-900">{selectedLoan.interest}%</p>
                </div>
                <div className="bg-white border border-gray-200 p-3 sm:p-4 rounded-lg shadow-sm">
                  <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-1">Term</p>
                  <p className="text-sm sm:text-base font-bold text-gray-900">{selectedLoan.term} months</p>
                </div>
                <div className="bg-white border border-gray-200 p-3 sm:p-4 rounded-lg shadow-sm">
                  <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-1">Start Date</p>
                  <p className="text-sm sm:text-base font-bold text-gray-900">{formatDate(selectedLoan.startDate)}</p>
                </div>
                <div className="bg-white border border-gray-200 p-3 sm:p-4 rounded-lg shadow-sm">
                  <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-1">Status</p>
                  <p className="font-medium">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${
                      selectedLoan.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : selectedLoan.status === 'approved' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedLoan.status}
                    </span>
                  </p>
                </div>
                <div className="bg-white border border-gray-200 p-3 sm:p-4 rounded-lg shadow-sm">
                  <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-1">Remaining Balance</p>
                  <p className="text-sm sm:text-base font-bold text-gray-900">{formatCurrency(getRemainingBalance(selectedLoan))}</p>
                </div>
              </div>

              {scheduleLoading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
                </div>
              ) : error ? (
                <div className="text-red-500 text-center py-8">{error}</div>
              ) : paymentSchedule.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No payment schedule available.</p>
              ) : (
                <>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Amortization Schedule</h3>
                  
                  <div className="overflow-x-auto -mx-3 sm:-mx-6">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Day
                          </th>
                          <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden sm:table-cell">
                            Payment Date
                          </th>
                          <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                            Principal
                          </th>
                          <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                            Interest
                          </th>
                          <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Payment
                          </th>
                          <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden lg:table-cell">
                            Balance
                          </th>
                          <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Status
                          </th>
                          <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden sm:table-cell">
                            Paid
                          </th>
                          <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Receipt
                          </th>
                          <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden xl:table-cell">
                            Processed
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {currentScheduleItems.map((item, index) => (
                          <tr key={index} className={`hover:bg-gray-50 ${item.status === 'paid' ? 'bg-green-50' : item.status === 'partial' ? 'bg-yellow-50' : ''}`}>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm font-bold text-gray-900">
                              {item.day || ''}
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-700 hidden sm:table-cell">
                              {formatDate(item.paymentDate)}
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-900 hidden md:table-cell">
                              {formatCurrency(item.principal)}
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-900 hidden md:table-cell">
                              {formatCurrency(item.interest)}
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm font-bold text-gray-900">
                              {formatCurrency(item.totalPayment)}
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm font-bold text-gray-900 hidden lg:table-cell">
                              {formatCurrency(item.remainingBalance)}
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                              <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${
                                item.status === 'paid' 
                                  ? 'bg-green-100 text-green-800' 
                                  : item.status === 'partial' 
                                    ? 'bg-yellow-100 text-yellow-800' 
                                    : 'bg-gray-100 text-gray-800'
                              }`}>
                                {item.status || 'pending'}
                              </span>
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-900 hidden sm:table-cell">
                              {item.paidAmount ? formatCurrency(item.paidAmount) : '-'}
                              {item.status === 'partial' && item.paidAmount && (
                                <span className="text-xs text-gray-600 ml-1">
                                  / {formatCurrency(item.totalPayment)}
                                </span>
                              )}
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                              {item.receiptNumber || '-'}
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-600 hidden xl:table-cell">
                              {item.paymentDateProcessed 
                                ? new Date(item.paymentDateProcessed).toLocaleString('en-PH', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) 
                                : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Schedule Pagination */}
                  {totalSchedulePages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between px-3 sm:px-4 py-3 border-t border-gray-200 bg-gray-50 mt-4 gap-3">
                      <div className="text-xs sm:text-sm text-gray-700">
                        Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                        <span className="font-medium">
                          {Math.min(indexOfLastItem, paymentSchedule.length)}
                        </span>{' '}
                        of <span className="font-medium">{paymentSchedule.length}</span> payments
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleSchedulePageChange(schedulePage - 1)}
                          disabled={schedulePage === 1}
                          className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium ${
                            schedulePage === 1
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          Previous
                        </button>
                        
                        <span className="px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700">
                          Page {schedulePage} of {totalSchedulePages}
                          </span>
                        
                        <button
                          onClick={() => handleSchedulePageChange(schedulePage + 1)}
                          disabled={schedulePage === totalSchedulePages}
                          className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium ${
                            schedulePage === totalSchedulePages
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedLoan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800">Make Payment</h3>
                <button 
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPaymentAmount('');
                    setReceiptNumber('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Loan: {selectedLoan.planName}</p>
                <p className="text-sm text-gray-600">Remaining Balance: {formatCurrency(getRemainingBalance(selectedLoan))}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="paymentAmount">
                    Payment Amount (PHP)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                      ₱
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      id="paymentAmount"
                      value={paymentAmount}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow only up to 2 decimal places
                        if (value === '' || /^\d*(\.\d{0,2})?$/.test(value)) {
                          setPaymentAmount(value);
                        }
                      }}
                      className="w-full pl-8 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black"
                      placeholder="Enter amount"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="receiptNumber">
                    Receipt Number
                  </label>
                  <input
                    type="text"
                    id="receiptNumber"
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black"
                    placeholder="Enter receipt number"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPaymentAmount('');
                    setReceiptNumber('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProcessPayment}
                  disabled={processingPayment}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
                >
                  {processingPayment && (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {processingPayment ? 'Processing...' : 'Submit Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
