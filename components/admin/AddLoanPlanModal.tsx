'use client';

import { useState } from 'react';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';

interface AddLoanPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlanAdded: () => void;
}

export default function AddLoanPlanModal({ isOpen, onClose, onPlanAdded }: AddLoanPlanModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    maxAmount: '',
    interestRate: '',
    termOptions: ''
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Parse term options
      const termOptions = formData.termOptions
        .split(',')
        .map(option => parseInt(option.trim()))
        .filter(option => !isNaN(option));
      
      // Validate term options
      if (termOptions.length === 0) {
        toast.error('Please enter at least one term option');
        setLoading(false);
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
        // Notify parent component and close modal
        onPlanAdded();
        onClose();
      } else {
        toast.error('Failed to add loan plan');
      }
    } catch (error) {
      console.error('Error adding loan plan:', error);
      toast.error('Failed to add loan plan');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Add New Loan Plan</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter description"
                  rows={3}
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Amount (PHP)</label>
                  <input 
                    type="number" 
                    name="maxAmount"
                    value={formData.maxAmount}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter interest rate"
                    min="0"
                    step="0.1"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Term Options (comma separated months)</label>
                <input 
                  type="text" 
                  name="termOptions"
                  value={formData.termOptions}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="e.g., 1, 2, 3, 6, 12"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Enter comma-separated numbers representing months (e.g., 1, 2, 3, 6, 12)</p>
              </div>
            </div>
            
            <div className="mt-8 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
                disabled={loading}
              >
                {loading && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {loading ? 'Adding...' : 'Add Plan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}