'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { firestore } from '@/lib/firebase';
import { Users, FileText, DollarSign, TrendingUp, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DashboardStats {
  totalMembers: number;
  totalLoans: number;
  activeLoans: number;
  totalSavings: number;
  totalReceivables: number;
  completedLoans: number;
  completionRate: number;
}

interface SavingsLeaderboardEntry {
  memberId: string;
  fullName: string;
  role: string;
  totalSavings: number;
}

export default function BODHomePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    totalLoans: 0,
    activeLoans: 0,
    totalSavings: 0,
    totalReceivables: 0,
    completedLoans: 0,
    completionRate: 0
  });
  const [leaderboard, setLeaderboard] = useState<SavingsLeaderboardEntry[]>([]);
  const [filteredLeaderboard, setFilteredLeaderboard] = useState<SavingsLeaderboardEntry[]>([]);
  const [savingsFilter, setSavingsFilter] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/admin/login');
    } else if (user && user.role?.toLowerCase() !== 'board of directors') {
      router.push('/admin/unauthorized');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch members
        const membersResult = await firestore.getCollection('members');
        const totalMembers = membersResult.success && membersResult.data ? membersResult.data.length : 0;

        // Fetch loans
        const loansResult = await firestore.getCollection('loans');
        const loans = loansResult.success && loansResult.data ? loansResult.data : [];
        const totalLoans = loans.length;
        const activeLoans = loans.filter((loan: any) => loan.status === 'active').length;
        const completedLoans = loans.filter((loan: any) => loan.status === 'completed').length;
        const completionRate = totalLoans > 0 ? Math.round((completedLoans / totalLoans) * 100) : 0;
        
        // Calculate total receivables from active loans
        const totalReceivables = loans
          .filter((loan: any) => loan.status === 'active')
          .reduce((sum: number, loan: any) => sum + (Number(loan.amount) || 0), 0);

        // Calculate total savings and build leaderboard
        let totalSavings = 0;
        const leaderboardData: SavingsLeaderboardEntry[] = [];

        if (membersResult.success && membersResult.data) {
          for (const member of membersResult.data as any[]) {
            const memberId = member.id;
            const firstName = member.firstName || '';
            const lastName = member.lastName || '';
            const fullName = `${firstName} ${lastName}`.trim() || 'Unknown User';
            const role = member.role || 'Member';

            // Fetch savings from member's subcollection
            let memberSavings = 0;
            try {
              const savingsResult = await firestore.getCollection(`members/${memberId}/savings`);
              if (savingsResult.success && savingsResult.data) {
                memberSavings = savingsResult.data.reduce((total: number, transaction: any) => {
                  const amount = Number(transaction.amount) || 0;
                  if (transaction.type === 'deposit') {
                    return total + amount;
                  } else if (transaction.type === 'withdrawal') {
                    return total - amount;
                  }
                  return total;
                }, 0);
              }
            } catch (error) {
              console.warn(`Error fetching savings for member ${memberId}:`, error);
              // Fallback to totalSavings field
              memberSavings = Number(member.totalSavings) || 0;
            }

            if (memberSavings > 0) {
              totalSavings += memberSavings;
              leaderboardData.push({
                memberId,
                fullName,
                role,
                totalSavings: memberSavings
              });
            }
          }
        }

        // Sort leaderboard by savings (descending)
        leaderboardData.sort((a, b) => b.totalSavings - a.totalSavings);
        setLeaderboard(leaderboardData);
        setFilteredLeaderboard(leaderboardData);

        setStats({
          totalMembers,
          totalLoans,
          activeLoans,
          totalSavings,
          totalReceivables,
          completedLoans,
          completionRate
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Filter savings based on selected filter
  useEffect(() => {
    // For BOD, we'll show all savings data (no date filtering needed for overview)
    setFilteredLeaderboard(leaderboard);
  }, [leaderboard, savingsFilter]);

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">BOD Dashboard</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800"></h1>
      </div>

      {/* Stats Cards - 4 cards in a row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div 
          className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push('/admin/bod/members')}
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <Users className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Members</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalMembers.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div 
          className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push('/admin/bod/loans')}
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <FileText className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Loans</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalLoans.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div 
          className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push('/admin/bod/loans')}
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Loans</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeLoans.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div 
          className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push('/admin/bod/savings')}
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <DollarSign className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Savings</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalSavings)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Business Overview Graph */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Business Overview</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { name: 'Total Members', value: stats.totalMembers, color: '#3B82F6' },
                { name: 'Total Loans', value: stats.totalLoans, color: '#10B981' },
                { name: 'Active Loans', value: stats.activeLoans, color: '#F59E0B' },
                { name: 'Completed Loans', value: stats.completedLoans, color: '#8B5CF6' },
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => [value.toLocaleString(), 'Count']}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {[
                  { name: 'Total Members', value: stats.totalMembers, color: '#3B82F6' },
                  { name: 'Total Loans', value: stats.totalLoans, color: '#10B981' },
                  { name: 'Active Loans', value: stats.activeLoans, color: '#F59E0B' },
                  { name: 'Completed Loans', value: stats.completedLoans, color: '#8B5CF6' },
                ].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Savings Leaderboard */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Savings Leaderboard</h2>
            <p className="text-sm text-gray-600 mt-1">Top members by total savings</p>
          </div>
        </div>
        
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {filteredLeaderboard && filteredLeaderboard.length > 0 ? (
            filteredLeaderboard.map((entry, index) => (
              <div 
                key={entry.memberId || index} 
                className={`flex items-center justify-between p-4 rounded-lg transition-all duration-200 ${
                  index === 0 ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 shadow-sm' : 
                  index === 1 ? 'bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200' : 
                  index === 2 ? 'bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200' : 
                  'bg-gray-50 hover:bg-gray-100 border border-gray-100'
                }`}
              >
                <div className="flex items-center">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-yellow-500 text-white' : 
                    index === 1 ? 'bg-gray-400 text-white' : 
                    index === 2 ? 'bg-amber-600 text-white' : 
                    'bg-gray-300 text-gray-700'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="ml-4">
                    <p className="font-semibold text-gray-900">{entry.fullName}</p>
                    <p className="text-sm text-gray-600">{entry.role}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-gray-900">{formatCurrency(entry.totalSavings)}</p>
                  <p className="text-xs text-gray-500">
                    {entry.totalSavings > 0 && filteredLeaderboard[0]?.totalSavings > 0
                      ? `${((entry.totalSavings / filteredLeaderboard[0].totalSavings) * 100).toFixed(1)}% of leader` 
                      : 'No savings'}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                <DollarSign className="h-12 w-12" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No Savings Data</h3>
              <p className="text-gray-500">No savings transactions found</p>
            </div>
          )}
        </div>
        
        {filteredLeaderboard && filteredLeaderboard.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Total Members: {filteredLeaderboard.length}</span>
              <span>
                Total Savings: {formatCurrency(
                  filteredLeaderboard.reduce((sum, entry) => sum + entry.totalSavings, 0)
                )}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
