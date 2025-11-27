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
  paymentSchedule?: any[];
}

export default function ActiveLoans() {
  const { user } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      } else {
        // Handle case where query was successful but no data was found
        setLoans([]);
        if (result.error) {
          console.error('Query returned error:', result.error);
          setError('No active loans found');
        }
      }
    } catch (error: any) {
      console.error('Error fetching active loans:', error);
      setError(error.message || 'Failed to load active loans');
      toast.error('Failed to load active loans. Please try again later.');
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
        <div className="space-y-4">
          {loans.map((loan) => (
            <div key={loan.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-gray-800">Loan Details</h3>
                  <div className="mt-2 space-y-1 text-sm">
                    <p><span className="text-gray-600">Amount:</span> <span className="font-medium">{formatCurrency(loan.amount)}</span></p>
                    <p><span className="text-gray-600">Term:</span> <span className="font-medium">{loan.term} months</span></p>
                    <p><span className="text-gray-600">Interest Rate:</span> <span className="font-medium">{loan.interest}%</span></p>
                    <p><span className="text-gray-600">Start Date:</span> <span className="font-medium">{formatDate(loan.startDate)}</span></p>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-800">Payment Schedule</h3>
                  <div className="mt-2 text-sm">
                    <p className="text-gray-600">Monthly Payment: <span className="font-medium">
                      {formatCurrency(loan.amount * (1 + loan.interest / 100) / loan.term)}
                    </span></p>
                    <p className="text-gray-600">Next Payment: <span className="font-medium">
                      {loan.paymentSchedule && loan.paymentSchedule.length > 0 
                        ? formatDate(loan.paymentSchedule[0].dueDate) 
                        : 'N/A'}
                    </span></p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}