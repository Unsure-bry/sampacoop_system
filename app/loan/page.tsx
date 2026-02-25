'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { firestore, db } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { LoanPlan } from '@/lib/types/loan';
import { ActiveLoans, LoanActions } from '@/components';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export default function LoanPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [loanPlans, setLoanPlans] = useState<LoanPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [hasActiveLoan, setHasActiveLoan] = useState(false);
  const [activeLoanCheckLoading, setActiveLoanCheckLoading] = useState(true);
  
  // State for availed loans table
  const [availedLoans, setAvailedLoans] = useState<any[]>([]);
  const [availedLoansLoading, setAvailedLoansLoading] = useState(true);
  const [selectedLoanPlanId, setSelectedLoanPlanId] = useState<string>('');
  const [showPlanDetails, setShowPlanDetails] = useState(false);

  // Remove the redirect effect - middleware handles authentication
  // useEffect(() => {
  //   if (!loading && !user) {
  //     router.push('/login');
  //   }
  // }, [user, loading, router]);

  useEffect(() => {
    if (user && !loading) {
      fetchLoanPlans();
    }
  }, [user, loading]);

  // Real-time listener for active loans
  useEffect(() => {
    if (!user?.uid || !db) {
      setActiveLoanCheckLoading(false);
      return;
    }

    setActiveLoanCheckLoading(true);

    // Set up real-time listener for active loans
    const loansQuery = query(
      collection(db, 'loans'),
      where('userId', '==', user.uid),
      where('status', '==', 'active')
    );

    const unsubscribe = onSnapshot(loansQuery, (snapshot) => {
      const hasActive = !snapshot.empty;
      setHasActiveLoan(hasActive);
      setActiveLoanCheckLoading(false);
    }, (error) => {
      console.error('Error listening to active loans:', error);
      setHasActiveLoan(false);
      setActiveLoanCheckLoading(false);
    });

    // Clean up listener on unmount
    return () => unsubscribe();
  }, [user]);

  const fetchLoanPlans = async () => {
    try {
      setPlansLoading(true);
      
      // Check if Firestore is initialized
      if (!firestore) {
        throw new Error('Firestore not initialized');
      }
      
      const result = await firestore.getCollection('loanPlans');
      
      if (result.success && result.data) {
        if (result.data.length === 0) {
          // Create sample loan plans if none exist
          await createSampleLoanPlans();
          // Fetch again after creating sample plans
          const newResult = await firestore.getCollection('loanPlans');
          if (newResult.success && newResult.data) {
            const plansData = newResult.data.map((doc: any) => ({
              id: doc.id,
              ...doc
            }));
            setLoanPlans(plansData);
          }
        } else {
          const plansData = result.data.map((doc: any) => ({
            id: doc.id,
            ...doc
          }));
          setLoanPlans(plansData);
        }
      } else {
        console.error('Failed to load loan plans:', result.error);
        toast.error('Failed to load loan plans. Please try again later.');
      }
    } catch (error: any) {
      console.error('Error fetching loan plans:', error);
      toast.error(`Failed to load loan plans: ${error.message || 'Unknown error'}`);
    } finally {
      setPlansLoading(false);
    }
  };

  const createSampleLoanPlans = async () => {
    try {
     
      const samplePlans = [
        {
          name: 'Regular Loan',
          description: 'Flexible loans for personal needs with competitive rates',
          maxAmount: 5000,
          interestRate: 3,
          termOptions: [1, 2],
        },
        {
          name: 'Emergency Loan',
          description: 'Quick access to funds for unexpected expenses',
          maxAmount: 3000,
          interestRate: 3,
          termOptions: [1, 2],
        }
      ];

      // Create each sample plan
      for (const plan of samplePlans) {
        await firestore.setDocument(
          'loanPlans',
          plan.name.toLowerCase().replace(/\s+/g, '-'),
          plan
        );
      }
      
      toast.success('Sample loan plans created successfully!');
    } catch (error) {
      console.error('Error creating sample loan plans:', error);
      toast.error('Failed to create sample loan plans');
    }
  };

  const handleLoanApplied = () => {
    // Refresh loan plans or show success message
    toast.success('Loan application submitted successfully!');
    // Active loan status is now automatically updated via real-time listener
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Get status badge class
  const getLoanStatusBadgeClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Fetch availed loans (all loans by the user)
  useEffect(() => {
    if (!user?.uid || !db) {
      setAvailedLoansLoading(false);
      return;
    }

    setAvailedLoansLoading(true);

    const loansQuery = query(
      collection(db, 'loans'),
      where('userId', '==', user.uid)
    );
    
    const unsubscribe = onSnapshot(loansQuery, (snapshot) => {
      const loans = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAvailedLoans(loans);
      setAvailedLoansLoading(false);
    }, (error) => {
      console.error('Error fetching availed loans:', error);
      setAvailedLoansLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Handle loan plan selection from dropdown
  const handleLoanPlanSelect = (planId: string) => {
    setSelectedLoanPlanId(planId);
    if (planId) {
      setShowPlanDetails(true);
    } else {
      setShowPlanDetails(false);
    }
  };

  // Get selected plan details
  const selectedPlan = loanPlans.find(p => p.id === selectedLoanPlanId);

  // Handle apply loan click
  const handleApplyLoan = () => {
    if (selectedPlan) {
      // Trigger the LoanActions component to open with this plan
      const event = new CustomEvent('selectLoanPlan', { detail: selectedPlan });
      window.dispatchEvent(event);
    }
  };

  if (loading || activeLoanCheckLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Loan Services</h1>
      
      {/* Available Loan Plans Dropdown */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <label className="block text-gray-700 text-sm font-medium mb-2">
          Available Loan Plans
        </label>
        <select
          value={selectedLoanPlanId}
          onChange={(e) => handleLoanPlanSelect(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          disabled={hasActiveLoan || plansLoading}
        >
          <option value="">
            {plansLoading 
              ? 'Loading loan plans...' 
              : hasActiveLoan 
                ? 'You have an active loan - cannot apply for new loan' 
                : 'Select a loan plan'
            }
          </option>
          {loanPlans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name}
            </option>
          ))}
        </select>
        <p className="text-sm text-gray-500 mt-2">
          {hasActiveLoan 
            ? 'You currently have an active loan. Please complete it before applying for a new one.'
            : 'Select a loan plan to view details and apply'
          }
        </p>
      </div>

      {/* Loan Plan Details Card */}
      {showPlanDetails && selectedPlan && !hasActiveLoan && (
        <div className="bg-white rounded-lg shadow p-6 mb-8 border-l-4 border-red-600">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{selectedPlan.name}</h2>
              <p className="text-gray-600 mt-1">{selectedPlan.description}</p>
            </div>
            <button
              onClick={() => {
                setShowPlanDetails(false);
                setSelectedLoanPlanId('');
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Maximum Amount</p>
              <p className="text-xl font-bold text-gray-800">{formatCurrency(selectedPlan.maxAmount)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Interest Rate</p>
              <p className="text-xl font-bold text-gray-800">{selectedPlan.interestRate}%</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Term Options</p>
              <p className="text-xl font-bold text-gray-800">{selectedPlan.termOptions.join(', ')} month{selectedPlan.termOptions.length > 1 || selectedPlan.termOptions[0] !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleApplyLoan}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Apply for this Loan
            </button>
          </div>
        </div>
      )}

      {/* Availed Loans Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-800">My Availed Loans</h3>
        </div>
        <div className="overflow-x-auto">
          {availedLoansLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading loans...</p>
            </div>
          ) : availedLoans.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No loans availed yet</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Loan Plan
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.from(new Set(availedLoans.map(loan => loan.planName).filter(Boolean))).map((planName) => (
                  <tr key={planName} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {planName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
      {/* Use the new LoanActions component */}
      <LoanActions 
        loanPlans={loanPlans} 
        onLoanApplied={handleLoanApplied}
        hasActiveLoan={hasActiveLoan}
      />
      
      <div className="mt-8">
        <ActiveLoans />
      </div>
    </div>
  );
}