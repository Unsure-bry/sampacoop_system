'use client';

import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/admin';
import { BarChart3 } from 'lucide-react';

export default function ViceChairmanReportsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [filter, setFilter] = useState('monthly');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/admin/login');
    } else if (user && user.role?.toLowerCase() !== 'vice chairman') {
      router.push('/admin/unauthorized');
    }
  }, [user, loading, router]);

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
        <h1 className="text-3xl font-bold text-gray-900">Financial Reports</h1>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center">
          <input
            type="radio"
            id="monthly"
            name="filter"
            value="monthly"
            checked={filter === 'monthly'}
            onChange={() => setFilter('monthly')}
            className="h-4 w-4 text-red-600 focus:ring-red-500"
          />
          <label htmlFor="monthly" className="ml-2 block text-sm text-gray-700">
            Monthly
          </label>
        </div>
        <div className="flex items-center">
          <input
            type="radio"
            id="yearly"
            name="filter"
            value="yearly"
            checked={filter === 'yearly'}
            onChange={() => setFilter('yearly')}
            className="h-4 w-4 text-red-600 focus:ring-red-500"
          />
          <label htmlFor="yearly" className="ml-2 block text-sm text-gray-700">
            Yearly
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-800">Membership Statistics</h3>
          </div>
          <div className="p-6">
            <div className="h-64 flex items-center justify-center">
              <BarChart3 className="h-16 w-16 text-gray-400" />
              <span className="ml-4 text-gray-500">Membership statistics chart would appear here</span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-800">Active/Inactive Status</h3>
          </div>
          <div className="p-6">
            <div className="h-64 flex items-center justify-center">
              <BarChart3 className="h-16 w-16 text-gray-400" />
              <span className="ml-4 text-gray-500">Active/inactive status chart would appear here</span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-800">Savings Status</h3>
          </div>
          <div className="p-6">
            <div className="h-64 flex items-center justify-center">
              <BarChart3 className="h-16 w-16 text-gray-400" />
              <span className="ml-4 text-gray-500">Savings status chart would appear here</span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-800">Active Loan Count</h3>
          </div>
          <div className="p-6">
            <div className="h-64 flex items-center justify-center">
              <BarChart3 className="h-16 w-16 text-gray-400" />
              <span className="ml-4 text-gray-500">Active loan count chart would appear here</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}