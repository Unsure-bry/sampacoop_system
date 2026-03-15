'use client';

import { useEffect, useState } from 'react';
import { firestore } from '@/lib/firebase';
import { Card } from '@/components/admin';
import { Users, FileText, DollarSign } from 'lucide-react';

interface DashboardStats {
  totalMembers: number;
  activeLoans: number;
  loanRequests: number;
  totalSavings: number;
  totalLoans: number;
  approvedLoans: number;
  rejectedLoans: number;
  completedLoans: number;
}

export default function OfficerDashboard({ role }: { role: string }) {
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    activeLoans: 0,
    loanRequests: 0,
    totalSavings: 0,
    totalLoans: 0,
    approvedLoans: 0,
    rejectedLoans: 0,
    completedLoans: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch total members from members collection
        const membersResult = await firestore.getCollection('members');
        const totalMembers = membersResult.success && membersResult.data ? membersResult.data.length : 0;

        // Fetch active loans from loans collection - fallback to client-side filtering
        let activeLoans = 0;
        try {
          const activeLoansResult = await firestore.queryDocuments(
            'loans',
            [{ field: 'status', operator: '==', value: 'active' }]
          );
          if (activeLoansResult.success && activeLoansResult.data) {
            activeLoans = activeLoansResult.data.length;
          } else {
            // Fallback: get all loans and filter client-side
            const allLoans = await firestore.getCollection('loans');
            if (allLoans.success && allLoans.data) {
              activeLoans = allLoans.data.filter((loan: any) => loan.status === 'active').length;
            }
          }
        } catch (error) {
          // Fallback: get all loans and filter client-side
          const allLoans = await firestore.getCollection('loans');
          if (allLoans.success && allLoans.data) {
            activeLoans = allLoans.data.filter((loan: any) => loan.status === 'active').length;
          }
        }

        // Fetch pending loan requests - fallback to client-side filtering
        let loanRequests = 0;
        try {
          const loanRequestsResult = await firestore.queryDocuments(
            'loanRequests',
            [{ field: 'status', operator: '==', value: 'pending' }]
          );
          if (loanRequestsResult.success && loanRequestsResult.data) {
            loanRequests = loanRequestsResult.data.length;
          } else {
            // Fallback: get all and filter client-side
            const allRequests = await firestore.getCollection('loanRequests');
            if (allRequests.success && allRequests.data) {
              loanRequests = allRequests.data.filter((req: any) => req.status === 'pending').length;
            }
          }
        } catch (error) {
          // Fallback: get all and filter client-side
          const allRequests = await firestore.getCollection('loanRequests');
          if (allRequests.success && allRequests.data) {
            loanRequests = allRequests.data.filter((req: any) => req.status === 'pending').length;
          }
        }

        // Check loans collection for pending status
        let pendingLoans = 0;
        try {
          const pendingLoansResult = await firestore.queryDocuments(
            'loans',
            [{ field: 'status', operator: '==', value: 'pending' }]
          );
          if (pendingLoansResult.success && pendingLoansResult.data) {
            pendingLoans = pendingLoansResult.data.length;
          }
        } catch (error) {
          // Ignore error - pendingLoans stays 0
        }
        
        // Use the sum of loan requests and pending loans
        const totalLoanRequests = loanRequests + pendingLoans;
        
        // Fetch additional stats
        const totalLoansResult = await firestore.getCollection('loans');
        if (!totalLoansResult.success) {
          throw new Error(`Failed to fetch total loans: ${totalLoansResult.error || 'Unknown error'}`);
        }
        const totalLoans = totalLoansResult.data ? totalLoansResult.data.length : 0;
        
        const approvedLoansResult = await firestore.queryDocuments(
          'loans',
          [{ field: 'status', operator: '==', value: 'approved' }]
        );
        if (!approvedLoansResult.success) {
          throw new Error(`Failed to fetch approved loans: ${approvedLoansResult.error || 'Unknown error'}`);
        }
        const approvedLoans = approvedLoansResult.data ? approvedLoansResult.data.length : 0;
        
        const rejectedLoansResult = await firestore.queryDocuments(
          'loans',
          [{ field: 'status', operator: '==', value: 'rejected' }]
        );
        if (!rejectedLoansResult.success) {
          throw new Error(`Failed to fetch rejected loans: ${rejectedLoansResult.error || 'Unknown error'}`);
        }
        const rejectedLoans = rejectedLoansResult.data ? rejectedLoansResult.data.length : 0;
        
        const completedLoansResult = await firestore.queryDocuments(
          'loans',
          [{ field: 'status', operator: '==', value: 'completed' }]
        );
        if (!completedLoansResult.success) {
          throw new Error(`Failed to fetch completed loans: ${completedLoansResult.error || 'Unknown error'}`);
        }
        const completedLoans = completedLoansResult.data ? completedLoansResult.data.length : 0;
        
        // Fetch total savings by calculating from members' savings data
        const membersResultForSavings = await firestore.getCollection('members');
        let totalSavings = 0;
        
        if (membersResultForSavings.success && membersResultForSavings.data) {
          for (const member of membersResultForSavings.data) {
            // Assuming members have a savings property or we calculate from their transactions
            const memberSavings = (member as any).savings?.total || 0;
            totalSavings += memberSavings;
          }
        }
        
        setStats({
          totalMembers,
          activeLoans,
          loanRequests: totalLoanRequests,
          totalSavings,
          totalLoans,
          approvedLoans,
          rejectedLoans,
          completedLoans
        });
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        // Set default values in case of error
        setStats({
          totalMembers: 0,
          activeLoans: 0,
          loanRequests: 0,
          totalSavings: 0,
          totalLoans: 0,
          approvedLoans: 0,
          rejectedLoans: 0,
          completedLoans: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const capitalizeRole = (role: string) => {
    return role
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">{capitalizeRole(role)} Dashboard</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, idx) => (
                <div key={idx} className="h-4 bg-gray-200 rounded w-full"></div>
              ))}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, idx) => (
                <div key={idx} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">{capitalizeRole(role)} Dashboard</h1>
        </div>
        
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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">{capitalizeRole(role)} Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-gray-800">Total Members</h3>
            <Users className="h-4 w-4 text-gray-500" />
          </div>
          <div className="p-6">
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
            <p className="text-xs text-gray-500">Registered members in the system</p>
          </div>
        </Card>

        <Card>
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-gray-800">Active Loans</h3>
            <DollarSign className="h-4 w-4 text-gray-500" />
          </div>
          <div className="p-6">
            <div className="text-2xl font-bold">{stats.activeLoans}</div>
            <p className="text-xs text-gray-500">Currently active loan agreements</p>
          </div>
        </Card>

        <Card>
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-gray-800">Pending Requests</h3>
            <FileText className="h-4 w-4 text-gray-500" />
          </div>
          <div className="p-6">
            <div className="text-2xl font-bold">{stats.loanRequests}</div>
            <p className="text-xs text-gray-500">Pending loan applications</p>
          </div>
        </Card>
        
        <Card>
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-gray-800">Total Loans</h3>
            <DollarSign className="h-4 w-4 text-gray-500" />
          </div>
          <div className="p-6">
            <div className="text-2xl font-bold">{stats.totalLoans}</div>
            <p className="text-xs text-gray-500">Total loan applications</p>
          </div>
        </Card>
        
        <Card>
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-gray-800">Approved Loans</h3>
            <FileText className="h-4 w-4 text-gray-500" />
          </div>
          <div className="p-6">
            <div className="text-2xl font-bold">{stats.approvedLoans}</div>
            <p className="text-xs text-gray-500">Approved loan applications</p>
          </div>
        </Card>
        
        <Card>
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-gray-800">Rejected Loans</h3>
            <FileText className="h-4 w-4 text-gray-500" />
          </div>
          <div className="p-6">
            <div className="text-2xl font-bold">{stats.rejectedLoans}</div>
            <p className="text-xs text-gray-500">Rejected loan applications</p>
          </div>
        </Card>
        
        <Card>
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-gray-800">Completed Loans</h3>
            <DollarSign className="h-4 w-4 text-gray-500" />
          </div>
          <div className="p-6">
            <div className="text-2xl font-bold">{stats.completedLoans}</div>
            <p className="text-xs text-gray-500">Completed loan agreements</p>
          </div>
        </Card>
        
        <Card>
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-gray-800">Total Savings</h3>
            <DollarSign className="h-4 w-4 text-gray-500" />
          </div>
          <div className="p-6">
            <div className="text-2xl font-bold">₱{stats.totalSavings.toLocaleString()}</div>
            <p className="text-xs text-gray-500">Total savings in the system</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-800">Recent Activities</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium">New member registered</p>
                  <p className="text-sm text-gray-500">Just now</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium">Loan request submitted</p>
                  <p className="text-sm text-gray-500">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium">Payment received</p>
                  <p className="text-sm text-gray-500">Yesterday</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-800">Quick Actions</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <button className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-gray-50">
                <Users className="h-8 w-8 text-red-600 mb-2" />
                <span className="text-sm font-medium">Member Records</span>
              </button>
              <button className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-gray-50">
                <FileText className="h-8 w-8 text-red-600 mb-2" />
                <span className="text-sm font-medium">Loan Requests</span>
              </button>
              <button className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-gray-50">
                <DollarSign className="h-8 w-8 text-red-600 mb-2" />
                <span className="text-sm font-medium">Savings Records</span>
              </button>
              <button className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-gray-50">
                <FileText className="h-8 w-8 text-red-600 mb-2" />
                <span className="text-sm font-medium">Membership</span>
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}