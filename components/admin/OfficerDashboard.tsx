'use client';

import { useEffect, useState } from 'react';
import { firestore } from '@/lib/firebase';
import { Card } from '@/components/admin';
import { Users, FileText, DollarSign } from 'lucide-react';

interface DashboardStats {
  totalMembers: number;
  activeLoans: number;
  loanRequests: number;
}

export default function OfficerDashboard({ role }: { role: string }) {
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    activeLoans: 0,
    loanRequests: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch total members from members collection
        const membersResult = await firestore.getCollection('members');
        const totalMembers = membersResult.success && membersResult.data ? membersResult.data.length : 0;

        // Fetch active loans from loans collection where status is "active"
        const activeLoansResult = await firestore.queryDocuments(
          'loans',
          [{ field: 'status', operator: '==', value: 'active' }]
        );
        const activeLoans = activeLoansResult.success && activeLoansResult.data ? activeLoansResult.data.length : 0;

        // Fetch pending loan requests from loanRequests collection where status is "pending"
        const loanRequestsResult = await firestore.queryDocuments(
          'loanRequests',
          [{ field: 'status', operator: '==', value: 'pending' }]
        );
        const loanRequests = loanRequestsResult.success && loanRequestsResult.data ? loanRequestsResult.data.length : 0;

        // Check loans collection for pending status as well, and combine with loanRequests if needed
        const pendingLoansResult = await firestore.queryDocuments(
          'loans',
          [{ field: 'status', operator: '==', value: 'pending' }]
        );
        const pendingLoans = pendingLoansResult.success && pendingLoansResult.data ? pendingLoansResult.data.length : 0;
        
        // Use the sum of loan requests and pending loans
        const totalLoanRequests = loanRequests + pendingLoans;
        
        setStats({
          totalMembers,
          activeLoans,
          loanRequests: totalLoanRequests
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Set default values in case of error
        setStats({
          totalMembers: 0,
          activeLoans: 0,
          loanRequests: 0
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
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">{capitalizeRole(role)} Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            <h3 className="text-sm font-medium text-gray-800">Loan Requests</h3>
            <FileText className="h-4 w-4 text-gray-500" />
          </div>
          <div className="p-6">
            <div className="text-2xl font-bold">{stats.loanRequests}</div>
            <p className="text-xs text-gray-500">Pending loan applications</p>
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