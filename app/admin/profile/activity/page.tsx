'use client';

import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Import the ActivityLog interface from the activity logger
import { ActivityLog, getUserActivityLogs } from '@/lib/activityLogger';

export default function AdminActivityLogPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [filter, setFilter] = useState<'daily' | 'monthly' | 'all'>('all');
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/admin/login');
    } else if (user && user.role !== 'admin' && !user.role?.includes('admin')) {
      // Check if user has admin role
      const adminRoles = ['admin', 'secretary', 'chairman', 'vice chairman', 'manager', 'treasurer', 'board of directors'];
      const normalizedRole = user.role?.toLowerCase() || '';
      if (!adminRoles.includes(normalizedRole)) {
        router.push('/admin/login');
      }
    }
    
    // Fetch real activity logs from Firestore
    const fetchActivityLogs = async () => {
      setIsLoading(true);
      try {
        if (user) {
          // Fetch user-specific activity logs
          const result = await getUserActivityLogs(user.uid);
          if (result.success && result.data) {
            setActivityLogs(result.data);
            setFilteredLogs(result.data);
          } else {
            console.error('Failed to fetch activity logs:', result.error || 'No data returned');
            // Set empty arrays if fetch fails
            setActivityLogs([]);
            setFilteredLogs([]);
          }
        }
      } catch (error) {
        console.error('Error fetching activity logs:', error);
        // Set empty arrays on error
        setActivityLogs([]);
        setFilteredLogs([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user) {
      fetchActivityLogs();
    } else {
      setIsLoading(false);
    }
  }, [user, loading, router]);

  // Apply filter when filter changes
  useEffect(() => {
    let filtered: ActivityLog[];
    
    if (filter === 'all') {
      filtered = [...activityLogs];
    } else {
      const now = new Date();
      filtered = activityLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        
        if (filter === 'daily') {
          return (
            logDate.getDate() === now.getDate() &&
            logDate.getMonth() === now.getMonth() &&
            logDate.getFullYear() === now.getFullYear()
          );
        } else if (filter === 'monthly') {
          return (
            logDate.getMonth() === now.getMonth() &&
            logDate.getFullYear() === now.getFullYear()
          );
        }
        return true;
      });
    }
    
    setFilteredLogs(filtered);
  }, [filter, activityLogs]);

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Activity Log</h1>
              <p className="text-gray-600 mt-1">View your recent system activities and actions</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Filter:</span>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'daily' | 'monthly' | 'all')}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="all">All Time</option>
                <option value="daily">Today</option>
                <option value="monthly">This Month</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Address
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User Agent
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{log.action}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(log.timestamp).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{log.ipAddress || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500 truncate max-w-xs">{log.userAgent || 'N/A'}</div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                        No activity logs found for the selected period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {filteredLogs.length === 0 && (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No activity logs</h3>
                <p className="mt-1 text-sm text-gray-500">
                  There are no activity logs to display for the selected period.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}