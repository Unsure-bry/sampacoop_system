'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { LoanPlan } from '@/lib/types/loan';
import { useRouter } from 'next/navigation';

interface LoanApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  loanPlan: LoanPlan | null;
}

export default function LoanApplicationModal({ isOpen, onClose, loanPlan }: LoanApplicationModalProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [term, setTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (loanPlan && isOpen) {
      // Set default values when modal opens
      setAmount('5000'); // Default to 5000 PHP
      setTerm(loanPlan.termOptions[0]?.toString() || '1');
    }
  }, [loanPlan, isOpen]);

  if (!isOpen || !loanPlan) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate inputs
      const amountValue = parseFloat(amount);
      const termValue = parseInt(term);

      if (isNaN(amountValue) || amountValue <= 0 || amountValue > loanPlan.maxAmount) {
        toast.error(`Please select a valid loan amount (maximum ${loanPlan.maxAmount})`);
        setLoading(false);
        return;
      }

      if (isNaN(termValue) || termValue <= 0 || !loanPlan.termOptions.includes(termValue)) {
        toast.error('Please select a valid loan term');
        setLoading(false);
        return;
      }



      // Create loan request document with user info
      const loanRequest = {
        userId: user?.uid || '',
        userName: user?.displayName || '',
        email: user?.email || '',
        planId: loanPlan.id,
        planName: loanPlan.name,
        amount: amountValue,
        term: termValue,
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      };

      // Save to Firestore with error handling
      const result = await firestore.setDocument(
        'loanRequests',
        `${user?.uid}-${loanPlan.id}-${Date.now()}`,
        loanRequest
      );
      
      if (!result.success) {
        console.error('Error saving loan request:', result.error);
        toast.error(result.error || 'Failed to submit loan request. Please try again.');
        return;
      }
      
      if (result.success) {
        toast.success('Loan application submitted!');
        // Reset form and close modal
        setAmount('5000'); // Reset to default amount
        setTerm(loanPlan.termOptions[0]?.toString() || '1'); // Reset to default term
        // Close modal and optionally navigate to active loans
        onClose();
        // Optionally, we could navigate to the active loans page:
        // router.push('/loan');
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Apply for {loanPlan.name}</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-600 text-sm">{loanPlan.description}</p>
            <div className="mt-2 flex justify-between">
              <span className="text-gray-600">Maximum Amount:</span>
              <span className="font-medium">{formatCurrency(loanPlan.maxAmount)}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
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
              {loanPlan.termOptions.length > 1 ? (
                <select
                  id="term"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  required
                >
                  {loanPlan.termOptions.map((option) => (
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
                onClick={onClose}
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
  );
}