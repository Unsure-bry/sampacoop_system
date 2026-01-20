'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

// Types for our data
interface Member {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  createdAt: string;
  [key: string]: any;
}

interface LoanRequest {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  amount: number;
  term: number;
  userId: string;
  createdAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  [key: string]: any;
}

interface Loan {
  id: string;
  status: 'active' | 'completed' | 'rejected';
  amount: number;
  term: number;
  userId: string;
  startDate: string;
  endDate: string;
  [key: string]: any;
}

interface SavingsTransaction {
  id: string;
  memberId: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  createdAt: string;
  [key: string]: any;
}

interface DashboardStats {
  totalMembers: number;
  activeLoans: number;
  pendingRequests: number;
  totalApprovedLoans: number;
}

interface SavingsLeaderboardEntry {
  memberId: string;
  fullName: string;
  role: string;
  totalSavings: number;
}

// Calculate total savings for a member
const calculateMemberSavings = (transactions: SavingsTransaction[]): number => {
  return transactions.reduce((total, transaction) => {
    if (transaction.type === 'deposit') {
      return total + (transaction.amount || 0);
    } else if (transaction.type === 'withdrawal') {
      return total - (transaction.amount || 0);
    }
    return total;
  }, 0);
};

/**
 * Admin Dashboard Page
 * 
 * Displays key metrics and analytics for the cooperative management system:
 * - Summary cards for key metrics
 * - Loan and savings charts
 * - Recent activity
 */
