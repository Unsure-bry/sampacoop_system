'use client';

import { useState } from 'react';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { toast } from 'react-hot-toast';

interface AddSavingsTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSavings: (data: { type: 'deposit' | 'withdrawal', amount: number, date: string, remarks: string, depositControlNumber?: string }) => Promise<boolean>;
  currentBalance: number;
}

export default function AddSavingsTransactionModal({ isOpen, onClose, onAddSavings, currentBalance }: AddSavingsTransactionModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    type: 'deposit' as 'deposit' | 'withdrawal',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    remarks: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [depositControlNumber, setDepositControlNumber] = useState('');
  const [transactionData, setTransactionData] = useState<any>(null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.amount) {
      newErrors.amount = 'Amount is required';
    } else {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        newErrors.amount = 'Amount must be a positive number';
      }
      
      // Check if withdrawal amount exceeds current balance
      if (formData.type === 'withdrawal' && amount > currentBalance) {
        newErrors.amount = `Withdrawal amount cannot exceed current balance of ₱${currentBalance.toFixed(2)}`;
      }
    }
    
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Generate deposit control number for deposits in SMP-YYYYMMDD-0000 format
    if (formData.type === 'deposit') {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD format
      const timestamp = Date.now();
      const sequential = (timestamp % 10000).toString().padStart(4, '0');
      const newDepositControlNumber = `SMP-${dateStr}-${sequential}`;
      setDepositControlNumber(newDepositControlNumber);
      
      // Store transaction data for confirmation
      const data = {
        type: formData.type,
        amount: parseFloat(formData.amount),
        date: formData.date,
        remarks: formData.remarks,
        depositControlNumber: newDepositControlNumber
      };
      
      setTransactionData(data);
      setShowConfirmation(true);
    } else {
      // For withdrawals, proceed directly
      setLoading(true);
      
      const success = await onAddSavings({
        type: formData.type,
        amount: parseFloat(formData.amount),
        date: formData.date,
        remarks: formData.remarks
      });
      
      setLoading(false);
      
      if (success) {
        // Reset form
        setFormData({
          type: 'deposit',
          amount: '',
          date: new Date().toISOString().split('T')[0],
          remarks: ''
        });
        onClose();
      }
    }
  };
  
  const handleConfirmTransaction = async () => {
    if (!transactionData) return;
    
    setLoading(true);
    
    const success = await onAddSavings(transactionData);
    
    setLoading(false);
    
    if (success) {
      // Reset form and states
      setFormData({
        type: 'deposit',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        remarks: ''
      });
      setTransactionData(null);
      setShowConfirmation(false);
      setDepositControlNumber('');
      onClose();
      
      toast.success('Transaction confirmed successfully!');
    }
  };
  
  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
    setDepositControlNumber('');
    setTransactionData(null);
  };

  if (!isOpen) return null;

  // Show confirmation view
  if (showConfirmation && transactionData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Confirm Savings Transaction</h2>
              <button 
                onClick={handleCancelConfirmation}
                className="text-gray-500 hover:text-gray-700"
                disabled={loading}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-2">Transaction Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium capitalize">{transactionData.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-medium">₱{parseFloat(transactionData.amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">{transactionData.date}</span>
                  </div>
                  {transactionData.remarks && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Remarks:</span>
                      <span className="font-medium">{transactionData.remarks}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {transactionData.depositControlNumber && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-800 mb-2">Deposit Control Number</h3>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-700 tracking-wider">
                      {transactionData.depositControlNumber}
                    </div>
                    <p className="text-sm text-green-600 mt-1">Please save this number for your records</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancelConfirmation}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmTransaction}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Confirming...
                  </>
                ) : (
                  'Confirm Transaction'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show main form
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Add Savings Transaction</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              disabled={loading}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  disabled={loading}
                >
                  <option value="deposit">Deposit</option>
                  <option value="withdrawal">Withdrawal</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (PHP)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                    ₱
                  </span>
                  <input
                    type="number"
                    name="amount"
                    step="0.01"
                    min="0.01"
                    value={formData.amount}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow only up to 2 decimal places
                      if (value === '' || /^\d*(\.\d{0,2})?$/.test(value)) {
                        setFormData(prev => ({ ...prev, amount: value }));
                      }
                    }}
                    className={`w-full pl-8 p-2 border rounded-md focus:ring-red-500 focus:border-red-500 text-black ${
                      errors.amount ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter amount"
                    disabled={loading}
                  />
                </div>
                {errors.amount && (
                  <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  Current Balance: ₱{currentBalance.toFixed(2)}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className={`w-full p-2 border rounded-md focus:ring-red-500 focus:border-red-500 text-black ${
                    errors.date ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={loading}
                />
                {errors.date && (
                  <p className="mt-1 text-sm text-red-600">{errors.date}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 text-black"
                  placeholder="Enter remarks (optional)"
                  rows={3}
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
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
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  formData.type === 'deposit' ? 'Generate Deposit No.' : 'Add Transaction'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}