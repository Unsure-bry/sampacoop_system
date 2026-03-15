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
        
        // Fetch all required data in parallel with better error handling
        const [
          membersResult,
          loanRequestsResult,
          loansResult,
          savingsResult
        ] = await Promise.all([
          // Total Members: Get all members
          (async () => {
            try {
              console.log('Fetching all members from Firestore...');
              const allMembers = await firestore.getCollection('members');
              console.log('Members fetch result:', { 
                success: allMembers.success, 
                count: allMembers.data?.length || 0,
                error: allMembers.error 
              });
              if (allMembers.success && allMembers.data) {
                // Log sample member data for debugging
                console.log('Sample members:', allMembers.data.slice(0, 3).map((m: any) => ({
                  id: m.id,
                  firstName: m.firstName,
                  lastName: m.lastName,
                  status: m.status
                })));
                // Return ALL members regardless of status
                return allMembers;
              }
              return allMembers;
            } catch (error) {
              console.error('Error fetching members:', error);
              return { success: false, data: [], error: 'Failed to fetch members' };
            }
          })(),
          
          // Pending Loan Requests: First try query, fallback to get all
          (async () => {
            try {
              const result = await firestore.queryDocuments('loanRequests', [
                { field: 'status', operator: '==', value: 'pending' }
              ]);
              if (result.success && result.data) {
                return result;
              }
              // Fallback: get all loan requests and filter client-side
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
              // Final fallback
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
          
          // Loans data: Get all loans once and filter for both active and approved
          (async () => {
            try {
              return await firestore.getCollection('loans');
            } catch (error) {
              console.error('Error fetching loans:', error);
              return { success: false, data: [], error: 'Failed to fetch loans' };
            }
          })(),
          
          // All savings transactions with enhanced error handling
          (async () => {
            try {
              // First, try to get savings from the main savings collection
              const mainSavingsResult = await firestore.getCollection('savings');
              
              // Also get all members to check their individual savings subcollections
              const membersResult = await firestore.getCollection('members');
              
              let allSavingsTransactions: any[] = [];
              
              // Process main savings collection
              if (mainSavingsResult.success && mainSavingsResult.data) {
                console.log('Main savings collection data:', mainSavingsResult.data.length, 'transactions');
                allSavingsTransactions = [...mainSavingsResult.data];
              }
              
              // Process individual member savings subcollections
              if (membersResult.success && membersResult.data) {
                console.log('Processing', membersResult.data.length, 'members for individual savings');
                
                // Process each member's savings subcollection
                for (const member of membersResult.data) {
                  const memberId = member.id;
                  if (memberId) {
                    try {
                      const memberSavingsResult = await firestore.getCollection(`members/${memberId}/savings`);
                      if (memberSavingsResult.success && memberSavingsResult.data) {
                        console.log(`Member ${memberId} has`, memberSavingsResult.data.length, 'savings transactions');
                        
                        // Add member ID to each transaction for proper linking
                        const transactionsWithMemberId = memberSavingsResult.data.map((transaction: any) => ({
                          ...transaction,
                          memberId: memberId
                        }));
                        
                        allSavingsTransactions = [...allSavingsTransactions, ...transactionsWithMemberId];
                      }
                    } catch (memberError) {
                      console.warn(`Error fetching savings for member ${memberId}:`, memberError);
                    }
                  }
                }
              }
              
              console.log('Total savings transactions collected:', allSavingsTransactions.length);
              console.log('Sample transactions:', allSavingsTransactions.slice(0, 3));
              
              return { success: true, data: allSavingsTransactions };
            } catch (error) {
              console.error('Error fetching savings:', error);
              return { success: false, data: [], error: 'Failed to fetch savings' };
            }
          })()
        ]);

        // Process members data with comprehensive error handling
        let totalMembers = 0;
        if (membersResult.success && membersResult.data) {
          totalMembers = membersResult.data.length;
        } else {
          console.error('Failed to fetch members data:', membersResult.error);
          // Set to 0 if we can't fetch reliable data
          totalMembers = 0;
        }

        // Process pending loan requests with comprehensive error handling
        let pendingRequests = 0;
        if (loanRequestsResult.success && loanRequestsResult.data) {
          pendingRequests = loanRequestsResult.data.length;
        } else {
          console.error('Failed to fetch loan requests data:', loanRequestsResult.error);
          // Set to 0 if we can't fetch reliable data
          pendingRequests = 0;
        }

        // Process loans for both active and approved counts
        let activeLoans = 0;
        let totalApprovedLoans = 0;
        
        if (loansResult.success && loansResult.data) {
          const loans = loansResult.data as Loan[];
          activeLoans = loans.filter(loan => loan.status === 'active').length;
          totalApprovedLoans = loans.filter(loan => loan.status === 'approved').length;
        } else {
          console.error('Failed to fetch loans data:', loansResult.error);
          // Set to 0 if we can't fetch reliable data
          activeLoans = 0;
          totalApprovedLoans = 0;
        }

        // Process savings leaderboard with enhanced error handling
        let savingsLeaderboardData: SavingsLeaderboardEntry[] = [];
        let totalSavings = 0;
        
        if (savingsResult.success && savingsResult.data) {
          const savingsTransactions = savingsResult.data as SavingsTransaction[];
          
          // Group transactions by member
          const memberTransactionsMap: Record<string, SavingsTransaction[]> = {};
          
          console.log('Processing', savingsTransactions.length, 'savings transactions');
          
          savingsTransactions.forEach((transaction, index) => {
            // Log first few transactions for debugging
            if (index < 3) {
              console.log(`Transaction ${index + 1}:`, {
                id: transaction.id,
                memberId: transaction.memberId,
                amount: transaction.amount,
                type: transaction.type,
                createdAt: transaction.createdAt
              });
            }
            
            // Validate transaction data - handle multiple possible ID fields
            let memberId = transaction.memberId || transaction.userId || transaction.uid;
            
            if (memberId && typeof memberId === 'string') {
              // Normalize the member ID
              memberId = memberId.trim();
              
              if (!memberTransactionsMap[memberId]) {
                memberTransactionsMap[memberId] = [];
              }
              memberTransactionsMap[memberId].push({
                ...transaction,
                memberId: memberId // Ensure memberId is set
              });
            } else {
              console.warn('Transaction missing valid member ID:', transaction);
            }
          });
          
          console.log('Grouped transactions by', Object.keys(memberTransactionsMap).length, 'members');
          console.log('Members with transactions:', Object.keys(memberTransactionsMap));

          // Get ALL members data to ensure every account is included
          let members: Member[] = [];
          try {
            const membersResultAll = await firestore.getCollection('members');
            if (membersResultAll.success && membersResultAll.data) {
              members = membersResultAll.data as Member[];
              console.log('Fetched', members.length, 'members for savings leaderboard');
              
              // Log sample members for debugging
              console.log('Sample members:', members.slice(0, 3).map(m => ({
                id: m.id,
                firstName: m.firstName,
                lastName: m.lastName,
                email: m.email,
                role: m.role
              })));
            } else {
              console.error('Error fetching members for savings leaderboard:', membersResultAll.error);
              // Last resort: return empty array to prevent crash
              members = [];
              console.error('Could not fetch any members data for savings leaderboard');
            }
          } catch (error) {
            console.error('Critical error fetching members for savings leaderboard:', error);
            members = []; // Prevent crash
          }

          // Calculate total savings for ALL members (including those with zero savings)
          savingsLeaderboardData = members
            .map(member => {
              const memberId = member.id || member.uid || ''; // Handle both id and uid fields
              if (!memberId) {
                console.warn('Skipping member without valid ID:', member);
                return null; // Skip members without valid IDs
              }
              
              // Try multiple ways to find transactions for this member
              let memberTransactions = memberTransactionsMap[memberId] || [];
              
              // If no transactions found by direct ID match, try alternative matching
              if (memberTransactions.length === 0) {
                // Try matching by email if available
                if (member.email) {
                  const emailMatches = Object.entries(memberTransactionsMap)
                    .filter(([transMemberId]) => {
                      // Try to find a member with matching email
                      const transMember = members.find(m => m.id === transMemberId);
                      return transMember && transMember.email === member.email;
                    });
                  
                  if (emailMatches.length > 0) {
                    memberTransactions = emailMatches[0][1];
                    console.log(`Found transactions for member ${memberId} by email match (${member.email})`);
                  }
                }
              }
              
              const totalSavingsForMember = calculateMemberSavings(memberTransactions);
              
              // Validate member name
              const firstName = member.firstName || '';
              const lastName = member.lastName || '';
              const fullName = `${firstName} ${lastName}`.trim() || 'Unknown User';
              
              if (fullName === 'Unknown User') {
                console.warn('Member with invalid name data:', member);
                return null;
              }
              
              // Log members with savings for debugging
              if (totalSavingsForMember > 0) {
                console.log(`${fullName} (${memberId}): ${totalSavingsForMember} PHP from ${memberTransactions.length} transactions`);
              }
              
              return {
                memberId: memberId,
                fullName: fullName,
                role: member.role || 'Member',
                totalSavings: totalSavingsForMember
              };
            })
            .filter((entry): entry is SavingsLeaderboardEntry => {
              // Include all valid members, exclude null entries
              return entry !== null && 
                     entry.memberId !== '' && 
                     entry.fullName !== 'Unknown User' &&
                     typeof entry.totalSavings === 'number' &&
                     !isNaN(entry.totalSavings);
            })
            .sort((a, b) => {
              // Sort by total savings (descending), then by name for ties
              if (b.totalSavings !== a.totalSavings) {
                return b.totalSavings - a.totalSavings;
              }
              return a.fullName.localeCompare(b.fullName);
            });
          
          // Log the final leaderboard for debugging
          console.log('Final savings leaderboard (' + savingsLeaderboardData.length + ' members):');
          savingsLeaderboardData.slice(0, 10).forEach((entry, index) => {
            console.log(`${index + 1}. ${entry.fullName}: ${entry.totalSavings} PHP`);
          });
        } else {
          console.error('Error fetching savings data:', savingsResult.error);
          // Return empty array instead of crashing
          savingsLeaderboardData = [];
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
        <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
        <p className="text-gray-600">Welcome to the cooperative management system</p>
      </div>
      
      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <div 
          className="bg-white rounded-lg shadow p-4 sm:p-6 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push('/admin/members/records')}
        >
          <div className="flex items-center">
            <div className="p-2 sm:p-3 rounded-full bg-blue-100 text-blue-600">
              <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-3 sm:ml-4">
              <h2 className="text-xs sm:text-sm font-medium text-gray-600">Total Members</h2>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalMembers.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div 
          className="bg-white rounded-lg shadow p-4 sm:p-6 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push('/admin/loans/records')}
        >
          <div className="flex items-center">
            <div className="p-2 sm:p-3 rounded-full bg-green-100 text-green-600">
              <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3 sm:ml-4">
              <h2 className="text-xs sm:text-sm font-medium text-gray-600">Active Loans</h2>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.activeLoans}</p>
            </div>
          </div>
        </div>
        
        <div 
          className="bg-white rounded-lg shadow p-4 sm:p-6 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push('/admin/loans/requests')}
        >
          <div className="flex items-center">
            <div className="p-2 sm:p-3 rounded-full bg-yellow-100 text-yellow-600">
              <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="ml-3 sm:ml-4">
              <h2 className="text-xs sm:text-sm font-medium text-gray-600">Pending Requests</h2>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.pendingRequests}</p>
            </div>
          </div>
        </div>

        <div 
          className="bg-white rounded-lg shadow p-4 sm:p-6 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push('/admin/loans/requests')}
        >
          <div className="flex items-center">
            <div className="p-2 sm:p-3 rounded-full bg-purple-100 text-purple-600">
              <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3 sm:ml-4">
              <h2 className="text-xs sm:text-sm font-medium text-gray-600">Approved Loans</h2>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalApprovedLoans}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Loan and Savings Chart */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-medium text-gray-800 mb-4">Overview</h2>
          <div className="h-64 sm:h-80">
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
                <YAxis tickFormatter={(value) => value.toString()} />
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
      
        {/* Member Savings Leaderboard */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">Savings Leaderboard</h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Top members by total savings</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs sm:text-sm text-gray-600">Filter:</span>
              <select 
                value={savingsFilter}
                onChange={(e) => setSavingsFilter(e.target.value as any)}
                className="text-xs sm:text-sm text-gray-900 bg-white border border-gray-300 rounded-md px-2 sm:px-3 py-1 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="all" className="text-gray-900">All Time</option>
                <option value="daily" className="text-gray-900">Daily</option>
                <option value="monthly" className="text-gray-900">Monthly</option>
                <option value="yearly" className="text-gray-900">Yearly</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-2 sm:space-y-3 max-h-80 overflow-y-auto">
            {filteredSavings && filteredSavings.length > 0 ? (
              filteredSavings.map((entry, index) => (
                <div 
                  key={entry.memberId || index} 
                  className={`flex items-center justify-between p-3 sm:p-4 rounded-lg transition-all duration-200 ${
                    index === 0 ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 shadow-sm' : 
                    index === 1 ? 'bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200' : 
                    index === 2 ? 'bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200' : 
                    'bg-gray-50 hover:bg-gray-100 border border-gray-100'
                  }`}
                >
                  <div className="flex items-center min-w-0 flex-1">
                    <div className={`flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm ${
                      index === 0 ? 'bg-yellow-500 text-white' : 
                      index === 1 ? 'bg-gray-400 text-white' : 
                      index === 2 ? 'bg-amber-600 text-white' : 
                      'bg-gray-300 text-gray-700'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="ml-3 sm:ml-4 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{entry.fullName}</p>
                      <p className="text-xs text-gray-600">{entry.role}</p>
                    </div>
                  </div>
                  <div className="text-right ml-2">
                    <p className="font-bold text-base sm:text-lg text-gray-900">{formatCurrency(entry.totalSavings)}</p>
                    <p className="text-xs text-gray-500 hidden sm:block">
                      {entry.totalSavings > 0 
                        ? `${((entry.totalSavings / (filteredSavings[0]?.totalSavings || 1)) * 100).toFixed(1)}% of leader` 
                        : 'No savings yet'}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                  <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No Savings Data</h3>
                <p className="text-gray-500">No savings transactions found in the database</p>
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
    </div>
  );
}