export default function DynamicAdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    activeLoans: 0,
    pendingRequests: 0,
    totalApprovedLoans: 0,
  });
  const [savingsLeaderboard, setSavingsLeaderboard] = useState<SavingsLeaderboardEntry[]>([]);
  const [filteredSavings, setFilteredSavings] = useState<SavingsLeaderboardEntry[]>([]);
  const [savingsFilter, setSavingsFilter] = useState<'all' | 'daily' | 'monthly' | 'yearly'>('all');
  const [loading, setLoading] = useState(true);

  // Validate that this user should be on this dashboard
  useEffect(() => {
    if (!authLoading && user) {
      const role = user.role?.toLowerCase() || '';
      // Only admin users should stay on this page
      // Other admin roles are redirected by middleware, but we double-check here
      if (role !== 'admin') {
        // Redirect to their specific dashboard
        if (typeof window !== 'undefined') {
          window.location.replace('/login');
        }
      }
    }
  }, [user, authLoading]);

  // Redirect users to their role-specific dashboards (keeping existing logic for backward compatibility)
  useEffect(() => {
    if (!authLoading && user) {
      const role = user.role?.toLowerCase() || '';
      if (role === 'secretary') {
        router.replace('/admin/secretary/home');
      } else if (role === 'chairman') {
        router.replace('/admin/chairman/home');
      } else if (role === 'vice chairman') {
        router.replace('/admin/vice-chairman/home');
      } else if (role === 'manager') {
        router.replace('/admin/manager/home');
      } else if (role === 'treasurer') {
        router.replace('/admin/treasurer/home');
      } else if (role === 'board of directors') {
        router.replace('/admin/bod/home');
      }
      // Admin users stay on this page
    }
  }, [user, authLoading, router]);

  // Filter savings based on selected filter
  useEffect(() => {
    if (savingsFilter === 'all') {
      setFilteredSavings(savingsLeaderboard);
    } else {
      // For demo purposes, we'll filter based on when the data was created
      // In a real implementation, you would filter based on actual transaction dates
      const now = new Date();
      let filteredData = [...savingsLeaderboard];
      
      if (savingsFilter === 'daily') {
        // Show all data for daily view
        filteredData = savingsLeaderboard;
      } else if (savingsFilter === 'monthly') {
        // Filter for current month
        filteredData = savingsLeaderboard.filter(entry => entry.totalSavings > 0);
      } else if (savingsFilter === 'yearly') {
        // Filter for current year
        filteredData = savingsLeaderboard.filter(entry => entry.totalSavings > 0);
      }
      
      setFilteredSavings(filteredData);
    }
  }, [savingsLeaderboard, savingsFilter]);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch all required data in parallel
        const [
          membersResult,
          loanRequestsResult,
          loansResult,
          approvedLoansResult,
          savingsResult
        ] = await Promise.all([
          // Total Members: Count only members with active status
          firestore.queryDocuments('members', [
            { field: 'status', operator: '==', value: 'active' }
          ]),
          
          // Pending Loan Requests: Count records with status = "pending"
          firestore.queryDocuments('loanRequests', [
            { field: 'status', operator: '==', value: 'pending' }
          ]),
          
          // Active Loans: Count loans where status = "active"
          firestore.queryDocuments('loans', [
            { field: 'status', operator: '==', value: 'active' }
          ]),
          
          // Approved Loans: Count loans where status = "approved"
          firestore.queryDocuments('loans', [
            { field: 'status', operator: '==', value: 'approved' }
          ]),
          
          // All savings transactions
          firestore.getCollection('savings')
        ]);

        // Process members data
        let totalMembers = 0;
        if (membersResult.success && membersResult.data) {
          totalMembers = membersResult.data.length;
        } else {
          console.error('Error fetching members:', membersResult.error);
          // Try fetching all members if the query fails
          const allMembersResult = await firestore.getCollection('members');
          if (allMembersResult.success && allMembersResult.data) {
            // Filter active members client-side
            totalMembers = allMembersResult.data.filter((member: any) => member.status === 'active').length;
          }
        }

        // Process pending loan requests
        let pendingRequests = 0;
        if (loanRequestsResult.success && loanRequestsResult.data) {
          pendingRequests = loanRequestsResult.data.length;
        } else {
          console.error('Error fetching loan requests:', loanRequestsResult.error);
          // Try fetching all loan requests if the query fails
          const allLoanRequestsResult = await firestore.getCollection('loanRequests');
          if (allLoanRequestsResult.success && allLoanRequestsResult.data) {
            // Filter pending requests client-side
            pendingRequests = allLoanRequestsResult.data.filter((req: any) => req.status === 'pending').length;
          }
        }

        // Process active loans
        let activeLoans = 0;
        if (loansResult.success && loansResult.data) {
          activeLoans = loansResult.data.length;
        } else {
          console.error('Error fetching loans:', loansResult.error);
          // Try fetching all loans if the query fails
          const allLoansResult = await firestore.getCollection('loans');
          if (allLoansResult.success && allLoansResult.data) {
            // Filter active loans client-side
            activeLoans = allLoansResult.data.filter((loan: any) => loan.status === 'active').length;
          }
        }

        // Process approved loans
        let totalApprovedLoans = 0;
        if (approvedLoansResult.success && approvedLoansResult.data) {
          totalApprovedLoans = approvedLoansResult.data.length;
        } else {
          console.error('Error fetching approved loans:', approvedLoansResult.error);
          // Try fetching all loans if the query fails
          const allLoansResult = await firestore.getCollection('loans');
          if (allLoansResult.success && allLoansResult.data) {
            // Filter approved loans client-side
            totalApprovedLoans = allLoansResult.data.filter((loan: any) => loan.status === 'approved').length;
          }
        }

        // Process savings leaderboard
        let savingsLeaderboardData: SavingsLeaderboardEntry[] = [];
        let totalSavings = 0;
        
        if (savingsResult.success && savingsResult.data) {
          const savingsTransactions = savingsResult.data as SavingsTransaction[];
          
          // Group transactions by member
          const memberTransactionsMap: Record<string, SavingsTransaction[]> = {};
          savingsTransactions.forEach(transaction => {
            if (transaction.memberId) {
              if (!memberTransactionsMap[transaction.memberId]) {
                memberTransactionsMap[transaction.memberId] = [];
              }
              memberTransactionsMap[transaction.memberId].push(transaction);
            }
          });

          // Get members data to join with savings
          let members: Member[] = [];
          try {
            const membersResultAll = await firestore.getCollection('members');
            if (membersResultAll.success && membersResultAll.data) {
              members = membersResultAll.data as Member[];
            } else {
              console.error('Error fetching members for savings join:', membersResultAll.error);
              // Try to get members with active status
              const activeMembersResult = await firestore.queryDocuments('members', [
                { field: 'status', operator: '==', value: 'active' }
              ]);
              if (activeMembersResult.success && activeMembersResult.data) {
                members = activeMembersResult.data as Member[];
              }
            }
          } catch (error) {
            console.error('Error fetching members for savings join:', error);
          }

          // Calculate total savings per member
          savingsLeaderboardData = members
            .map(member => {
              const memberTransactions = memberTransactionsMap[member.id] || [];
              const totalSavingsForMember = calculateMemberSavings(memberTransactions);
              
              return {
                memberId: member.id,
                fullName: `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Unknown',
                role: member.role || 'Member',
                totalSavings: totalSavingsForMember
              };
            })
            .sort((a, b) => b.totalSavings - a.totalSavings); // Sort by total savings (descending)
        } else {
          console.error('Error fetching savings:', savingsResult.error);
        }

        // Calculate total savings across all members
        totalSavings = savingsLeaderboardData.reduce((sum, entry) => sum + entry.totalSavings, 0);

        // Update state with fetched data
        setStats({
          totalMembers: totalMembers || 0,
          activeLoans: activeLoans || 0,
          pendingRequests: pendingRequests || 0,
          totalApprovedLoans: totalApprovedLoans || 0
        });

        setSavingsLeaderboard(savingsLeaderboardData || []);
        setFilteredSavings(savingsLeaderboardData || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Mock chart data based on fetched data
  const loanData = [
    { name: 'Total Members', count: stats.totalMembers },
    { name: 'Active Loans', count: stats.activeLoans },
    { name: 'Pending Requests', count: stats.pendingRequests },
    { name: 'Approved Loans', count: stats.totalApprovedLoans },
  ];

  // Render a loading skeleton
  if (loading || authLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
        <p className="text-gray-600">Welcome to the cooperative management system</p>
      </div>
      
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div 
          className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push('/admin/members/records')}
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-600">Total Members</h2>
              <p className="text-2xl font-bold text-gray-900">{stats.totalMembers.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div 
          className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push('/admin/loans/records')}
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-600">Active Loans</h2>
              <p className="text-2xl font-bold text-gray-900">{stats.activeLoans}</p>
            </div>
          </div>
        </div>
        
        <div 
          className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push('/admin/loans/requests')}
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-600">Pending Requests</h2>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingRequests}</p>
            </div>
          </div>
        </div>

        <div 
          className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push('/admin/loans/requests')}
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-600">Approved Loans</h2>
              <p className="text-2xl font-bold text-gray-900">{stats.totalApprovedLoans}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Loan and Savings Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-800 mb-4">Overview</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={loanData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => 
                  ['Total Members', 'Active Loans', 'Pending Requests'].includes(value) 
                    ? value.toString() 
                    : formatCurrency(Number(value))
                } />
                <Tooltip formatter={(value, name) => 
                  ['Total Members', 'Active Loans', 'Pending Requests'].includes(name as string)
                    ? [value, name]
                    : [formatCurrency(Number(value)), name]
                } />
                <Legend />
                <Bar dataKey="count" fill="#0088FE" name="Counts" />
                <Bar dataKey="amount" fill="#FFBB28" name="Amount" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      
        {/* All Members Savings */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-800">Member Savings</h2>
            <select 
              value={savingsFilter}
              onChange={(e) => setSavingsFilter(e.target.value as any)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Time</option>
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {filteredSavings && filteredSavings.length > 0 ? (
              filteredSavings.map((entry, index) => (
                <div key={entry.memberId || index} className="flex items-center justify-between p-3 border-b border-gray-100">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-500 w-6">{index + 1}.</span>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{entry.fullName}</p>
                      <p className="text-xs text-gray-500">{entry.role}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(entry.totalSavings)}</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No savings data available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}