'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { firestore, db } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { LoanPlan } from '@/lib/types/loan';
import { LoanActions } from '@/components';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

// Type definition for loan tabs
type LoanTab = 'applications' | 'active' | 'completed';

export default function LoanPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [loanPlans, setLoanPlans] = useState<LoanPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [hasActiveLoan, setHasActiveLoan] = useState(false);
  const [hasPendingLoan, setHasPendingLoan] = useState(false);
  const [activeLoanCheckLoading, setActiveLoanCheckLoading] = useState(true);
  
  // State for availed loans table
  const [availedLoans, setAvailedLoans] = useState<any[]>([]);
  const [availedLoansLoading, setAvailedLoansLoading] = useState(true);
  const [selectedLoanPlanId, setSelectedLoanPlanId] = useState<string>('');
  const [showPlanDetails, setShowPlanDetails] = useState(false);
  
  // Tab state for loan records
  const [activeTab, setActiveTab] = useState<LoanTab>('applications');
  
  // State for active and completed loans
  const [activeLoans, setActiveLoans] = useState<any[]>([]);
  const [completedLoansList, setCompletedLoansList] = useState<any[]>([]);
  const [loansLoading, setLoansLoading] = useState(true);
  
  // Pagination state for active and completed loans
  const [activeLoansPage, setActiveLoansPage] = useState(1);
  const [completedLoansPage, setCompletedLoansPage] = useState(1);

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

  // Real-time listener for active loans and pending loan requests
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

    // Set up real-time listener for pending loan requests
    const pendingLoansQuery = query(
      collection(db, 'loanRequests'),
      where('userId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribeLoans = onSnapshot(loansQuery, (snapshot) => {
      const hasActive = !snapshot.empty;
      setHasActiveLoan(hasActive);
    }, (error) => {
      console.error('Error listening to active loans:', error);
      setHasActiveLoan(false);
    });

    const unsubscribePending = onSnapshot(pendingLoansQuery, (snapshot) => {
      const hasPending = !snapshot.empty;
      setHasPendingLoan(hasPending);
      setActiveLoanCheckLoading(false);
    }, (error) => {
      console.error('Error listening to pending loan requests:', error);
      setHasPendingLoan(false);
      setActiveLoanCheckLoading(false);
    });

    // Clean up listeners on unmount
    return () => {
      unsubscribeLoans();
      unsubscribePending();
    };
  }, [user]);

  // Real-time listener for all loans (active and completed) for tabs
  useEffect(() => {
    if (!user?.uid || !db) {
      setLoansLoading(false);
      return;
    }

    setLoansLoading(true);

    const loansQuery = query(
      collection(db, 'loans'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(loansQuery, (snapshot) => {
      const activeData: any[] = [];
      const completedData: any[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const loanData = {
          id: doc.id,
          ...data
        };
        
        if (data.status === 'active' || data.status === 'approved') {
          activeData.push(loanData);
        } else if (data.status === 'completed' || data.status === 'paid') {
          completedData.push(loanData);
        }
      });
      
      setActiveLoans(activeData);
      setCompletedLoansList(completedData);
      setLoansLoading(false);
    }, (error) => {
      console.error('Error listening to loans:', error);
      setLoansLoading(false);
    });

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
      case 'approved':
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

  // Fetch loan applications (all loan requests by the user)
  useEffect(() => {
    if (!user?.uid || !db) {
      setAvailedLoansLoading(false);
      return;
    }

    setAvailedLoansLoading(true);

    const loanRequestsQuery = query(
      collection(db, 'loanRequests'),
      where('userId', '==', user.uid)
    );
    
    const unsubscribe = onSnapshot(loanRequestsQuery, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAvailedLoans(requests);
      setAvailedLoansLoading(false);
    }, (error) => {
      console.error('Error fetching loan applications:', error);
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

  // State for viewing loan details
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [showLoanDetails, setShowLoanDetails] = useState(false);

  // Pagination state for My Loan Applications table
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  // Handle view loan details
  const handleViewLoanDetails = (loan: any) => {
    setSelectedLoan(loan);
    setShowLoanDetails(true);
  };

  // Close loan details modal
  const handleCloseLoanDetails = () => {
    setShowLoanDetails(false);
    setSelectedLoan(null);
  };

  if (loading || activeLoanCheckLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-gray-800">Loan Services</h1>
      
      {/* Warning Message for Active/Pending Loans */}
      {(hasActiveLoan || hasPendingLoan) && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <h3 className="text-sm font-medium text-yellow-800">Loan Application Unavailable</h3>
              <div className="mt-2 text-xs sm:text-sm text-yellow-700">
                <p>
                  You cannot apply for a new loan at this time because you have 
                  {hasActiveLoan && hasPendingLoan 
                    ? ' an active loan and a pending loan application' 
                    : hasActiveLoan 
                      ? ' an active loan' 
                      : ' a pending loan application'}.
                  You can apply again once your {hasActiveLoan ? 'active loan is fully paid off' : 'pending application is reviewed'} 
                  {hasActiveLoan && hasPendingLoan ? ' or if your pending application is rejected' : ''}.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Available Loan Plans Dropdown */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-200">
        <label className="block text-gray-900 text-sm font-semibold mb-3">
          Available Loan Plans
        </label>
        <div className="relative">
          <select
            value={selectedLoanPlanId}
            onChange={(e) => handleLoanPlanSelect(e.target.value)}
            className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100 disabled:text-gray-500 text-gray-900 text-sm sm:text-base font-medium bg-white appearance-none cursor-pointer"
            disabled={hasActiveLoan || hasPendingLoan || plansLoading}
          >
            <option value="" className="text-gray-500">
              {plansLoading 
                ? 'Loading loan plans...' 
                : hasActiveLoan || hasPendingLoan
                  ? 'Loan application unavailable' 
                  : '-- Select a loan plan --'
              }
            </option>
            {loanPlans.map((plan) => (
              <option key={plan.id} value={plan.id} className="text-gray-900">
                {plan.name}
              </option>
            ))}
          </select>
          {/* Custom dropdown arrow */}
          <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
            <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-gray-600 mt-3 font-medium">
          {hasActiveLoan || hasPendingLoan
            ? 'You cannot apply for a new loan while you have an active loan or pending application.'
            : 'Choose a loan plan above to view details and apply'
          }
        </p>
      </div>

      {/* Loan Plan Details Card */}
      {showPlanDetails && selectedPlan && !hasActiveLoan && !hasPendingLoan && (
        <div className="bg-white rounded-lg shadow-lg p-5 sm:p-6 mb-6 sm:mb-8 border-2 border-red-200">
          <div className="flex justify-between items-start mb-5">
            <div className="flex-1 min-w-0 pr-4">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{selectedPlan.name}</h2>
              <p className="text-sm sm:text-base text-gray-700 mt-2 leading-relaxed">{selectedPlan.description}</p>
            </div>
            <button
              onClick={() => {
                setShowPlanDetails(false);
                setSelectedLoanPlanId('');
              }}
              className="text-gray-500 hover:text-gray-700 flex-shrink-0 p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5 sm:mb-6">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Maximum Amount</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(selectedPlan.maxAmount)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Interest Rate</p>
              <p className="text-xl font-bold text-gray-900">{selectedPlan.interestRate}%</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Term Options</p>
              <p className="text-xl font-bold text-gray-900">{selectedPlan.termOptions.join(', ')} month{selectedPlan.termOptions.length > 1 || selectedPlan.termOptions[0] !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleApplyLoan}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-sm sm:text-base shadow-md hover:shadow-lg"
            >
              Apply for this Loan
            </button>
          </div>
        </div>
      )}

      {/* Loan Records Container with Tabs */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
        {/* Tabs Header */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('applications')}
              className={`py-4 px-6 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'applications'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Loan Applications
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`py-4 px-6 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'active'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Active Loans
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`py-4 px-6 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'completed'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Completed Loans
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="overflow-x-auto">
          {/* My Loan Applications Tab */}
          {activeTab === 'applications' && (
            <>
              {availedLoansLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600 mx-auto"></div>
                  <p className="mt-2 text-gray-500">Loading applications...</p>
                </div>
              ) : availedLoans.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>No loan applications yet</p>
                </div>
              ) : (
                <>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Loan ID
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                          Plan
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                          Date
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {availedLoans
                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                        .map((loan) => (
                        <tr key={loan.id} className="hover:bg-gray-50">
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                            <div className="truncate max-w-[80px] sm:max-w-[120px]">{loan.loanId || loan.id}</div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 hidden sm:table-cell">
                            {loan.planName || 'General Loan'}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                            {formatCurrency(loan.amount)}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLoanStatusBadgeClass(loan.status)}`}>
                              {loan.status?.charAt(0).toUpperCase() + loan.status?.slice(1)}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden md:table-cell">
                            {loan.createdAt ? new Date(loan.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                            <button
                              onClick={() => handleViewLoanDetails(loan)}
                              className="px-2 sm:px-4 py-1.5 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-xs sm:text-sm"
                            >
                              <span className="hidden sm:inline">View Details</span>
                              <span className="sm:hidden">View</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* Pagination */}
                  {availedLoans.length > itemsPerPage && (
                    <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-xs sm:text-sm text-gray-700 font-medium">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, availedLoans.length)} of {availedLoans.length} entries
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:text-gray-400"
                        >
                          Previous
                        </button>
                        {Array.from({ length: Math.ceil(availedLoans.length / itemsPerPage) }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg ${
                              currentPage === page
                                ? 'bg-red-600 text-white'
                                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(Math.ceil(availedLoans.length / itemsPerPage), prev + 1))}
                          disabled={currentPage === Math.ceil(availedLoans.length / itemsPerPage)}
                          className="px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:text-gray-400"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Active Loans Tab */}
          {activeTab === 'active' && (
            <>
              {loansLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600 mx-auto"></div>
                  <p className="mt-2 text-gray-500">Loading active loans...</p>
                </div>
              ) : activeLoans.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>You don&apos;t have any active loans at the moment.</p>
                </div>
              ) : (
                <>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Loan ID
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                          Loan Plan
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Principal Amount
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                          Interest Rate
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                          Loan Term
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {activeLoans
                        .slice((activeLoansPage - 1) * itemsPerPage, activeLoansPage * itemsPerPage)
                        .map((loan) => (
                        <tr key={loan.id} className="hover:bg-gray-50">
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                            {loan.loanId || loan.id}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 hidden sm:table-cell">
                            {loan.planName || 'Active Loan'}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                            {formatCurrency(loan.amount)}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden md:table-cell">
                            {loan.interest}%
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden md:table-cell">
                            {loan.term} months
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
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
                  
                  {/* Pagination for Active Loans */}
                  {activeLoans.length > itemsPerPage && (
                    <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-xs sm:text-sm text-gray-700 font-medium">
                        Showing {((activeLoansPage - 1) * itemsPerPage) + 1} to {Math.min(activeLoansPage * itemsPerPage, activeLoans.length)} of {activeLoans.length} entries
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveLoansPage(prev => Math.max(1, prev - 1))}
                          disabled={activeLoansPage === 1}
                          className="px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:text-gray-400"
                        >
                          Previous
                        </button>
                        {Array.from({ length: Math.ceil(activeLoans.length / itemsPerPage) }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => setActiveLoansPage(page)}
                            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg ${
                              activeLoansPage === page
                                ? 'bg-red-600 text-white'
                                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                        <button
                          onClick={() => setActiveLoansPage(prev => Math.min(Math.ceil(activeLoans.length / itemsPerPage), prev + 1))}
                          disabled={activeLoansPage === Math.ceil(activeLoans.length / itemsPerPage)}
                          className="px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:text-gray-400"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Completed Loans Tab */}
          {activeTab === 'completed' && (
            <>
              {loansLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600 mx-auto"></div>
                  <p className="mt-2 text-gray-500">Loading completed loans...</p>
                </div>
              ) : completedLoansList.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>No completed loans yet</p>
                </div>
              ) : (
                <>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Loan ID
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                          Loan Plan
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Principal Amount
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                          Interest Rate
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                          Loan Term
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                          Total Paid
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {completedLoansList
                        .slice((completedLoansPage - 1) * itemsPerPage, completedLoansPage * itemsPerPage)
                        .map((loan) => (
                        <tr key={loan.id} className="hover:bg-gray-50">
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                            {loan.loanId || loan.id}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 hidden sm:table-cell">
                            {loan.planName || 'Loan'}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                            {formatCurrency(loan.amount)}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden md:table-cell">
                            {loan.interest}%
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden md:table-cell">
                            {loan.term} months
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900 hidden sm:table-cell">
                            {formatCurrency(loan.totalPaid || (loan.amount + (loan.amount * loan.interest / 100)))}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                              Completed
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* Pagination for Completed Loans */}
                  {completedLoansList.length > itemsPerPage && (
                    <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-xs sm:text-sm text-gray-700 font-medium">
                        Showing {((completedLoansPage - 1) * itemsPerPage) + 1} to {Math.min(completedLoansPage * itemsPerPage, completedLoansList.length)} of {completedLoansList.length} entries
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCompletedLoansPage(prev => Math.max(1, prev - 1))}
                          disabled={completedLoansPage === 1}
                          className="px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:text-gray-400"
                        >
                          Previous
                        </button>
                        {Array.from({ length: Math.ceil(completedLoansList.length / itemsPerPage) }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => setCompletedLoansPage(page)}
                            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg ${
                              completedLoansPage === page
                                ? 'bg-red-600 text-white'
                                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                        <button
                          onClick={() => setCompletedLoansPage(prev => Math.min(Math.ceil(completedLoansList.length / itemsPerPage), prev + 1))}
                          disabled={completedLoansPage === Math.ceil(completedLoansList.length / itemsPerPage)}
                          className="px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:text-gray-400"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Loan Application Details Modal */}
      {showLoanDetails && selectedLoan && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="p-5 sm:p-6">
              <div className="flex justify-between items-start mb-5 sm:mb-6 pb-4 border-b border-gray-200">
                <div className="flex-1 min-w-0 pr-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Loan Application Details</h2>
                  <p className="text-sm sm:text-base text-gray-700 mt-2 font-medium">Loan ID: <span className="text-gray-900">{selectedLoan.loanId || selectedLoan.id}</span></p>
                </div>
                <button
                  onClick={handleCloseLoanDetails}
                  className="text-gray-500 hover:text-gray-700 flex-shrink-0 p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 sm:mb-6">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Loan Plan</p>
                  <p className="text-base sm:text-lg font-bold text-gray-900">{selectedLoan.planName || 'General Loan'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Loan Amount</p>
                  <p className="text-base sm:text-lg font-bold text-gray-900">{formatCurrency(selectedLoan.amount)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Term</p>
                  <p className="text-base sm:text-lg font-bold text-gray-900">{selectedLoan.term} months</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Status</p>
                  <span className={`inline-block px-3 py-1.5 rounded-full text-sm font-bold ${getLoanStatusBadgeClass(selectedLoan.status)}`}>
                    {selectedLoan.status?.charAt(0).toUpperCase() + selectedLoan.status?.slice(1)}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Date Applied</p>
                  <p className="text-base sm:text-lg font-bold text-gray-900">
                    {selectedLoan.createdAt ? new Date(selectedLoan.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Applicant Name</p>
                  <p className="text-base sm:text-lg font-bold text-gray-900 truncate">{selectedLoan.fullName || selectedLoan.userName || 'N/A'}</p>
                </div>
              </div>

              {selectedLoan.description && (
                <div className="bg-gray-50 rounded-lg p-4 mb-5 sm:mb-6 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Description</p>
                  <p className="text-sm sm:text-base text-gray-900 leading-relaxed">{selectedLoan.description}</p>
                </div>
              )}

              {selectedLoan.rejectionReason && (
                <div className="bg-red-50 rounded-lg p-4 mb-5 sm:mb-6 border border-red-200">
                  <p className="text-xs font-semibold text-red-700 mb-2 uppercase tracking-wide">Rejection Reason</p>
                  <p className="text-sm sm:text-base text-red-900 leading-relaxed">{selectedLoan.rejectionReason}</p>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                  onClick={handleCloseLoanDetails}
                  className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors font-semibold text-sm sm:text-base shadow-md hover:shadow-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Use the new LoanActions component */}
      <LoanActions 
        loanPlans={loanPlans} 
        onLoanApplied={handleLoanApplied}
        hasActiveLoan={hasActiveLoan || hasPendingLoan}
      />
    </div>
  );
}