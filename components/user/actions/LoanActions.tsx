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
  const [loading, setLoading] = useState(false);

  const handleApplyClick = (plan: LoanPlan) => {
    setSelectedPlan(plan);
    setAmount(plan.maxAmount.toString());
    setTerm(plan.termOptions[0]?.toString() || '1');
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
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

      // Create loan request document with user info
      const loanRequest = {
        userId: user?.uid,
        userName: user?.displayName || '',
        email: user?.email || '',
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        amount: amountValue,
        term: termValue,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      // Save to Firestore
      const result = await firestore.setDocument(
        'loanRequests',
        `${user?.uid}-${selectedPlan.id}-${Date.now()}`,
        loanRequest
      );

      if (result.success) {
        toast.success('Loan application submitted!');
        // Reset form
        setSelectedPlan(null);
        setAmount('');
        setTerm('');
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
                    disabled={loading}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}