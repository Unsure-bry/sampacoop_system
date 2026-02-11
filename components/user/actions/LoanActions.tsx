'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { LoanPlan } from '@/lib/types/loan';

interface LoanActionsProps {
  loanPlans?: LoanPlan[];
  onLoanApplied?: () => void;
  hasActiveLoan?: boolean;
}

export default function LoanActions({ loanPlans = [], onLoanApplied, hasActiveLoan = false }: LoanActionsProps) {
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<LoanPlan | null>(null);
  const [amount, setAmount] = useState('');
  const [term, setTerm] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [amortizationSchedule, setAmortizationSchedule] = useState<Array<{
    period: number;
    date: string;
    payment: number;
    principal: number;
    interest: number;
    remainingBalance: number;
  }>>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);

  const handleApplyClick = (plan: LoanPlan) => {
    setSelectedPlan(plan);
    setAmount('5000'); // Default to 5000 PHP
    setTerm(plan.termOptions[0]?.toString() || '1');
  };

  const calculateAmortization = (principal: number, monthlyInterestRate: number, termMonths: number) => {
    const totalDays = termMonths * 30; // 30 days per month
    
    // Calculate total interest: Amount × Interest Rate
    const totalInterest = principal * (monthlyInterestRate / 100);
    
    // Calculate daily payment using formula: (Amount + Total Interest) / Number of days
    const dailyPayment = (principal + totalInterest) / totalDays;
    
    const schedule = [];
    let remainingBalance = principal + totalInterest;
    const startDate = new Date();
    
    for (let day = 1; day <= totalDays; day++) {
      const paymentDate = new Date(startDate);
      paymentDate.setDate(startDate.getDate() + day);
      
      // Calculate interest portion for this day (total interest divided by days)
      const interestPayment = totalInterest / totalDays;
      // Principal portion is the rest of the daily payment
      const principalPayment = dailyPayment - interestPayment;
      
      remainingBalance -= dailyPayment;
      
      // Ensure remaining balance doesn't go negative due to rounding
      if (remainingBalance < 0) remainingBalance = 0;
      
      schedule.push({
        period: day,
        date: paymentDate.toISOString().split('T')[0],
        payment: dailyPayment,
        principal: principalPayment,
        interest: interestPayment,
        remainingBalance: remainingBalance
      });
    }
    
    return schedule;
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs first
    const amountValue = parseFloat(amount);
    const termValue = parseInt(term);
    
    if (!selectedPlan) {
      toast.error('No loan plan selected');
      return;
    }

    if (isNaN(amountValue) || amountValue <= 0 || amountValue > selectedPlan.maxAmount) {
      toast.error(`Please enter a valid loan amount (maximum ${selectedPlan.maxAmount})`);
      return;
    }

    if (isNaN(termValue) || termValue <= 0 || !selectedPlan.termOptions.includes(termValue)) {
      toast.error('Please select a valid loan term');
      return;
    }
    
    const schedule = calculateAmortization(amountValue, selectedPlan.interestRate, termValue);
    setAmortizationSchedule(schedule);
    setCurrentPage(1); // Reset to first page
    setShowVerification(true);
  };

  const handleConfirmApplication = async () => {
    setLoading(true);

    try {
      // Validate inputs
      const amountValue = parseFloat(amount);
      const termValue = parseInt(term);

      if (!selectedPlan) {
        toast.error('No loan plan selected');
        setLoading(false);
        return;
      }

      if (isNaN(amountValue) || amountValue <= 0 || amountValue > selectedPlan.maxAmount) {
        toast.error(`Please enter a valid loan amount (maximum ${selectedPlan.maxAmount})`);
        setLoading(false);
        return;
      }

      if (isNaN(termValue) || termValue <= 0 || !selectedPlan.termOptions.includes(termValue)) {
        toast.error('Please select a valid loan term');
        setLoading(false);
        return;
      }

      // Fetch user's member information from members collection
      let memberInfo = {};
      
      try {
        const memberResult = await firestore.getDocument('members', user?.uid || '');
        
        if (memberResult.success && memberResult.data) {
          const memberData = memberResult.data;
          const fullName = `${memberData.firstName || ''} ${memberData.middleName ? memberData.middleName + ' ' : ''}${memberData.lastName || ''}${memberData.suffix ? ' ' + memberData.suffix : ''}`.trim();
          
          memberInfo = {
            firstName: memberData.firstName || '',
            lastName: memberData.lastName || '',
            middleName: memberData.middleName || '',
            suffix: memberData.suffix || '',
            fullName: fullName || user?.displayName || '',
            role: memberData.role || user?.role || '',
            phone: memberData.phone || memberData.phoneNumber || '',
          };
        } else {
          // Fallback to user data if member record doesn't exist
          memberInfo = {
            firstName: '',
            lastName: '',
            middleName: '',
            suffix: '',
            fullName: user?.displayName || '',
            role: user?.role || '',
            phone: '',
          };
        }
      } catch (error) {
        console.error('Error fetching member information:', error);
        // Fallback to user data if member info fetch fails
        memberInfo = {
          firstName: '',
          lastName: '',
          middleName: '',
          suffix: '',
          fullName: user?.displayName || '',
          role: user?.role || '',
          phone: '',
        };
      }
      
      // Create loan request document with user info
      const loanRequest = {
        userId: user?.uid || '',
        email: user?.email || '',
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        amount: amountValue,
        term: termValue,
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
        // Include member information for admin visibility
        ...memberInfo,
      };

      // Save to Firestore with error handling
      const result = await firestore.setDocument(
        'loanRequests',
        `${user?.uid}-${selectedPlan.id}-${Date.now()}`,
        loanRequest
      );
      
      if (!result.success) {
        console.error('Error saving loan request:', result.error);
        toast.error(result.error || 'Failed to submit loan request. Please try again.');
        return;
      }
      
      if (result.success) {
        toast.success('Loan application submitted successfully!');
        
        // Create pending loan notification for the user
        try {
          const notificationId = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          await firestore.setDocument('notifications', notificationId, {
            userId: user?.uid,
            userRole: user?.role || 'member',
            title: 'Loan Application Pending',
            message: `Your loan application for ${selectedPlan.name} amounting to ${formatCurrency(amountValue)} is now pending approval. You will be notified once it is reviewed.`,
            type: 'loan_pending',
            status: 'unread',
            createdAt: new Date().toISOString(),
            metadata: {
              loanId: `${user?.uid}-${selectedPlan.id}-${Date.now()}`,
              amount: amountValue,
              planName: selectedPlan.name,
              term: termValue
            }
          });
        } catch (notifError) {
          console.error('Error creating pending loan notification:', notifError);
        }
        
        // Reset all forms and close modals
        setSelectedPlan(null);
        setAmount('5000'); // Reset to default amount
        setTerm(selectedPlan.termOptions[0]?.toString() || '1'); // Reset to default term
        setShowVerification(false);
        setAmortizationSchedule([]);
        // Notify parent component if needed
        if (onLoanApplied) {
          onLoanApplied();
        }
      } else {
        toast.error('Failed to submit loan request. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting loan request:', error);
      toast.error('An error occurred. Please try again.');
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

  // Pagination logic
  const totalPages = Math.ceil(amortizationSchedule.length / itemsPerPage);
  
  const currentPayments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return amortizationSchedule.slice(startIndex, endIndex);
  }, [amortizationSchedule, currentPage, itemsPerPage]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Loan Plans Section */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Available Loan Plans</h2>
        
        {hasActiveLoan ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="shrink-0 mt-0.5">
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-yellow-800 mb-1">Loan Application Unavailable</h3>
                <p className="text-yellow-700">
                  You currently have an active loan. You can apply for a new loan once your current loan is completed.
                </p>
              </div>
            </div>
          </div>
        ) : loanPlans.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <p className="text-gray-500">No loan plans available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loanPlans.map((plan) => (
              <div 
                key={plan.id} 
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200"
              >
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{plan.name}</h3>
                <p className="text-gray-600 mb-4">{plan.description}</p>
                
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Maximum Amount:</span>
                    <span className="font-medium">{formatCurrency(plan.maxAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Interest Rate:</span>
                    <span className="font-medium">{plan.interestRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Terms:</span>
                    <span className="font-medium">{plan.termOptions.join(', ')} months</span>
                  </div>
                </div>
                
                <button
                  onClick={() => handleApplyClick(plan)}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Apply Now
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Loan Application Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Apply for {selectedPlan.name}</h2>
                <button 
                  onClick={() => setSelectedPlan(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-600 text-sm">{selectedPlan.description}</p>
                <div className="mt-2 flex justify-between">
                  <span className="text-gray-600">Maximum Amount:</span>
                  <span className="font-medium">{formatCurrency(selectedPlan.maxAmount)}</span>
                </div>
              </div>

              <form onSubmit={handleSubmitApplication}>
                <div className="mb-6">
                  <label className="block text-gray-700 text-sm font-bold mb-3" htmlFor="amount">
                    Loan Amount (PHP)
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {[1000, 2000, 3000, 4000, 5000].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setAmount(value.toString())}
                        className={`p-3 rounded-lg border-2 transition-all duration-200 text-center font-medium ${amount === value.toString() 
                          ? 'border-red-600 bg-red-50 text-red-700 shadow-sm' 
                          : 'border-gray-300 hover:border-gray-400 text-gray-700 hover:bg-gray-50'}
                        `}
                      >
                        ₱{value.toLocaleString()}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 p-2 bg-red-50 rounded-lg border border-red-100">
                    <div className="text-center">
                      <span className="text-sm text-gray-600">Selected Amount: </span>
                      <span className="font-bold text-red-700">
                        {formatCurrency(parseFloat(amount) || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="term">
                    Loan Term
                  </label>
                  {selectedPlan.termOptions.length > 1 ? (
                    <select
                      id="term"
                      value={term}
                      onChange={(e) => setTerm(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                    >
                      <option value="">Select term</option>
                      {selectedPlan.termOptions.map((option) => (
                        <option key={option} value={option}>
                          {option} month{option !== 1 ? 's' : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Selected Term:</span>
                        <span className="font-semibold text-gray-800">
                          {term} month{parseInt(term) !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setSelectedPlan(null)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Review Application
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Verification Modal */}
      {showVerification && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Loan Application Review</h2>
                <button 
                  onClick={() => setShowVerification(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Loan Details */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Loan Details</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Plan:</span>
                      <span className="font-medium">{selectedPlan.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-medium">{formatCurrency(parseFloat(amount))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Term:</span>
                      <span className="font-medium">{term} month{parseInt(term) !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Interest Rate:</span>
                      <span className="font-medium">{selectedPlan.interestRate}% monthly</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600 font-medium">Daily Payment:</span>
                        <span className="font-bold text-lg text-red-600">
                          {formatCurrency(amortizationSchedule[0]?.payment || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Interest:</span>
                        <span className="font-medium">
                          {formatCurrency(
                            amortizationSchedule.reduce((sum, payment) => sum + payment.interest, 0)
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 font-medium">Total Repayment:</span>
                        <span className="font-bold">
                          {formatCurrency(
                            amortizationSchedule.reduce((sum, payment) => sum + payment.payment, 0)
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Days:</span>
                        <span className="font-medium">{amortizationSchedule.length} days</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Amortization Schedule Summary with Pagination */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Payment Schedule Overview</h3>
                  <div className="mb-3 text-sm text-gray-600">
                    Showing {currentPayments.length} of {amortizationSchedule.length} daily payments
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-2 font-medium text-gray-700">Day</th>
                          <th className="text-left py-2 px-2 font-medium text-gray-700">Date</th>
                          <th className="text-right py-2 px-2 font-medium text-gray-700">Payment</th>
                          <th className="text-right py-2 px-2 font-medium text-gray-700">Principal</th>
                          <th className="text-right py-2 px-2 font-medium text-gray-700">Interest</th>
                          <th className="text-right py-2 px-2 font-medium text-gray-700">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentPayments.map((payment) => (
                          <tr key={payment.period} className="border-b border-gray-100 hover:bg-gray-100">
                            <td className="py-2 px-2">{payment.period}</td>
                            <td className="py-2 px-2">{formatDate(payment.date)}</td>
                            <td className="py-2 px-2 text-right font-medium">
                              {formatCurrency(payment.payment)}
                            </td>
                            <td className="py-2 px-2 text-right">
                              {formatCurrency(payment.principal)}
                            </td>
                            <td className="py-2 px-2 text-right">
                              {formatCurrency(payment.interest)}
                            </td>
                            <td className="py-2 px-2 text-right">
                              {formatCurrency(payment.remainingBalance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-gray-600">
                        Page {currentPage} of {totalPages}
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => goToPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          Previous
                        </button>
                        
                        {/* Page numbers */}
                        {[...Array(totalPages)].map((_, index) => {
                          const pageNumber = index + 1;
                          // Show first, last, current, and nearby pages
                          if (
                            pageNumber === 1 ||
                            pageNumber === totalPages ||
                            (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                          ) {
                            return (
                              <button
                                key={pageNumber}
                                onClick={() => goToPage(pageNumber)}
                                className={`px-3 py-1 text-sm border rounded-md ${
                                  currentPage === pageNumber 
                                    ? 'bg-red-600 text-white border-red-600' 
                                    : 'border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {pageNumber}
                              </button>
                            );
                          }
                          // Show ellipsis for gaps
                          if (pageNumber === currentPage - 2 || pageNumber === currentPage + 2) {
                            return (
                              <span key={pageNumber} className="px-2 py-1 text-sm text-gray-500">
                                ...
                              </span>
                            );
                          }
                          return null;
                        })}
                        
                        <button
                          onClick={() => goToPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Verification Message */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Important Notice</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        By clicking &quot;Confirm Application&quot;, you acknowledge that you have reviewed the loan details
                        and amortization schedule above. You agree to repay the loan according to the terms specified.
                        This application will be submitted for review and approval by the cooperative management.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowVerification(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back to Edit
                </button>
                <button
                  type="button"
                  onClick={handleConfirmApplication}
                  disabled={loading}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
                >
                  {loading && (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {loading ? 'Submitting...' : 'Confirm Application'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
