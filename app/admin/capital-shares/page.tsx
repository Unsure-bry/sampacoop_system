'use client';

import { useState, useEffect } from 'react';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { usePermissions } from '@/lib/rolePermissions';
import { formatCurrency } from '@/lib/settingsService';

interface CapitalShareData {
  memberId: string;
  memberName: string;
  role: string;
  capitalShare: number;
  requiredCapitalShare: number;
  remainingBalance: number;
  status: 'Paid' | 'Pending' | 'Partial';
  paymentDate?: string;
}

export default function CapitalSharesPage() {
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [capitalSharesData, setCapitalSharesData] = useState<CapitalShareData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Summary statistics
  const [totalCapitalShares, setTotalCapitalShares] = useState(0);
  const [paidCapitalShares, setPaidCapitalShares] = useState(0);
  const [pendingCapitalShares, setPendingCapitalShares] = useState(0);
  const [pendingMembersCount, setPendingMembersCount] = useState(0);

  useEffect(() => {
    fetchCapitalSharesData();
  }, []);

  const fetchCapitalSharesData = async () => {
    try {
      setLoading(true);
      
      // Fetch all members
      const membersResult = await firestore.getCollection('members');
      
      if (!membersResult.success || !membersResult.data) {
        toast.error('Failed to load capital shares data');
        return;
      }

      const capitalSharesList: CapitalShareData[] = [];
      let total = 0;
      let paid = 0;
      let pending = 0;
      let pendingCount = 0;
      
      // Fixed required capital share amount
      const REQUIRED_CAPITAL_SHARE = 10000;

      for (const member of membersResult.data) {
        // Cast to any to access dynamic Firestore data
        const memberData = member as any;
        
        // Get payment info which contains capital share
        const paymentInfo = memberData.paymentInfo || {};
        const capitalShare = paymentInfo.capitalShare || 0;
        
        // Skip members with no capital share
        if (capitalShare <= 0) continue;
        
        const fullName = `${memberData.firstName || ''} ${memberData.middleName ? memberData.middleName + ' ' : ''}${memberData.lastName || ''}${memberData.suffix ? ' ' + memberData.suffix : ''}`.trim();
        
        // Calculate remaining balance based on fixed required amount
        const remainingBalance = Math.max(0, REQUIRED_CAPITAL_SHARE - capitalShare);
        
        // Determine status based on capital share vs required amount
        let status: 'Paid' | 'Pending' | 'Partial';
        if (capitalShare >= REQUIRED_CAPITAL_SHARE) {
          status = 'Paid';
        } else if (capitalShare > 0 && capitalShare < REQUIRED_CAPITAL_SHARE) {
          status = 'Partial';
        } else {
          status = 'Pending';
        }
        
        const data: CapitalShareData = {
          memberId: member.id,
          memberName: fullName || 'Unknown',
          role: memberData.role || 'Member',
          capitalShare: capitalShare,
          requiredCapitalShare: REQUIRED_CAPITAL_SHARE,
          remainingBalance: remainingBalance,
          status: status,
          paymentDate: memberData.createdAt
        };
        
        capitalSharesList.push(data);
        
        // Calculate totals
        total += capitalShare;
        if (status === 'Paid') {
          paid += capitalShare;
        } else {
          // For pending/partial, add the remaining balance to pending total
          pending += remainingBalance;
          pendingCount++;
        }
      }

      setCapitalSharesData(capitalSharesList);
      setTotalCapitalShares(total);
      setPaidCapitalShares(paid);
      setPendingCapitalShares(pending);
      setPendingMembersCount(pendingCount);
    } catch (error) {
      console.error('Error fetching capital shares:', error);
      toast.error('Failed to load capital shares data');
    } finally {
      setLoading(false);
    }
  };

  // Filter data based on search and status filter
  const filteredData = capitalSharesData.filter(item => {
    const matchesSearch = item.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.memberId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Show access denied if user doesn't have viewMembers permission
  if (!hasPermission('viewMembers')) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Capital Shares</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <h2 className="text-lg font-semibold text-red-800">Access Denied</h2>
              <p className="text-red-600">You do not have permission to view capital shares records.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Capital Shares</h1>
          <p className="text-gray-600">Manage and track member capital shares</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Capital Shares Card */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Capital Shares</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{formatCurrency(totalCapitalShares)}</p>
              <p className="text-sm text-gray-500 mt-1">{filteredData.length} members</p>
            </div>
            <div className="bg-blue-100 rounded-full p-4">
              <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Paid Capital Shares Card */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Paid Capital Shares</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{formatCurrency(paidCapitalShares)}</p>
              <p className="text-sm text-gray-500 mt-1">{filteredData.filter(d => d.status === 'Paid').length} paid</p>
            </div>
            <div className="bg-green-100 rounded-full p-4">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Pending Capital Shares Card */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Pending Capital Shares</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{formatCurrency(pendingCapitalShares)}</p>
              <p className="text-sm text-gray-500 mt-1">{pendingMembersCount} members with remaining balance</p>
            </div>
            <div className="bg-orange-100 rounded-full p-4">
              <svg className="h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by member name or ID..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Partial">Partial</option>
          </select>
        </div>
      </div>

      {/* Capital Shares Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paid Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Required Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remaining Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center">
                    <p className="text-gray-500">
                      {searchTerm || statusFilter ? 'No capital shares found matching your filters.' : 'No capital shares records found.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.memberId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.memberName}</div>
                      <div className="text-xs text-gray-500">ID: {item.memberId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {item.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(item.capitalShare)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {formatCurrency(item.requiredCapitalShare)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-semibold ${
                        item.remainingBalance > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {formatCurrency(item.remainingBalance)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.status === 'Paid' 
                          ? 'bg-green-100 text-green-800' 
                          : item.status === 'Partial'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.paymentDate ? new Date(item.paymentDate).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Results count */}
        {filteredData.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{filteredData.length}</span> capital share records
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
