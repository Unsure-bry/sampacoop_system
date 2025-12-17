'use client';

import { useState, useEffect } from 'react';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { LoanPlan } from '@/lib/types/loan';
import AddLoanPlanModal from '@/components/admin/AddLoanPlanModal';

export default function LoanPlansPage() {
  const [loanPlans, setLoanPlans] = useState<LoanPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchLoanPlans();
  }, []);

  const fetchLoanPlans = async () => {
    try {
      setLoading(true);
      const result = await firestore.getCollection('loanPlans');
      
      if (result.success && result.data) {
        const plansData = result.data.map((doc: any) => ({
          id: doc.id,
          ...doc
        }));
        setLoanPlans(plansData);
      }
    } catch (error) {
      console.error('Error fetching loan plans:', error);
      toast.error('Failed to load loan plans');
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

  const handlePlanAdded = () => {
    // Refresh loan plans after a new plan is added
    fetchLoanPlans();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Loan Plans</h1>
          <p className="text-gray-600">Manage available loan plans</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Loan Plans</h1>
          <p className="text-gray-600">Manage available loan plans</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
        >
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Loan Plan
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loanPlans.map((plan) => (
          <div key={plan.id} className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">{plan.name}</h2>
            <p className="text-gray-600 mb-4">{plan.description}</p>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Maximum Amount:</span>
                <span className="font-medium">{formatCurrency(plan.maxAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Interest Rate:</span>
                <span className="font-medium">{plan.interestRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Term Options:</span>
                <span className="font-medium">{plan.termOptions.join(', ')} months</span>
              </div>
            </div>
            
            <div className="mt-6">
              <button className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                Edit Plan
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <AddLoanPlanModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onPlanAdded={handlePlanAdded} 
      />
    </div>
  );
}