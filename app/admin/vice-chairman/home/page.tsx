'use client';

import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/admin';
import { Users, FileText, DollarSign, BarChart3 } from 'lucide-react';

export default function ViceChairmanHomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalMembers: 0,
    loanRequests: 0,
    activeLoans: 0
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/admin/login');
    } else if (user && user.role?.toLowerCase() !== 'vice chairman') {
      router.push('/admin/unauthorized');
    }
  }, [user, loading, router]);

  // Mock data - in a real app, this would come from Firestore
  useEffect(() => {
    setStats({
      totalMembers: 124,
      loanRequests: 8,
      activeLoans: 23
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Vice Chairman Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-gray-800">Total Members</h3>
            <Users className="h-4 w-4 text-gray-500" />
          </div>
          <div className="p-6">
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
            <p className="text-xs text-gray-500">+12 from last month</p>
          </div>
        </Card>

        <Card>
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-gray-800">Loan Requests</h3>
            <FileText className="h-4 w-4 text-gray-500" />
          </div>
          <div className="p-6">
            <div className="text-2xl font-bold">{stats.loanRequests}</div>
            <p className="text-xs text-gray-500">+3 pending approval</p>
          </div>
        </Card>

        <Card>
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-gray-800">Active Loans</h3>
            <DollarSign className="h-4 w-4 text-gray-500" />
          </div>
          <div className="p-6">
            <div className="text-2xl font-bold">{stats.activeLoans}</div>
            <p className="text-xs text-gray-500">+5 from last month</p>
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
                  <p className="text-sm text-gray-500">John Doe - 2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium">Loan request submitted</p>
                  <p className="text-sm text-gray-500">Jane Smith - 5 hours ago</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium">Payment received</p>
                  <p className="text-sm text-gray-500">Robert Johnson - 1 day ago</p>
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
              <button 
                onClick={() => router.push('/admin/vice-chairman/members')}
                className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-gray-50"
              >
                <Users className="h-8 w-8 text-red-600 mb-2" />
                <span className="text-sm font-medium">Member Records</span>
              </button>
              <button 
                onClick={() => router.push('/admin/vice-chairman/loans')}
                className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-gray-50"
              >
                <FileText className="h-8 w-8 text-red-600 mb-2" />
                <span className="text-sm font-medium">Loan Records</span>
              </button>
              <button 
                onClick={() => router.push('/admin/vice-chairman/savings')}
                className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-gray-50"
              >
                <DollarSign className="h-8 w-8 text-red-600 mb-2" />
                <span className="text-sm font-medium">Savings Records</span>
              </button>
              <button 
                onClick={() => router.push('/admin/vice-chairman/reports')}
                className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-gray-50"
              >
                <BarChart3 className="h-8 w-8 text-red-600 mb-2" />
                <span className="text-sm font-medium">Reports</span>
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}