'use client';

import { useState, useEffect } from 'react';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { LoanPlan } from '@/lib/types/loan';

export default function LoanPlansPage() {
  const [loanPlans, setLoanPlans] = useState<LoanPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    maxAmount: '',
    interestRate: '',
    termOptions: ''
  });

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Parse term options
      const termOptions = formData.termOptions
        .split(',')
        .map(option => parseInt(option.trim()))
        .filter(option => !isNaN(option));
      
      // Validate term options
      if (termOptions.length === 0) {
        toast.error('Please enter at least one term option');
        return;
      }
      
      // Create loan plan data
      const loanPlanData = {
        name: formData.name,
        description: formData.description,
        maxAmount: parseFloat(formData.maxAmount),
        interestRate: parseFloat(formData.interestRate),
        termOptions,
        createdAt: new Date().toISOString()
      };
      
      // Generate a slug for the document ID
      const slug = formData.name.toLowerCase().replace(/\s+/g, '-');
      
      // Save to Firestore
      const result = await firestore.setDocument('loanPlans', slug, loanPlanData);
      
      if (result.success) {
        toast.success('Loan plan added successfully!');
        // Reset form
        setFormData({
          name: '',
          description: '',
          maxAmount: '',
          interestRate: '',
          termOptions: ''
        });
        // Refresh loan plans
        fetchLoanPlans();
      } else {
        toast.error('Failed to add loan plan');
      }
    } catch (error) {
      console.error('Error adding loan plan:', error);
      toast.error('Failed to add loan plan');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
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
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Loan Plans</h1>
        <p className="text-gray-600">Manage available loan plans</p>
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
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Add New Loan Plan</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
              <input 
                type="text" 
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Enter plan name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea 
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Enter description"
                rows={2}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Amount (PHP)</label>
              <input 
                type="number" 
                name="maxAmount"
                value={formData.maxAmount}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Enter maximum amount"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%)</label>
              <input 
                type="number" 
                name="interestRate"
                value={formData.interestRate}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Enter interest rate"
                min="0"
                step="0.1"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Term Options (comma separated months)</label>
              <input 
                type="text" 
                name="termOptions"
                value={formData.termOptions}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="e.g., 1, 2, 3, 6, 12"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Enter comma-separated numbers representing months (e.g., 1, 2, 3, 6, 12)</p>
            </div>
          </div>
          <div className="mt-4">
            <button 
              type="submit"
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Add Plan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}