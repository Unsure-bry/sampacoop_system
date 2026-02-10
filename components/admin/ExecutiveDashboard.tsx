'use client';

import { useEffect, useState } from 'react';
import { firestore } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { DollarSign, CheckCircle, Activity, Wallet, FileText, AlertCircle } from 'lucide-react';

interface DashboardStats {
  totalReceivables: number;
  totalPaidCompleted: number;
  totalActiveLoans: number;
  moneyDisbursed: number;
  pendingApprovals: number;
  overduePayments: number;
}

export default function ExecutiveDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalReceivables: 0,
    totalPaidCompleted: 0,
    totalActiveLoans: 0,
    moneyDisbursed: 0,
    pendingApprovals: 0,
    overduePayments: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all loans to calculate statistics
        const loansResult = await firestore.getCollection('loans');
        if (!loansResult.success) {
          throw new Error(`Failed to fetch loans: ${loansResult.error || 'Unknown error'}`);
        }

        const loans = loansResult.data || [];
        
        // Calculate Total Receivables (amount still to be collected from active loans)
        const totalReceivables = loans
          .filter((loan: any) => loan.status === 'active')
          .reduce((sum: number, loan: any) => sum + (loan.remainingAmount || loan.amount || 0), 0);

        // Calculate Total Paid/Completed
        const totalPaidCompleted = loans
          .filter((loan: any) => loan.status === 'completed' || loan.status === 'paid')
          .reduce((sum: number, loan: any) => sum + (loan.amount || 0), 0);

        // Count Active Loans
        const totalActiveLoans = loans.filter((loan: any) => loan.status === 'active').length;

        // Calculate Money Disbursed (total amount given out)
        const moneyDisbursed = loans
          .filter((loan: any) => loan.status !== 'pending' && loan.status !== 'rejected')
          .reduce((sum: number, loan: any) => sum + (loan.amount || 0), 0);

        // Count Pending Approvals (urgent - needs action)
        const pendingApprovals = loans.filter((loan: any) => loan.status === 'pending').length;

        // Calculate Overdue Payments (urgent - needs action)
        const overduePayments = loans
          .filter((loan: any) => {
            if (loan.status !== 'active') return false;
            const dueDate = loan.nextPaymentDate || loan.dueDate;
            if (!dueDate) return false;
            return new Date(dueDate) < new Date();
          }).length;

        setStats({
          totalReceivables,
          totalPaidCompleted,
          totalActiveLoans,
          moneyDisbursed,
          pendingApprovals,
          overduePayments
        });
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setStats({
          totalReceivables: 0,
          totalPaidCompleted: 0,
          totalActiveLoans: 0,
          moneyDisbursed: 0,
          pendingApprovals: 0,
          overduePayments: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-32"></div>
                </div>
                <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Dashboard Data</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards Grid - Admin Dashboard Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Receivables - Blue */}
        <div 
          onClick={() => router.push('/admin/loans/records')}
          className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-blue-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Receivables</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.totalReceivables)}</p>
              <p className="text-xs text-gray-500 mt-1">Amount to be collected</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Wallet className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Total Paid/Completed - Green */}
        <div 
          onClick={() => router.push('/admin/loans/records')}
          className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-green-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Paid / Completed</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.totalPaidCompleted)}</p>
              <p className="text-xs text-gray-500 mt-1">Amount collected</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Total Active Loans - Blue */}
        <div 
          onClick={() => router.push('/admin/loans/records')}
          className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-blue-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Active Loans</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalActiveLoans}</p>
              <p className="text-xs text-gray-500 mt-1">Currently active</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Money Disbursed - Blue */}
        <div 
          onClick={() => router.push('/admin/loans/records')}
          className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-blue-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Money Disbursed</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.moneyDisbursed)}</p>
              <p className="text-xs text-gray-500 mt-1">Total disbursed</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Pending Approvals - Yellow */}
        <div 
          onClick={() => router.push('/admin/loans/requests')}
          className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-yellow-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.pendingApprovals}</p>
              <p className="text-xs text-yellow-600 mt-1">
                {stats.pendingApprovals > 0 ? 'Action Required' : 'No pending requests'}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <FileText className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Overdue Payments - Red */}
        <div 
          onClick={() => router.push('/admin/loans/records')}
          className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-red-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue Payments</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.overduePayments}</p>
              <p className="text-xs text-red-600 mt-1">
                {stats.overduePayments > 0 ? 'Urgent Action Required' : 'No overdue payments'}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
