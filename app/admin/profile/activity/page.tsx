'use client';

import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Import the ActivityLog interface from the activity logger
import { ActivityLog, getAllActivityLogs } from '@/lib/activityLogger';

// Activity type colors for visual distinction
const getActivityTypeColor = (action: string): string => {
  const actionLower = action.toLowerCase();
  if (actionLower.includes('approve')) return 'bg-green-100 text-green-800 border-green-200';
  if (actionLower.includes('reject')) return 'bg-red-100 text-red-800 border-red-200';
  if (actionLower.includes('payment') || actionLower.includes('deposit')) return 'bg-blue-100 text-blue-800 border-blue-200';
  if (actionLower.includes('withdrawal')) return 'bg-orange-100 text-orange-800 border-orange-200';
  if (actionLower.includes('login') || actionLower.includes('logout')) return 'bg-gray-100 text-gray-800 border-gray-200';
  if (actionLower.includes('create') || actionLower.includes('add')) return 'bg-purple-100 text-purple-800 border-purple-200';
  if (actionLower.includes('update') || actionLower.includes('edit')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  return 'bg-gray-100 text-gray-800 border-gray-200';
};

// Get activity icon based on action type
const getActivityIcon = (action: string) => {
  const actionLower = action.toLowerCase();
  if (actionLower.includes('approve')) return '✓';
  if (actionLower.includes('reject')) return '✗';
  if (actionLower.includes('payment') || actionLower.includes('deposit')) return '💰';
  if (actionLower.includes('withdrawal')) return '💸';
  if (actionLower.includes('login')) return '🔑';
  if (actionLower.includes('logout')) return '🚪';
  if (actionLower.includes('create') || actionLower.includes('add')) return '➕';
  if (actionLower.includes('update') || actionLower.includes('edit')) return '✎';
  return '📝';
};

export default function AdminActivityLogPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [filter, setFilter] = useState<'daily' | 'monthly' | 'all'>('all');
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
        // Fetch all activity logs (for admin view)
        const result = await getAllActivityLogs();
        if (result.success && result.data) {
          setActivityLogs(result.data);
          setFilteredLogs(result.data);
        } else {
          console.error('Failed to fetch activity logs:', result.error || 'No data returned');
          // Set empty arrays if fetch fails
          setActivityLogs([]);
          setFilteredLogs([]);
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
    setCurrentPage(1); // Reset to first page when filter changes
  }, [filter, activityLogs]);

  // Get current page logs
  const getCurrentPageLogs = (): ActivityLog[] => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredLogs.slice(startIndex, endIndex);
  };

  // Calculate total pages
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Generate pagination range with ellipsis
  const getPaginationRange = () => {
    const delta = 2; // Number of pages to show on each side of current page
    const range: (number | string)[] = [];
    
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 || // First page
        i === totalPages || // Last page
        (i >= currentPage - delta && i <= currentPage + delta) // Pages around current
      ) {
        range.push(i);
      } else if (
        range[range.length - 1] !== '...' && // Avoid multiple ellipsis
        (i < currentPage - delta || i > currentPage + delta)
      ) {
        range.push('...');
      }
    }
    
    return range;
  };

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
            <div className="flex items-center space-x-3 bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
              <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="text-gray-700 font-medium">Filter by:</span>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'daily' | 'monthly' | 'all')}
                className="border-2 border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 hover:border-gray-400 transition-colors cursor-pointer"
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
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                      User
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                      Action Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                      Action Details
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                      Timestamp
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                      Role
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLogs.length > 0 ? (
                    getCurrentPageLogs().map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-red-600">
                                {(log.userName || log.userEmail || 'U').charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {log.userName || log.userEmail || 'Unknown User'}
                              </div>
                              {log.userEmail && log.userName && (
                                <div className="text-sm text-gray-500">
                                  {log.userEmail}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getActivityTypeColor(log.action)}`}>
                            <span className="mr-1">{getActivityIcon(log.action)}</span>
                            {log.action.includes('Loan Approved') ? 'Loan Approval' :
                             log.action.includes('Loan Rejected') ? 'Loan Rejection' :
                             log.action.includes('Savings') && log.action.includes('deposit') ? 'Savings Deposit' :
                             log.action.includes('Savings') && log.action.includes('withdrawal') ? 'Savings Withdrawal' :
                             log.action.includes('Payment') ? 'Payment' :
                             log.action.includes('Login') ? 'Login' :
                             log.action.includes('Logout') ? 'Logout' :
                             log.action.includes('Member') ? 'Member' :
                             'Action'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{log.action}</div>
                          {(log as any).memberId && (
                            <div className="text-xs text-gray-500">Member ID: {(log as any).memberId}</div>
                          )}
                          {(log as any).loanId && (
                            <div className="text-xs text-gray-500">Loan ID: {(log as any).loanId}</div>
                          )}
                          {(log as any).amount && (
                            <div className="text-xs text-gray-600 font-medium">
                              Amount: ₱{typeof (log as any).amount === 'number' ? (log as any).amount.toLocaleString() : (log as any).amount}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(log.timestamp).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {log.role || 'N/A'}
                          </div>
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

            {/* Pagination */}
            {filteredLogs.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200 gap-4">
                <div className="text-sm text-gray-500">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredLogs.length)} of {filteredLogs.length} entries
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {getPaginationRange().map((page, index) => (
                    page === '...' ? (
                      <span key={`ellipsis-${index}`} className="px-2 py-1 text-sm text-gray-500">
                        ...
                      </span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page as number)}
                        className={`min-w-[36px] px-3 py-1 border rounded-md text-sm font-medium ${
                          currentPage === page
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  ))}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}