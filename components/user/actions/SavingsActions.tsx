'use client';

import { useState } from 'react';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { toast } from 'react-hot-toast';

interface SavingsActionsProps {
  onTransactionComplete?: () => void;
  currentBalance?: number;
}

export default function SavingsActions({ onTransactionComplete, currentBalance = 0 }: SavingsActionsProps) {
  const { user } = useAuth();
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be logged in to perform this action');
      return;
    }

    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid deposit amount');
      return;
    }

    setLoading(true);
    try {
      // Create deposit transaction
      const transaction = {
        type: 'deposit',
        amount: amount,
        date: new Date().toISOString(),
        remarks: 'Deposit via user portal',
        userId: user.uid,
      };

      // Save to Firestore
      const result = await firestore.setDocument(
        `members/${user.uid}/savings`,
        `transaction-${Date.now()}`,
        transaction
      );

      if (result.success) {
        toast.success('Deposit successful!');
        setDepositAmount('');
        if (onTransactionComplete) {
          onTransactionComplete();
        }
      } else {
        toast.error('Failed to process deposit. Please try again.');
      }
    } catch (error) {
      console.error('Error processing deposit:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be logged in to perform this action');
      return;
    }

    const amount = parseFloat(withdrawalAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid withdrawal amount');
      return;
    }

    // Check if withdrawal amount exceeds current balance
    if (amount > currentBalance) {
      toast.error('Withdrawal amount exceeds current balance');
      return;
    }

    setLoading(true);
    try {
      // Create withdrawal transaction
      const transaction = {
        type: 'withdrawal',
        amount: amount,
        date: new Date().toISOString(),
        remarks: 'Withdrawal via user portal',
        userId: user.uid,
      };

      // Save to Firestore
      const result = await firestore.setDocument(
        `members/${user.uid}/savings`,
        `transaction-${Date.now()}`,
        transaction
      );

      if (result.success) {
        toast.success('Withdrawal request submitted!');
        setWithdrawalAmount('');
        if (onTransactionComplete) {
          onTransactionComplete();
        }
      } else {
        toast.error('Failed to process withdrawal. Please try again.');
      }
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      toast.error('An error occurred. Please try again.');
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

  return (
    <div className="space-y-6">
      {/* Current Balance Display */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Current Savings Balance</h3>
        <p className="text-3xl font-bold text-green-600">{formatCurrency(currentBalance)}</p>
      </div>

      {/* Deposit Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Make a Deposit</h3>
        <form onSubmit={handleDeposit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="depositAmount">
              Amount (PHP)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                ₱
              </span>
              <input
                id="depositAmount"
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="pl-8 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Enter deposit amount"
                min="1"
                step="0.01"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Deposit'}
          </button>
        </form>
      </div>

      {/* Withdrawal Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Request Withdrawal</h3>
        <form onSubmit={handleWithdrawal}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="withdrawalAmount">
              Amount (PHP)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                ₱
              </span>
              <input
                id="withdrawalAmount"
                type="number"
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
                className="pl-8 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Enter withdrawal amount"
                min="1"
                max={currentBalance}
                step="0.01"
                required
              />
              <div className="text-xs text-gray-500 mt-1">
                Max: {formatCurrency(currentBalance)}
              </div>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Request Withdrawal'}
          </button>
        </form>
      </div>
    </div>
  );
}