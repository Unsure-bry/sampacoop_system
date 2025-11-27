'use client';

import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/admin';
import { Users, FileText, DollarSign, BarChart3 } from 'lucide-react';

export default function ChairmanHomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalMembers: 0,
    loanRequests: 0,
    activeLoans: 0,
    savings: 0
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/admin/login');
    } else if (user && user.role?.toLowerCase() !== 'chairman') {
      router.push('/admin/login');
    }
  }, [user, loading, router]);

  // Mock data - in a real app, this would come from Firestore
  useEffect(() => {
    setStats({
      totalMembers: 124,
      loanRequests: 8,
      activeLoans: 23,
      savings: 45678
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
        <h1 className="text-3xl font-bold text-gray-900">Chairman Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

        <Card>
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-gray-800">Total Savings</h3>
            <BarChart3 className="h-4 w-4 text-gray-500" />
          </div>
          <div className="p-6">
            <div className="text-2xl font-bold">₱{stats.savings.toLocaleString()}</div>
            <p className="text-xs text-gray-500">+₱12,450 from last month</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-800">Membership Statistics</h3>
          </div>
          <div className="p-6">
            <div className="h-64 flex items-center justify-center">
              <p className="text-gray-500">Membership chart would be displayed here</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-800">Financial Overview</h3>
          </div>
          <div className="p-6">
            <div className="h-64 flex items-center justify-center">
              <p className="text-gray-500">Financial chart would be displayed here</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}