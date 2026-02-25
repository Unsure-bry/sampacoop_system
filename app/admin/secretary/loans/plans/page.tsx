'use client';

import { useState, useEffect } from 'react';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { LoanPlan } from '@/lib/types/loan';
import AddLoanPlanModal from '@/components/admin/AddLoanPlanModal';

export default function SecretaryLoanPlansPage() {
  const [loanPlans, setLoanPlans] = useState<LoanPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<LoanPlan | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<LoanPlan | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<LoanPlan | null>(null);

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
    setEditingPlan(null);
  };

  const handleEditPlan = (plan: LoanPlan) => {
    setEditingPlan(plan);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPlan(null);
  };

  const handlePlanSelect = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = loanPlans.find(p => p.id === planId) || null;
    setSelectedPlan(plan);
  };

  const handleEditSelectedPlan = () => {
    if (selectedPlan) {
      setEditingPlan(selectedPlan);
      setIsModalOpen(true);
    }
  };

  const handleDeleteClick = (plan: LoanPlan) => {
    setPlanToDelete(plan);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!planToDelete) return;
    
    try {
      const result = await firestore.deleteDocument('loanPlans', planToDelete.id);
      
      if (result.success) {
        toast.success('Loan plan deleted successfully');
        fetchLoanPlans();
        if (selectedPlanId === planToDelete.id) {
          setSelectedPlanId('');
          setSelectedPlan(null);
        }
      } else {
        toast.error('Failed to delete loan plan');
      }
    } catch (error) {
      console.error('Error deleting loan plan:', error);
      toast.error('Failed to delete loan plan');
    } finally {
      setShowDeleteConfirm(false);
      setPlanToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setPlanToDelete(null);
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
          onClick={() => {
            setEditingPlan(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
        >
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Loan Plan
        </button>
      </div>
      
      {/* Loan Plan Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Available Loan Plans</h2>
          
        </div>
        
        {/* Dropdown Section */}
        <div className="p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
           
          </label>
          <div className="relative">
            <select
              value={selectedPlanId}
              onChange={(e) => handlePlanSelect(e.target.value)}
              className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 appearance-none bg-white cursor-pointer"
            >
              <option value="">Show Loan Plans...</option>
              {loanPlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
            {/* Custom dropdown arrow */}
            <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Selected Plan Details */}
        {selectedPlan && (
          <div className="border-t border-gray-200">
            <div className="p-6">
              {/* Plan Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{selectedPlan.name}</h3>
                  <p className="text-gray-600 mt-1">{selectedPlan.description}</p>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              </div>
              
              {/* Plan Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Maximum Amount</p>
                  <p className="text-lg font-semibold text-gray-800">{formatCurrency(selectedPlan.maxAmount)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Interest Rate</p>
                  <p className="text-lg font-semibold text-gray-800">{selectedPlan.interestRate}%</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Term Options</p>
                  <p className="text-lg font-semibold text-gray-800">{selectedPlan.termOptions.join(', ')} <span className="text-sm font-normal text-gray-500">months</span></p>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="mt-6 flex space-x-3">
                <button 
                  onClick={handleEditSelectedPlan}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Edit Plan
                </button>
                <button 
                  onClick={() => handleDeleteClick(selectedPlan)}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Delete Plan
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Empty State */}
        {!selectedPlan && (
          <div className="border-t border-gray-200 p-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
              <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-500">Select a loan plan from the dropdown to view details</p>
          </div>
        )}
      </div>
      
      <AddLoanPlanModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        onPlanAdded={handlePlanAdded} 
        editingPlan={editingPlan}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && planToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Confirm Delete</h2>
                <button 
                  onClick={handleDeleteCancel}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-600">
                  Are you sure you want to delete the loan plan <strong>&quot;{planToDelete.name}&quot;</strong>?
                </p>
                <p className="text-sm text-red-600 mt-2">
                  This action cannot be undone.
                </p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleDeleteCancel}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteConfirm}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
