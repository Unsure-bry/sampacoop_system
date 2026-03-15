'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { firestore } from '@/lib/firebase';
import Link from 'next/link';
import { 
  Users, 
  FileText, 
  DollarSign, 
  Clock,
  CheckCircle,
  Users2
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
  totalMembers: number;
  activeLoans: number;
  pendingRequests: number;
  totalSavings: number;
  approvedLoans: number;
  rejectedLoans: number;
}

interface ChartData {
  loanStatus: { name: string; value: number; color: string }[];
  memberGrowth: { month: string; count: number }[];
  loanApprovals: { month: string; approved: number; rejected: number }[];
}

export default function BODHomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    activeLoans: 0,
    pendingRequests: 0,
    totalSavings: 0,
    approvedLoans: 0,
    rejectedLoans: 0,
  });
  const [chartData, setChartData] = useState<ChartData>({
    loanStatus: [],
    memberGrowth: [],
    loanApprovals: [],
  });
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/admin/login');
      return;
    }

    if (user && user.role?.toLowerCase() !== 'bod' && user.role?.toLowerCase() !== 'board of directors') {
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
      
      const [membersResult, loansResult, loanRequestsResult, savingsResult] = await Promise.all([
        firestore.getCollection('members'),
        firestore.getCollection('loans'),
        firestore.getCollection('loanRequests'),
        firestore.getCollection('savings'),
      ]);

      const members = membersResult.success && membersResult.data ? membersResult.data : [];
      const totalMembers = members.length;

      const loans = loansResult.success && loansResult.data ? loansResult.data : [];
      const activeLoans = loans.filter((loan: any) => loan.status === 'active').length;
      const completedLoans = loans.filter((loan: any) => loan.status === 'completed').length;
      const rejectedLoans = loans.filter((loan: any) => loan.status === 'rejected').length;
      const approvedLoans = loans.filter((loan: any) => loan.status === 'approved' || loan.status === 'active' || loan.status === 'completed').length;

      const loanRequests = loanRequestsResult.success && loanRequestsResult.data ? loanRequestsResult.data : [];
      const pendingRequests = loanRequests.filter((req: any) => req.status === 'pending').length;

      // Calculate total savings from members' savings.total field (accurate aggregate)
      const totalSavings = members.reduce((sum: number, member: any) => {
        return sum + (member.savings?.total || 0);
      }, 0);

      setStats({
        totalMembers,
        activeLoans,
        pendingRequests,
        totalSavings: Math.max(0, totalSavings),
        approvedLoans,
        rejectedLoans,
      });

      const memberGrowth = generateMonthlyData(members, 'createdAt', 6);
      const loanApprovals = generateLoanApprovalData(loans, 6);

      setChartData({
        loanStatus: [
          { name: 'Active', value: activeLoans, color: '#10B981' },
          { name: 'Completed', value: completedLoans, color: '#3B82F6' },
          { name: 'Rejected', value: rejectedLoans, color: '#EF4444' },
          { name: 'Pending', value: pendingRequests, color: '#F59E0B' },
        ].filter(item => item.value > 0),
        memberGrowth,
        loanApprovals,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setFetching(false);
    }
  };

  const generateMonthlyData = (records: any[], dateField: string, months: number) => {
    const data: { month: string; count: number }[] = [];
    const now = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleString('en-US', { month: 'short' });
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const count = records.filter((record: any) => {
        const recordDate = record[dateField] ? new Date(record[dateField]) : null;
        if (!recordDate) return false;
        return `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}` === yearMonth;
      }).length;
      
      data.push({ month: monthKey, count });
    }
    
    return data;
  };

  const generateLoanApprovalData = (loans: any[], months: number) => {
    const data: { month: string; approved: number; rejected: number }[] = [];
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
      
      const approved = monthLoans.filter((l: any) => l.status === 'approved' || l.status === 'active' || l.status === 'completed').length;
      const rejected = monthLoans.filter((l: any) => l.status === 'rejected').length;
      
      data.push({ month: monthKey, approved, rejected });
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
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Users2 className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Board of Directors Dashboard</h1>
            <p className="text-sm sm:text-base text-gray-500 mt-0.5 sm:mt-1 truncate">Welcome back, {user?.displayName || 'Board Member'}</p>
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

        <Link href="/admin/loans/requests" className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 hover:border-gray-300 hover:shadow-sm transition-all">
          <div className="flex flex-col">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center mb-3">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-gray-500">Pending</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stats.pendingRequests}</p>
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
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Member Growth Trend</h3>
          <div className="h-56 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData.memberGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6' }} name="New Members" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Loan Approval Trends</h3>
          <div className="h-56 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.loanApprovals}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="approved" fill="#10B981" name="Approved" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rejected" fill="#EF4444" name="Rejected" radius={[4, 4, 0, 0]} />
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
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Board Overview</h3>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="text-sm text-gray-700">Total Members</span>
              </div>
              <span className="font-semibold text-blue-900">{stats.totalMembers}</span>
            </div>
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
