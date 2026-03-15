'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { firestore } from '@/lib/firebase';
import Link from 'next/link';
import { 
  FileText, 
  DollarSign, 
  Clock,
  CheckCircle,
  Briefcase
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
  LineChart,
  Line
} from 'recharts';

interface DashboardStats {
  activeLoans: number;
  pendingRequests: number;
  totalSavings: number;
  completedLoans: number;
  totalLoanAmount: number;
}

interface ChartData {
  loanStatus: { name: string; value: number; color: string }[];
  monthlyLoans: { month: string; disbursed: number; collected: number }[];
  savingsTrend: { month: string; amount: number }[];
}

export default function ManagerHomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    activeLoans: 0,
    pendingRequests: 0,
    totalSavings: 0,
    completedLoans: 0,
    totalLoanAmount: 0,
  });
  const [chartData, setChartData] = useState<ChartData>({
    loanStatus: [],
    monthlyLoans: [],
    savingsTrend: [],
  });
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/admin/login');
      return;
    }

    if (user && user.role?.toLowerCase() !== 'manager') {
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
      
      const [loansResult, loanRequestsResult, savingsResult] = await Promise.all([
        firestore.getCollection('loans'),
        firestore.getCollection('loanRequests'),
        firestore.getCollection('savings'),
      ]);

      const loans = loansResult.success && loansResult.data ? loansResult.data : [];
      const activeLoans = loans.filter((loan: any) => loan.status === 'active').length;
      const completedLoans = loans.filter((loan: any) => loan.status === 'completed').length;
      const rejectedLoans = loans.filter((loan: any) => loan.status === 'rejected').length;
      const totalLoanAmount = loans.reduce((sum: number, loan: any) => sum + (Number(loan.amount) || 0), 0);

      const loanRequests = loanRequestsResult.success && loanRequestsResult.data ? loanRequestsResult.data : [];
      const pendingRequests = loanRequests.filter((req: any) => req.status === 'pending').length;

      // For total savings, fetch members to get accurate aggregate totals
      const membersResultForSavings = await firestore.getCollection('members');
      const membersForSavings = membersResultForSavings.success && membersResultForSavings.data ? membersResultForSavings.data : [];
      const totalSavings = membersForSavings.reduce((sum: number, member: any) => {
        return sum + (member.savings?.total || 0);
      }, 0);

      // Keep savings data for chart generation
      const savings = savingsResult.success && savingsResult.data ? savingsResult.data : [];

      setStats({
        activeLoans,
        pendingRequests,
        totalSavings: Math.max(0, totalSavings),
        completedLoans,
        totalLoanAmount,
      });

      const monthlyLoans = generateMonthlyLoanData(loans, 6);
      const monthlySavings = generateMonthlySavings(savings, 6);

      setChartData({
        loanStatus: [
          { name: 'Active', value: activeLoans, color: '#10B981' },
          { name: 'Completed', value: completedLoans, color: '#3B82F6' },
          { name: 'Rejected', value: rejectedLoans, color: '#EF4444' },
          { name: 'Pending', value: pendingRequests, color: '#F59E0B' },
        ].filter(item => item.value > 0),
        monthlyLoans,
        savingsTrend: monthlySavings,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setFetching(false);
    }
  };

  const generateMonthlyLoanData = (loans: any[], months: number) => {
    const data: { month: string; disbursed: number; collected: number }[] = [];
    const now = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleString('en-US', { month: 'short' });
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const monthLoans = loans.filter((loan: any) => {
        const loanDate = loan.createdAt ? new Date(loan.createdAt) : null;
        if (!loanDate) return false;
        return `${loanDate.getFullYear()}-${String(loanDate.getMonth() + 1).padStart(2, '0')}` === yearMonth;
      });
      
      const disbursed = monthLoans.reduce((sum: number, loan: any) => sum + (Number(loan.amount) || 0), 0);
      const collected = monthLoans.filter((l: any) => l.status === 'completed').reduce((sum: number, loan: any) => sum + (Number(loan.amount) || 0) * 0.1, 0);
      
      data.push({ month: monthKey, disbursed, collected: Math.floor(collected) });
    }
    
    return data;
  };

  const generateMonthlySavings = (savings: any[], months: number) => {
    const data: { month: string; amount: number }[] = [];
    const now = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleString('en-US', { month: 'short' });
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const amount = savings.reduce((sum: number, item: any) => {
        const itemDate = item.createdAt ? new Date(item.createdAt) : null;
        if (!itemDate) return sum;
        if (`${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}` === yearMonth) {
          const itemAmount = Number(item.amount) || 0;
          return item.type === 'deposit' ? sum + itemAmount : sum - itemAmount;
        }
        return sum;
      }, 0);
      
      data.push({ month: monthKey, amount: Math.max(0, amount) });
    }
    
    return data;
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
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Briefcase className="h-5 w-5 sm:h-6 sm:w-6 text-teal-600" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Manager Dashboard</h1>
            <p className="text-sm sm:text-base text-gray-500 mt-0.5 sm:mt-1 truncate">Welcome back, {user?.displayName || 'Manager'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <Link href="/admin/loans/records" className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 hover:border-gray-300 hover:shadow-sm transition-all">
          <div className="flex flex-col">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center mb-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-gray-500">Active Loans</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stats.activeLoans}</p>
          </div>
        </Link>

        <Link href="/admin/loans/requests" className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 hover:border-gray-300 hover:shadow-sm transition-all">
          <div className="flex flex-col">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center mb-3">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-gray-500">Pending</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stats.pendingRequests}</p>
          </div>
        </Link>

        <Link href="/admin/loans/records" className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 hover:border-gray-300 hover:shadow-sm transition-all">
          <div className="flex flex-col">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-3">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-gray-500">Completed</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stats.completedLoans}</p>
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
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5">
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Monthly Loan Performance</h3>
          <div className="h-56 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.monthlyLoans}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => value >= 1000 ? `₱${(value / 1000).toFixed(0)}k` : `₱${value}`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="disbursed" fill="#EF4444" name="Disbursed" radius={[4, 4, 0, 0]} />
                <Bar dataKey="collected" fill="#10B981" name="Collected" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Loan Status Distribution</h3>
          <div className="h-56 sm:h-72">
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

        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Savings Growth Trend</h3>
          <div className="h-56 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData.savingsTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => value >= 1000 ? `₱${(value / 1000).toFixed(0)}k` : `₱${value}`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Line type="monotone" dataKey="amount" stroke="#8B5CF6" strokeWidth={2} dot={{ fill: '#8B5CF6' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Overview</h3>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm text-gray-700">Active Loans</span>
              </div>
              <span className="font-semibold text-green-900">{stats.activeLoans}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-amber-600" />
                <span className="text-sm text-gray-700">Pending Requests</span>
              </div>
              <span className="font-semibold text-amber-900">{stats.pendingRequests}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-blue-600" />
                <span className="text-sm text-gray-700">Completed Loans</span>
              </div>
              <span className="font-semibold text-blue-900">{stats.completedLoans}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-purple-600" />
                <span className="text-sm text-gray-700">Total Savings</span>
              </div>
              <span className="font-semibold text-purple-900">{formatCurrency(stats.totalSavings)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
