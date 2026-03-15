'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { firestore } from '@/lib/firebase';
import Link from 'next/link';
import { 
  Users, 
  DollarSign, 
  Clock,
  CheckCircle,
  Wallet
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

interface DashboardStats {
  totalMembers: number;
  activeLoans: number;
  totalSavings: number;
  totalDeposits: number;
  totalWithdrawals: number;
}

interface ChartData {
  loanStatus: { name: string; value: number; color: string }[];
  financialFlow: { month: string; deposits: number; withdrawals: number }[];
  savingsDistribution: { range: string; count: number }[];
}

export default function TreasurerHomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    activeLoans: 0,
    totalSavings: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
  });
  const [chartData, setChartData] = useState<ChartData>({
    loanStatus: [],
    financialFlow: [],
    savingsDistribution: [],
  });
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/admin/login');
      return;
    }

    if (user && user.role?.toLowerCase() !== 'treasurer') {
      router.push('/admin/unauthorized');
      return;
    }

    if (user) {
      fetchDashboardData();
    }
  }, [user, loading, router]);

  const fetchDashboardData = async () => {
    try {
      setFetching(true);
      
      const [membersResult, loansResult, savingsResult] = await Promise.all([
        firestore.getCollection('members'),
        firestore.getCollection('loans'),
        firestore.getCollection('savings'),
      ]);

      const members = membersResult.success && membersResult.data ? membersResult.data : [];
      const totalMembers = members.length;

      const loans = loansResult.success && loansResult.data ? loansResult.data : [];
      const activeLoans = loans.filter((loan: any) => loan.status === 'active').length;
      const completedLoans = loans.filter((loan: any) => loan.status === 'completed').length;
      const rejectedLoans = loans.filter((loan: any) => loan.status === 'rejected').length;
      const pendingLoans = loans.filter((loan: any) => loan.status === 'pending').length;

      const savings = savingsResult.success && savingsResult.data ? savingsResult.data : [];
      
      // Calculate total savings from members' savings.total field (accurate aggregate)
      const totalSavings = members.reduce((sum: number, member: any) => {
        return sum + (member.savings?.total || 0);
      }, 0);
      
      // Calculate deposits and withdrawals from transactions for display
      const totalDeposits = savings.filter((s: any) => s.type === 'deposit').reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0);
      const totalWithdrawals = savings.filter((s: any) => s.type === 'withdrawal').reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0);

      setStats({
        totalMembers,
        activeLoans,
        totalSavings: Math.max(0, totalSavings),
        totalDeposits,
        totalWithdrawals,
      });

      const financialFlow = generateFinancialFlow(savings, 6);
      const savingsDistribution = generateSavingsDistribution(savings);

      setChartData({
        loanStatus: [
          { name: 'Active', value: activeLoans, color: '#10B981' },
          { name: 'Completed', value: completedLoans, color: '#3B82F6' },
          { name: 'Rejected', value: rejectedLoans, color: '#EF4444' },
          { name: 'Pending', value: pendingLoans, color: '#F59E0B' },
        ].filter(item => item.value > 0),
        financialFlow,
        savingsDistribution,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setFetching(false);
    }
  };

  const generateFinancialFlow = (savings: any[], months: number) => {
    const data: { month: string; deposits: number; withdrawals: number }[] = [];
    const now = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleString('en-US', { month: 'short' });
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const monthSavings = savings.filter((s: any) => {
        const sDate = s.createdAt ? new Date(s.createdAt) : null;
        if (!sDate) return false;
        return `${sDate.getFullYear()}-${String(sDate.getMonth() + 1).padStart(2, '0')}` === yearMonth;
      });
      
      const deposits = monthSavings.filter((s: any) => s.type === 'deposit').reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0);
      const withdrawals = monthSavings.filter((s: any) => s.type === 'withdrawal').reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0);
      
      data.push({ month: monthKey, deposits, withdrawals });
    }
    
    return data;
  };

  const generateSavingsDistribution = (savings: any[]) => {
    const ranges = [
      { range: '0-5k', min: 0, max: 5000 },
      { range: '5k-20k', min: 5000, max: 20000 },
      { range: '20k-50k', min: 20000, max: 50000 },
      { range: '50k+', min: 50000, max: Infinity },
    ];

    return ranges.map(r => ({
      range: r.range,
      count: savings.filter((s: any) => {
        const amount = Number(s.amount) || 0;
        return amount >= r.min && amount < r.max;
      }).length,
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-red-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Treasurer Dashboard</h1>
            <p className="text-sm sm:text-base text-gray-500 mt-0.5 sm:mt-1 truncate">Welcome back, {user?.displayName || 'Treasurer'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <Link href="/admin/members/records" className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 hover:border-gray-300 hover:shadow-sm transition-all">
          <div className="flex flex-col">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-3">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-gray-500">Total Members</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stats.totalMembers}</p>
          </div>
        </Link>

        <Link href="/admin/loans/records" className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 hover:border-gray-300 hover:shadow-sm transition-all">
          <div className="flex flex-col">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center mb-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-gray-500">Active Loans</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stats.activeLoans}</p>
          </div>
        </Link>

        <Link href="/admin/savings" className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 hover:border-gray-300 hover:shadow-sm transition-all">
          <div className="flex flex-col">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center mb-3">
              <DollarSign className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-gray-500">Total Savings</p>
            <p className="text-lg sm:text-xl font-bold text-gray-900 mt-1 truncate">{formatCurrency(stats.totalSavings)}</p>
          </div>
        </Link>

        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 hover:shadow-sm transition-all">
          <div className="flex flex-col">
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center mb-3">
              <Wallet className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-gray-500">Net Flow</p>
            <p className="text-lg sm:text-xl font-bold text-gray-900 mt-1 truncate">{formatCurrency(stats.totalDeposits - stats.totalWithdrawals)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5">
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Financial Flow (Deposits vs Withdrawals)</h3>
          <div className="h-56 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.financialFlow}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => value >= 1000 ? `₱${(value / 1000).toFixed(0)}k` : `₱${value}`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Area type="monotone" dataKey="deposits" stackId="1" stroke="#10B981" fill="#D1FAE5" name="Deposits" />
                <Area type="monotone" dataKey="withdrawals" stackId="1" stroke="#EF4444" fill="#FEE2E2" name="Withdrawals" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Loan Status Distribution</h3>
          <div className="h-48 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.loanStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }: any) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.loanStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Savings Distribution by Amount</h3>
          <div className="h-48 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.savingsDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8B5CF6" name="Members" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-green-600" />
                <span className="text-sm text-gray-700">Total Deposits</span>
              </div>
              <span className="font-semibold text-green-900">{formatCurrency(stats.totalDeposits)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-red-600" />
                <span className="text-sm text-gray-700">Total Withdrawals</span>
              </div>
              <span className="font-semibold text-red-900">{formatCurrency(stats.totalWithdrawals)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="text-sm text-gray-700">Total Members</span>
              </div>
              <span className="font-semibold text-blue-900">{stats.totalMembers}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-purple-600" />
                <span className="text-sm text-gray-700">Active Loans</span>
              </div>
              <span className="font-semibold text-purple-900">{stats.activeLoans}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
