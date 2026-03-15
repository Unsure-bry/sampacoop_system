'use client';

import { useState } from 'react';

interface AddSavingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSavings: (data: { type: 'deposit' | 'withdrawal', amount: number, remarks: string, depositControlNumber?: string }) => Promise<boolean>;
  currentBalance: number;
}

export default function AddSavingsModal({ isOpen, onClose, onAddSavings, currentBalance }: AddSavingsModalProps) {
  const [formData, setFormData] = useState({
    type: 'deposit' as 'deposit' | 'withdrawal',
    amount: '',
    remarks: '',
    controlNumber: '',
    withdrawalNumber: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.amount) {
      newErrors.amount = 'Amount is required';
    } else {
      // Remove commas before parsing
      const cleanAmount = formData.amount.replace(/,/g, '');
      const amount = parseFloat(cleanAmount);
      if (isNaN(amount) || amount <= 0) {
        newErrors.amount = 'Amount must be a positive number';
      }
      
      // Check if withdrawal amount exceeds current balance
      if (formData.type === 'withdrawal' && amount > currentBalance) {
        newErrors.amount = `Withdrawal amount cannot exceed current balance of ₱${currentBalance.toFixed(2)}`;
      }
    }
    
    // Validate control number for deposits
    if (formData.type === 'deposit' && !formData.controlNumber.trim()) {
      newErrors.controlNumber = 'Control number is required for deposits';
    }
    
    // Validate withdrawal number for withdrawals
    if (formData.type === 'withdrawal' && !formData.withdrawalNumber.trim()) {
      newErrors.withdrawalNumber = 'Withdrawal number is required for withdrawals';
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
    
    setLoading(true);
    
    // Use manually entered control number for deposits or withdrawal number for withdrawals
    const depositControlNumber = formData.type === 'deposit' 
      ? formData.controlNumber.trim() 
      : formData.type === 'withdrawal' 
        ? formData.withdrawalNumber.trim() 
        : undefined;
    
    const success = await onAddSavings({
      type: formData.type,
      amount: parseFloat(formData.amount.replace(/,/g, '')),
      remarks: formData.remarks,
      depositControlNumber
    });
    
    setLoading(false);
    
    if (success) {
      // Reset form
      setFormData({
        type: 'deposit',
        amount: '',
        remarks: '',
        controlNumber: '',
        withdrawalNumber: ''
      });
      onClose();
    }
  };

  if (!isOpen) return null;

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
                <label className="block text-sm font-medium text-black mb-2">Transaction Type</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 text-black font-medium bg-white"
                  disabled={loading}
                >
                  <option value="deposit" className="text-black">Deposit</option>
                  <option value="withdrawal" className="text-black">Withdrawal</option>
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
                    type="text"
                    name="amount"
                    inputMode="decimal"
                    value={formData.amount}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/,/g, '');
                      // Allow: empty, digits only, digits with single decimal, digits with decimal and up to 2 digits after
                      if (rawValue === '' || /^\d+$/.test(rawValue) || /^\d+\.$/.test(rawValue) || /^\d+\.\d{0,2}$/.test(rawValue)) {
                        // Format with commas for display while preserving raw value
                        if (rawValue === '' || rawValue === '.') {
                          setFormData(prev => ({ ...prev, amount: rawValue }));
                        } else if (rawValue.endsWith('.')) {
                          // Handle trailing decimal point
                          const numPart = rawValue.slice(0, -1);
                          const formatted = parseFloat(numPart).toLocaleString('en-PH');
                          setFormData(prev => ({ ...prev, amount: formatted + '.' }));
                        } else if (rawValue.includes('.')) {
                          // Handle number with decimal
                          const [intPart, decPart] = rawValue.split('.');
                          const formatted = parseFloat(intPart || '0').toLocaleString('en-PH');
                          setFormData(prev => ({ ...prev, amount: `${formatted}.${decPart}` }));
                        } else {
                          // Whole number
                          setFormData(prev => ({ ...prev, amount: parseFloat(rawValue).toLocaleString('en-PH') }));
                        }
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
              
              {formData.type === 'deposit' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Control Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="controlNumber"
                    value={formData.controlNumber}
                    onChange={handleInputChange}
                    className={`w-full p-2 border rounded-md focus:ring-red-500 focus:border-red-500 text-black ${
                      errors.controlNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter control number from hardcopy receipt"
                    disabled={loading}
                  />
                  {errors.controlNumber && (
                    <p className="mt-1 text-sm text-red-600">{errors.controlNumber}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    
                  </p>
                </div>
              )}
              
              {formData.type === 'withdrawal' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Withdrawal Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="withdrawalNumber"
                    value={formData.withdrawalNumber}
                    onChange={handleInputChange}
                    className={`w-full p-2 border rounded-md focus:ring-red-500 focus:border-red-500 text-black ${
                      errors.withdrawalNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter withdrawal number from hardcopy receipt"
                    disabled={loading}
                  />
                  {errors.withdrawalNumber && (
                    <p className="mt-1 text-sm text-red-600">{errors.withdrawalNumber}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    
                  </p>
                </div>
              )}
              
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
                  'Add Transaction'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}