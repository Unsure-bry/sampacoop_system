'use client';

import { useEffect, useState } from 'react';
import { firestore } from '@/lib/firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Users, DollarSign, Activity } from 'lucide-react';

interface DashboardStats {
  totalReceivables: number;
  totalPaidCompleted: number;
  totalActiveLoans: number;
  moneyDisbursed: number;
  pendingApprovals: number;
  overduePayments: number;
  totalMembers: number;
}

interface MonthlyData {
  month: string;
  disbursed: number;
  collected: number;
}

interface LoanStatusData {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

export default function ReportsAndAnalytics() {
  const [stats, setStats] = useState<DashboardStats>({
    totalReceivables: 0,
    totalPaidCompleted: 0,
    totalActiveLoans: 0,
    moneyDisbursed: 0,
    pendingApprovals: 0,
    overduePayments: 0,
    totalMembers: 0
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loanStatusData, setLoanStatusData] = useState<LoanStatusData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch loans
      const loansResult = await firestore.getCollection('loans');
      if (!loansResult.success) {
        throw new Error(`Failed to fetch loans: ${loansResult.error || 'Unknown error'}`);
      }

      const loans = loansResult.data || [];

      // Fetch members
      const membersResult = await firestore.getCollection('members');
      if (!membersResult.success) {
        throw new Error(`Failed to fetch members: ${membersResult.error || 'Unknown error'}`);
      }

      const members = membersResult.data || [];

      // Calculate dashboard stats
      const totalReceivables = loans
        .filter((loan: any) => loan.status === 'active')
        .reduce((sum: number, loan: any) => sum + (loan.remainingAmount || loan.amount || 0), 0);

      const totalPaidCompleted = loans
        .filter((loan: any) => loan.status === 'completed' || loan.status === 'paid')
        .reduce((sum: number, loan: any) => sum + (loan.amount || 0), 0);

      const totalActiveLoans = loans.filter((loan: any) => loan.status === 'active').length;

      const moneyDisbursed = loans
        .filter((loan: any) => loan.status !== 'pending' && loan.status !== 'rejected')
        .reduce((sum: number, loan: any) => sum + (loan.amount || 0), 0);

      const pendingApprovals = loans.filter((loan: any) => loan.status === 'pending').length;

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
        overduePayments,
        totalMembers: members.length
      });

      // Calculate monthly data (last 6 months)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonth = new Date().getMonth();
      const monthlyStats: MonthlyData[] = [];

      for (let i = 5; i >= 0; i--) {
        const monthIndex = (currentMonth - i + 12) % 12;
        const year = new Date().getFullYear() - (currentMonth - i < 0 ? 1 : 0);
        
        const monthLoans = loans.filter((loan: any) => {
          const loanDate = loan.createdAt ? new Date(loan.createdAt) : null;
          return loanDate && loanDate.getMonth() === monthIndex && loanDate.getFullYear() === year;
        });

        const disbursed = monthLoans
          .filter((loan: any) => loan.status !== 'pending' && loan.status !== 'rejected')
          .reduce((sum: number, loan: any) => sum + (loan.amount || 0), 0);

        const collected = monthLoans
          .filter((loan: any) => loan.status === 'completed' || loan.status === 'paid')
          .reduce((sum: number, loan: any) => sum + (loan.amount || 0), 0);

        monthlyStats.push({
          month: months[monthIndex],
          disbursed,
          collected
        });
      }

      setMonthlyData(monthlyStats);

      // Calculate loan status distribution
      const statusCounts = {
        active: loans.filter((loan: any) => loan.status === 'active').length,
        completed: loans.filter((loan: any) => loan.status === 'completed' || loan.status === 'paid').length,
        pending: loans.filter((loan: any) => loan.status === 'pending').length,
        overdue: loans.filter((loan: any) => {
          if (loan.status !== 'active') return false;
          const dueDate = loan.nextPaymentDate || loan.dueDate;
          if (!dueDate) return false;
          return new Date(dueDate) < new Date();
        }).length,
        rejected: loans.filter((loan: any) => loan.status === 'rejected').length
      };

      setLoanStatusData([
        { name: 'Active', value: statusCounts.active, color: '#3B82F6' },
        { name: 'Completed', value: statusCounts.completed, color: '#10B981' },
        { name: 'Pending', value: statusCounts.pending, color: '#F59E0B' },
        { name: 'Overdue', value: statusCounts.overdue, color: '#EF4444' },
        { name: 'Rejected', value: statusCounts.rejected, color: '#6B7280' }
      ]);

    } catch (err) {
      console.error('Error fetching report data:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, idx) => (
              <div key={idx} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Reports</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchReportData}
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
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-600">Total Members</p>
              <p className="text-xl font-bold text-blue-800">{stats.totalMembers}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-full">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-green-600">Total Collected</p>
              <p className="text-xl font-bold text-green-800">{formatCurrency(stats.totalPaidCompleted)}</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-full">
              <Activity className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-yellow-600">Active Loans</p>
              <p className="text-xl font-bold text-yellow-800">{stats.totalActiveLoans}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-full">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-purple-600">Money Disbursed</p>
              <p className="text-xl font-bold text-purple-800">{formatCurrency(stats.moneyDisbursed)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Trends (Last 6 Months)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `₱${value / 1000}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="disbursed" name="Disbursed" fill="#3B82F6" />
                <Bar dataKey="collected" name="Collected" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Loan Status Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Loan Status Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={loanStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props: any) => `${props.name} ${(props.percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {loanStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Financial Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-600 mb-1">Total Receivables</p>
            <p className="text-2xl font-bold text-blue-800">{formatCurrency(stats.totalReceivables)}</p>
            <p className="text-xs text-blue-500 mt-1">Amount to be collected</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-600 mb-1">Pending Approvals</p>
            <p className="text-2xl font-bold text-yellow-800">{stats.pendingApprovals}</p>
            <p className="text-xs text-yellow-500 mt-1">Awaiting approval</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-red-600 mb-1">Overdue Payments</p>
            <p className="text-2xl font-bold text-red-800">{stats.overduePayments}</p>
            <p className="text-xs text-red-500 mt-1">Require urgent action</p>
          </div>
        </div>
      </div>
    </div>
  );
}
