'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { LoanPlan } from '@/lib/types/loan';

interface LoanActionsProps {
  loanPlans?: LoanPlan[];
  onLoanApplied?: () => void;
}

export default function LoanActions({ loanPlans = [], onLoanApplied }: LoanActionsProps) {
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<LoanPlan | null>(null);
  const [amount, setAmount] = useState('');
  const [term, setTerm] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [amortizationSchedule, setAmortizationSchedule] = useState<Array<{
    month: number;
    payment: number;
    principal: number;
    interest: number;
    remainingBalance: number;
  }>>([]);
  const [loading, setLoading] = useState(false);

  const handleApplyClick = (plan: LoanPlan) => {
    setSelectedPlan(plan);
    setAmount(plan.maxAmount.toString());
    setTerm(plan.termOptions[0]?.toString() || '1');
  };

  // Calculate amortization schedule
  const calculateAmortization = (principal: number, annualInterestRate: number, termMonths: number) => {
    const monthlyInterestRate = annualInterestRate / 100 / 12;
    const numberOfPayments = termMonths;
    
    // Calculate monthly payment using standard loan formula
    const monthlyPayment = principal * 
      (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) / 
      (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);
    
    const schedule = [];
    let remainingBalance = principal;
    
    for (let month = 1; month <= termMonths; month++) {
      const interestPayment = remainingBalance * monthlyInterestRate;
      const principalPayment = monthlyPayment - interestPayment;
      remainingBalance -= principalPayment;
      
      // Ensure remaining balance doesn't go negative due to rounding
      if (remainingBalance < 0) remainingBalance = 0;
      
      schedule.push({
        month,
        payment: monthlyPayment,
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
    
    // Calculate and show amortization schedule
    const schedule = calculateAmortization(amountValue, selectedPlan.interestRate, termValue);
    setAmortizationSchedule(schedule);
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
        // Reset all forms and close modals
        setSelectedPlan(null);
        setAmount('');
        setTerm('');
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

  return (
    <div className="space-y-6">
      {/* Loan Plans Section */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Available Loan Plans</h2>
        
        {loanPlans.length === 0 ? (
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
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="amount">
                    Loan Amount (PHP)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                      ₱
                    </span>
                    <input
                      id="amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-8 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="Enter loan amount"
                      min="1"
                      max={selectedPlan.maxAmount}
                      step="1"
                      required
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Max: {formatCurrency(selectedPlan.maxAmount)}
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="term">
                    Loan Term
                  </label>
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
                      <span className="font-medium">{selectedPlan.interestRate}% annually</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600 font-medium">Monthly Payment:</span>
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
                    </div>
                  </div>
                </div>

                {/* Amortization Schedule Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Payment Schedule Overview</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-2 font-medium text-gray-700">Month</th>
                          <th className="text-right py-2 px-2 font-medium text-gray-700">Payment</th>
                          <th className="text-right py-2 px-2 font-medium text-gray-700">Principal</th>
                          <th className="text-right py-2 px-2 font-medium text-gray-700">Interest</th>
                          <th className="text-right py-2 px-2 font-medium text-gray-700">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {amortizationSchedule.slice(0, 5).map((payment) => (
                          <tr key={payment.month} className="border-b border-gray-100 hover:bg-gray-100">
                            <td className="py-2 px-2">{payment.month}</td>
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
                        {amortizationSchedule.length > 5 && (
                          <tr>
                            <td colSpan={5} className="py-2 px-2 text-center text-gray-500 italic">
                              ... and {amortizationSchedule.length - 5} more payments
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
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