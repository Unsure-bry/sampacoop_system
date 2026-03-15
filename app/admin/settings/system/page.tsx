'use client';

import { useState, useEffect } from 'react';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/lib/auth';

interface LoanPlan {
  id: string;
  name: string;
  description: string;
  maxAmount: number;
  interestRate: number;
  termOptions: number[];
  createdAt?: string;
}

interface SystemSettings {
  membershipPayment: number;
  reactivationFee: number;
  updatedAt?: string;
  updatedBy?: string;
}

const defaultSettings: SystemSettings = {
  membershipPayment: 1500,
  reactivationFee: 1500,
};

export default function SystemSettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const isAdmin = user?.role?.toLowerCase() === 'admin';

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const result = await firestore.getDocument('systemSettings', 'general');
      
      if (result.success && result.data) {
        setSettings({
          ...defaultSettings,
          ...result.data,
        });
      } else {
        // If no settings exist, create default settings
        await firestore.setDocument('systemSettings', 'general', {
          ...defaultSettings,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!isAdmin) {
      toast.error('Only administrators can modify system settings');
      return;
    }

    setSaving(true);
    try {
      const result = await firestore.updateDocument('systemSettings', 'general', {
        ...settings,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.email || 'admin',
      });

      if (result.success) {
        toast.success('System settings saved successfully');
        setHasChanges(false);
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('An error occurred while saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to default values?')) {
      setSettings(defaultSettings);
      setHasChanges(true);
      toast.success('Settings reset to defaults. Click Save to apply.');
    }
  };

  const updateSetting = (key: keyof SystemSettings, value: number) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
    setHasChanges(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumberWithCommas = (amount: number) => {
    return new Intl.NumberFormat('en-PH').format(amount);
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">System Settings</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <h2 className="text-lg font-semibold text-red-800">Access Denied</h2>
              <p className="text-red-600">Only administrators can access system settings.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">System Settings</h1>
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">System Settings</h1>
          <p className="text-gray-600">Configure cooperative policies and financial settings</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center"
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center disabled:opacity-50"
          >
            {saving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {hasChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-yellow-800">You have unsaved changes. Click Save Changes to apply.</p>
        </div>
      )}

      {/* Membership Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Membership Settings</h2>
          <p className="text-sm text-gray-900">Configure membership-related fees and payments</p>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Membership Payment Amount
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-900 font-medium">₱</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 font-medium"
                  value={settings.membershipPayment === 0 ? '' : formatNumberWithCommas(settings.membershipPayment)}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/,/g, '');
                    const numValue = rawValue === '' ? 0 : parseFloat(rawValue);
                    updateSetting('membershipPayment', isNaN(numValue) ? 0 : numValue);
                  }}
                  placeholder="0"
                />
              </div>
              <p className="mt-1 text-sm text-gray-900">
                Current: {formatCurrency(settings.membershipPayment)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Member Reactivation Fee
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-900 font-medium">₱</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 font-medium"
                  value={settings.reactivationFee === 0 ? '' : formatNumberWithCommas(settings.reactivationFee)}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/,/g, '');
                    const numValue = rawValue === '' ? 0 : parseFloat(rawValue);
                    updateSetting('reactivationFee', isNaN(numValue) ? 0 : numValue);
                  }}
                  placeholder="0"
                />
              </div>
              <p className="mt-1 text-sm text-gray-900">
                Current: {formatCurrency(settings.reactivationFee)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Loan Plans */}
      <LoanPlansSection isAdmin={isAdmin} />

      {/* Current Values Summary */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-4">Current Settings Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4">
            <p className="text-sm text-gray-500">Membership Payment</p>
            <p className="text-xl font-bold text-gray-800">{formatCurrency(settings.membershipPayment)}</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <p className="text-sm text-gray-500">Reactivation Fee</p>
            <p className="text-xl font-bold text-gray-800">{formatCurrency(settings.reactivationFee)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loan Plans Section Component
function LoanPlansSection({ isAdmin }: { isAdmin: boolean }) {
  const [loanPlans, setLoanPlans] = useState<LoanPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<LoanPlan | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    maxAmount: '',
    interestRate: '',
    termOptions: '',
    description: '',
  });

  useEffect(() => {
    fetchLoanPlans();
  }, []);

  const fetchLoanPlans = async () => {
    try {
      setLoading(true);
      const result = await firestore.getCollection('loanPlans');
      
      if (result.success && result.data) {
        const plans = result.data.map((doc: any) => ({
          id: doc.id,
          name: doc.name || '',
          description: doc.description || '',
          maxAmount: doc.maxAmount || 0,
          interestRate: doc.interestRate || 0,
          termOptions: doc.termOptions || [],
          createdAt: doc.createdAt || '',
        }));
        setLoanPlans(plans);
      }
    } catch (error) {
      console.error('Error fetching loan plans:', error);
      toast.error('Failed to load loan plans');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Parse termOptions from comma-separated string to number array
      const termOptions = formData.termOptions
        .split(',')
        .map(t => parseInt(t.trim()))
        .filter(t => !isNaN(t) && t > 0);

      const newPlan = {
        name: formData.name,
        description: formData.description,
        maxAmount: parseFloat(formData.maxAmount) || 0,
        interestRate: parseFloat(formData.interestRate) || 0,
        termOptions: termOptions.length > 0 ? termOptions : [6, 12, 24],
        createdAt: new Date().toISOString(),
      };

      const result = await firestore.setDocument('loanPlans', `plan-${Date.now()}`, newPlan);

      if (result.success) {
        toast.success('Loan plan added successfully');
        setIsAddModalOpen(false);
        setFormData({ name: '', maxAmount: '', interestRate: '', termOptions: '', description: '' });
        fetchLoanPlans();
      } else {
        toast.error('Failed to add loan plan');
      }
    } catch (error) {
      console.error('Error adding loan plan:', error);
      toast.error('An error occurred while adding loan plan');
    }
  };

  const handleEditPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    try {
      // Parse termOptions from comma-separated string to number array
      const termOptions = formData.termOptions
        .split(',')
        .map(t => parseInt(t.trim()))
        .filter(t => !isNaN(t) && t > 0);

      const updatedPlan = {
        name: formData.name,
        description: formData.description,
        maxAmount: parseFloat(formData.maxAmount) || 0,
        interestRate: parseFloat(formData.interestRate) || 0,
        termOptions: termOptions.length > 0 ? termOptions : [6, 12, 24],
        updatedAt: new Date().toISOString(),
      };

      const result = await firestore.updateDocument('loanPlans', selectedPlan.id, updatedPlan);

      if (result.success) {
        toast.success('Loan plan updated successfully');
        setIsEditModalOpen(false);
        setSelectedPlan(null);
        fetchLoanPlans();
      } else {
        toast.error('Failed to update loan plan');
      }
    } catch (error) {
      console.error('Error updating loan plan:', error);
      toast.error('An error occurred while updating loan plan');
    }
  };

  const handleDeletePlan = async () => {
    if (!selectedPlan) return;

    try {
      const result = await firestore.deleteDocument('loanPlans', selectedPlan.id);

      if (result.success) {
        toast.success('Loan plan deleted successfully');
        setIsDeleteModalOpen(false);
        setSelectedPlan(null);
        fetchLoanPlans();
      } else {
        toast.error('Failed to delete loan plan');
      }
    } catch (error) {
      console.error('Error deleting loan plan:', error);
      toast.error('An error occurred while deleting loan plan');
    }
  };

  const openEditModal = (plan: LoanPlan) => {
    setSelectedPlan(plan);
    setFormData({
      name: plan.name,
      maxAmount: plan.maxAmount.toString(),
      interestRate: plan.interestRate.toString(),
      termOptions: plan.termOptions.join(', '),
      description: plan.description || '',
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (plan: LoanPlan) => {
    setSelectedPlan(plan);
    setIsDeleteModalOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumberWithCommas = (amount: number) => {
    return new Intl.NumberFormat('en-PH').format(amount);
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Loan Plans</h2>
          <p className="text-sm text-gray-500">Manage loan plans for members</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Plan
          </button>
        )}
      </div>
      
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
          </div>
        ) : loanPlans.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No loan plans found</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Loan Plan Dropdown Selection */}
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Loan Plan</label>
              <select
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white text-gray-900"
                onChange={(e) => {
                  const plan = loanPlans.find(p => p.id === e.target.value);
                  if (plan) {
                    setSelectedPlan(plan);
                  }
                }}
                value={selectedPlan?.id || ''}
              >
                {!selectedPlan && (
                  <option value="" disabled className="text-gray-500">-- Select a loan plan --</option>
                )}
                {loanPlans.map((plan) => (
                  <option key={plan.id} value={plan.id} className="text-gray-900">
                    {plan.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Plan Details - Always Visible Fields */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-xl font-bold text-black">{selectedPlan ? selectedPlan.name : 'No Plan Selected'}</h3>
                {isAdmin && selectedPlan && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(selectedPlan)}
                      className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => openDeleteModal(selectedPlan)}
                      className="px-4 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-600 font-medium mb-1">Maximum Amount</p>
                  <p className="text-2xl font-bold text-blue-800">
                    {selectedPlan ? formatCurrency(selectedPlan.maxAmount) : '—'}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-600 font-medium mb-1">Interest Rate</p>
                  <p className="text-2xl font-bold text-green-800">
                    {selectedPlan ? `${selectedPlan.interestRate}%` : '—'}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-purple-600 font-medium mb-1">Term Options</p>
                  <p className="text-2xl font-bold text-purple-800">
                    {selectedPlan ? selectedPlan.termOptions.join(', ') : '—'} 
                    {selectedPlan && <span className="text-sm font-normal text-purple-600"> months</span>}
                  </p>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-500 font-medium mb-2">Description</p>
                <p className="text-gray-700">
                  {selectedPlan?.description || '—'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Plan Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Add New Loan Plan</h2>
                <button onClick={() => setIsAddModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleAddPlan} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Emergency Loan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Loan Amount</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                      ₱
                    </span>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      className="w-full pl-8 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      value={formData.maxAmount}
                      onChange={(e) => setFormData({ ...formData, maxAmount: e.target.value })}
                      placeholder="Enter maximum amount"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="100"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      value={formData.interestRate}
                      onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                      placeholder="e.g., 5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Term Options (months)</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      value={formData.termOptions}
                      onChange={(e) => setFormData({ ...formData, termOptions: e.target.value })}
                      placeholder="e.g., 6, 12, 24"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter plan description"
                    rows={3}
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Add Plan
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Plan Modal */}
      {isEditModalOpen && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Edit Loan Plan</h2>
                <button onClick={() => setIsEditModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleEditPlan} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Loan Amount</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                      ₱
                    </span>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      className="w-full pl-8 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      value={formData.maxAmount}
                      onChange={(e) => setFormData({ ...formData, maxAmount: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="100"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      value={formData.interestRate}
                      onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Term Options (months)</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      value={formData.termOptions}
                      onChange={(e) => setFormData({ ...formData, termOptions: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Update Plan
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Confirm Delete</h2>
                <button onClick={() => setIsDeleteModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mb-6">
                <p className="text-gray-600">
                  Are you sure you want to delete <strong>{selectedPlan.name}</strong>?
                </p>
                <p className="text-sm text-red-600 mt-2">
                  This action cannot be undone.
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeletePlan}
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
