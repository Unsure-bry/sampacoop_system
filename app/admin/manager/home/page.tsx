'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

import { firestore } from '@/lib/firebase';
import { Users, FileText, DollarSign, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Types for our data
interface Member {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  createdAt: string;
  uid?: string;
  [key: string]: unknown;
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
  status: 'active' | 'completed' | 'rejected' | 'approved';
  amount: number;
  term: number;
  userId: string;
  startDate: string;
  endDate: string;
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

interface SavingsTransaction {
  id: string;
  memberId: string;
  userId?: string;
  uid?: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  createdAt: string;
  date?: string;
  timestamp?: any;
  [key: string]: any;
}

export default function ManagerHomePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    activeLoans: 0,
    pendingRequests: 0,
    totalApprovedLoans: 0,
  });
  const [loading, setLoading] = useState(true);
  const [savingsLeaderboard, setSavingsLeaderboard] = useState<SavingsLeaderboardEntry[]>([]);
  const [filteredSavings, setFilteredSavings] = useState<SavingsLeaderboardEntry[]>([]);
  const [savingsFilter, setSavingsFilter] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/admin/login');
    } else if (user && user.role?.toLowerCase() !== 'manager') {
      router.push('/admin/unauthorized');
    }
  }, [user, authLoading, router]);

  // Calculate total savings for a member from transactions
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

  // Filter transactions by date range
  const filterTransactionsByDate = (
    transactions: SavingsTransaction[], 
    filter: 'monthly' | 'yearly'
  ): SavingsTransaction[] => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    return transactions.filter(transaction => {
      let transactionDate: Date;
      
      if (transaction.createdAt) {
        transactionDate = new Date(transaction.createdAt);
      } else if (transaction.date) {
        transactionDate = new Date(transaction.date);
      } else if (transaction.timestamp?.toDate) {
        transactionDate = transaction.timestamp.toDate();
      } else {
        return false;
      }
      
      if (filter === 'monthly') {
        return transactionDate.getFullYear() === currentYear && 
               transactionDate.getMonth() === currentMonth;
      } else {
        return transactionDate.getFullYear() === currentYear;
      }
    });
  };

  // Filter savings based on selected filter
  useEffect(() => {
    const filterSavings = async () => {
      if (savingsLeaderboard.length === 0) {
        setFilteredSavings([]);
        return;
      }

      try {
        // Fetch all members to get their savings data
        const membersResult = await firestore.getCollection('members');
        
        if (!membersResult.success || !membersResult.data) {
          setFilteredSavings(savingsLeaderboard);
          return;
        }

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        // Process each member's savings
        const processedLeaderboard = await Promise.all(
          savingsLeaderboard.map(async (entry) => {
            try {
              // Fetch savings transactions from member's subcollection
              const savingsResult = await firestore.getCollection(`members/${entry.memberId}/savings`);
              
              if (!savingsResult.success || !savingsResult.data || savingsResult.data.length === 0) {
                // Check if member has totalSavings field
                const memberDoc = (membersResult.data as any[]).find((m: any) => m.id === entry.memberId);
                const memberTotalSavings = memberDoc?.totalSavings;
                if (memberTotalSavings && memberTotalSavings > 0) {
                  return { ...entry, totalSavings: Number(memberTotalSavings) };
                }
                return { ...entry, totalSavings: 0 };
              }

              const transactions = savingsResult.data as SavingsTransaction[];
              
              // Filter transactions by date
              const filteredTransactions = transactions.filter(transaction => {
                let transactionDate: Date | null = null;
                
                if (transaction.createdAt) {
                  transactionDate = new Date(transaction.createdAt);
                } else if (transaction.date) {
                  transactionDate = new Date(transaction.date);
                } else if (transaction.timestamp?.toDate) {
                  transactionDate = transaction.timestamp.toDate();
                } else if (transaction.timestamp?.seconds) {
                  transactionDate = new Date(transaction.timestamp.seconds * 1000);
                }
                
                if (!transactionDate || isNaN(transactionDate.getTime())) {
                  return false;
                }
                
                if (savingsFilter === 'monthly') {
                  return transactionDate.getFullYear() === currentYear && 
                         transactionDate.getMonth() === currentMonth;
                } else {
                  return transactionDate.getFullYear() === currentYear;
                }
              });

              // Calculate total savings from filtered transactions
              const totalSavings = filteredTransactions.reduce((total, transaction) => {
                const amount = Number(transaction.amount) || 0;
                if (transaction.type === 'deposit') {
                  return total + amount;
                } else if (transaction.type === 'withdrawal') {
                  return total - amount;
                }
                return total;
              }, 0);

              return { ...entry, totalSavings: Math.max(0, totalSavings) };
            } catch (error) {
              console.warn(`Error processing savings for member ${entry.memberId}:`, error);
              return { ...entry, totalSavings: 0 };
            }
          })
        );

        // Filter out zero savings and sort
        const filteredLeaderboard = processedLeaderboard
          .filter(entry => entry.totalSavings > 0)
          .sort((a, b) => b.totalSavings - a.totalSavings);

        setFilteredSavings(filteredLeaderboard);
      } catch (error) {
        console.error('Error filtering savings:', error);
        setFilteredSavings(savingsLeaderboard.filter(entry => entry.totalSavings > 0));
      }
    };

    filterSavings();
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
          loansResult
        ] = await Promise.all([
          // Total Members
          (async () => {
            try {
              const result = await firestore.queryDocuments('members', [
                { field: 'status', operator: '==', value: 'active' }
              ]);
              if (result.success && result.data) {
                return result;
              }
              const allMembers = await firestore.getCollection('members');
              if (allMembers.success && allMembers.data) {
                return {
                  ...allMembers,
                  data: allMembers.data.filter((member: any) => member.status === 'active')
                };
              }
              return allMembers;
            } catch (error) {
              console.error('Error in members query:', error);
              const allMembers = await firestore.getCollection('members');
              if (allMembers.success && allMembers.data) {
                return {
                  ...allMembers,
                  data: allMembers.data.filter((member: any) => member.status === 'active')
                };
              }
              return { success: false, data: [], error: 'Failed to fetch members' };
            }
          })(),
          
          // Pending Loan Requests
          (async () => {
            try {
              const result = await firestore.queryDocuments('loanRequests', [
                { field: 'status', operator: '==', value: 'pending' }
              ]);
              if (result.success && result.data) {
                return result;
              }
              const allRequests = await firestore.getCollection('loanRequests');
              if (allRequests.success && allRequests.data) {
                return {
                  ...allRequests,
                  data: allRequests.data.filter((request: any) => request.status === 'pending')
                };
              }
              return allRequests;
            } catch (error) {
              console.error('Error in loan requests query:', error);
              const allRequests = await firestore.getCollection('loanRequests');
              if (allRequests.success && allRequests.data) {
                return {
                  ...allRequests,
                  data: allRequests.data.filter((request: any) => request.status === 'pending')
                };
              }
              return { success: false, data: [], error: 'Failed to fetch loan requests' };
            }
          })(),
          
          // Loans data
          (async () => {
            try {
              return await firestore.getCollection('loans');
            } catch (error) {
              console.error('Error fetching loans:', error);
              return { success: false, data: [], error: 'Failed to fetch loans' };
            }
          })()
        ]);

        // Process members data
        let totalMembers = 0;
        if (membersResult.success && membersResult.data) {
          totalMembers = membersResult.data.length;
        }

        // Process pending loan requests
        let pendingRequests = 0;
        if (loanRequestsResult.success && loanRequestsResult.data) {
          pendingRequests = loanRequestsResult.data.length;
        }

        // Process loans
        let activeLoans = 0;
        let totalApprovedLoans = 0;
        
        if (loansResult.success && loansResult.data) {
          const loans = loansResult.data as Loan[];
          activeLoans = loans.filter(loan => loan.status === 'active').length;
          totalApprovedLoans = loans.filter(loan => loan.status === 'approved').length;
        }

        // Update state with fetched data
        setStats({
          totalMembers: totalMembers || 0,
          activeLoans: activeLoans || 0,
          pendingRequests: pendingRequests || 0,
          totalApprovedLoans: totalApprovedLoans || 0
        });

        // Process savings leaderboard data
        if (membersResult.success && membersResult.data) {
          const members = membersResult.data as Member[];
          
          // Calculate savings for each member by fetching their subcollection
          const leaderboardData = await Promise.all(
            members.map(async (member) => {
              const memberId = member.id || member.uid || '';
              if (!memberId) return null;
              
              try {
                // Fetch savings from member's subcollection
                const memberSavingsResult = await firestore.getCollection(`members/${memberId}/savings`);
                let totalSavings = 0;
                
                if (memberSavingsResult.success && memberSavingsResult.data && memberSavingsResult.data.length > 0) {
                  // Calculate total from all transactions
                  totalSavings = memberSavingsResult.data.reduce((total: number, transaction: any) => {
                    const amount = Number(transaction.amount) || 0;
                    if (transaction.type === 'deposit') {
                      return total + amount;
                    } else if (transaction.type === 'withdrawal') {
                      return total - amount;
                    }
                    return total;
                  }, 0);
                } else {
                  // Fallback to totalSavings field if exists
                  totalSavings = Number((member as any).totalSavings) || 0;
                }
                
                const firstName = member.firstName || '';
                const lastName = member.lastName || '';
                const fullName = `${firstName} ${lastName}`.trim() || 'Unknown User';
                
                if (fullName === 'Unknown User') return null;
                
                return {
                  memberId: memberId,
                  fullName: fullName,
                  role: member.role || 'Member',
                  totalSavings: totalSavings
                };
              } catch (error) {
                console.warn(`Error processing member ${memberId}:`, error);
                return null;
              }
            })
          );
          
          // Filter out nulls and sort
          const validLeaderboardData = leaderboardData
            .filter((entry): entry is SavingsLeaderboardEntry => entry !== null)
            .sort((a, b) => b.totalSavings - a.totalSavings);

          setSavingsLeaderboard(validLeaderboardData);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
      }
    };

    if (!authLoading && user && user.role?.toLowerCase() === 'manager') {
      fetchDashboardData();
    }
  }, [user, authLoading]);

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Render a loading skeleton
  if (loading || authLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2"></h1>
          <p className="text-gray-600"></p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              <div className="mt-2 h-3 bg-gray-100 rounded w-2/3"></div>
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="mt-4 h-4 bg-gray-100 rounded w-1/2"></div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, j) => (
                <div key={j} className="flex items-center justify-between p-2">
                  <div className="flex items-center">
                    <div className="h-4 bg-gray-200 rounded w-6 mr-3"></div>
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                      <div className="h-3 bg-gray-100 rounded w-16"></div>
                    </div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="text-center text-sm text-gray-500 mt-4">
          Fetching real-time data from Firestore database...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Manager Dashboard</h1>
        <p className="text-gray-600">Welcome to the cooperative management system</p>
      </div>
      
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div 
          className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push('/admin/manager/savings')}
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <Users className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-600">Total Members</h2>
              <p className="text-2xl font-bold text-gray-900">{stats.totalMembers.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div 
          className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push('/admin/manager/loans')}
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <DollarSign className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-600">Active Loans</h2>
              <p className="text-2xl font-bold text-gray-900">{stats.activeLoans}</p>
            </div>
          </div>
        </div>
        
        <div 
          className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push('/admin/manager/loans')}
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
              <FileText className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-600">Pending Requests</h2>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingRequests}</p>
            </div>
          </div>
        </div>

        <div 
          className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push('/admin/manager/loans')}
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-600">Approved Loans</h2>
              <p className="text-2xl font-bold text-gray-900">{stats.totalApprovedLoans}</p>
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
                { name: 'Active Loans', value: stats.activeLoans, color: '#10B981' },
                { name: 'Pending Requests', value: stats.pendingRequests, color: '#F59E0B' },
                { name: 'Approved Loans', value: stats.totalApprovedLoans, color: '#8B5CF6' },
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
                  { name: 'Active Loans', value: stats.activeLoans, color: '#10B981' },
                  { name: 'Pending Requests', value: stats.pendingRequests, color: '#F59E0B' },
                  { name: 'Approved Loans', value: stats.totalApprovedLoans, color: '#8B5CF6' },
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
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Filter:</span>
            <select 
              value={savingsFilter}
              onChange={(e) => setSavingsFilter(e.target.value as 'monthly' | 'yearly')}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>
        
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {filteredSavings && filteredSavings.length > 0 ? (
            filteredSavings.map((entry, index) => (
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
                    {entry.totalSavings > 0 && filteredSavings[0]?.totalSavings > 0
                      ? `${((entry.totalSavings / filteredSavings[0].totalSavings) * 100).toFixed(1)}% of leader` 
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
              <p className="text-gray-500">No savings transactions found for the selected period</p>
            </div>
          )}
        </div>
        
        {filteredSavings && filteredSavings.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Total Members: {filteredSavings.length}</span>
              <span>
                Total Savings: {formatCurrency(
                  filteredSavings.reduce((sum, entry) => sum + entry.totalSavings, 0)
                )}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
