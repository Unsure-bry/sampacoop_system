'use client';

import { useState, useEffect } from 'react';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { Member } from '@/lib/types/member';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { usePermissions, PermissionGuard } from '@/lib/rolePermissions';

interface ReportData {
  membersSummary: {
    totalMembers: number;
    activeMembers: number;
    inactiveMembers: number;
    roleDistribution: Record<string, number>;
  };
  savingsSummary: {
    totalSavings: number;
    averageSavings: number;
    topSavers: Array<{ memberId: string; name: string; amount: number }>;
  };
  loansSummary: {
    totalLoans: number;
    totalLoanAmount: number;
    averageLoanAmount: number;
    activeLoans: number;
    loanStatusDistribution: Record<string, number>;
  };
}

export default function ReportsPage() {
  const { hasPermission } = usePermissions();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [roleFilter, setRoleFilter] = useState('all');
  
  useEffect(() => {
    fetchReportData();
  }, [dateRange, roleFilter]);
  
  const fetchReportData = async () => {
    let allMembers: any[] = [];
    let allLoans: any[] = [];
    
    try {
      setLoading(true);
      
      // Fetch members data
      const membersResult = await firestore.getCollection('members');
      allMembers = membersResult.success && membersResult.data ? membersResult.data : [];
      
      // Validate members data
      if (!Array.isArray(allMembers)) {
        console.error('Invalid members data format');
        toast.error('Failed to load members data');
        setReportData(null);
        return;
      }
      
      // Apply role filter
      const members = roleFilter === 'all' 
        ? allMembers 
        : allMembers.filter((member: any) => (member.role || 'Member').toLowerCase() === roleFilter.toLowerCase());
      
      // Fetch loans data
      const loansResult = await firestore.getCollection('loans');
      allLoans = loansResult.success && loansResult.data ? loansResult.data : [];
      
      // Validate loans data
      if (!Array.isArray(allLoans)) {
        console.error('Invalid loans data format');
        toast.error('Failed to load loans data');
        setReportData(null);
        return;
      }
      
      // Apply date range filter to loans
      let loans = allLoans;
      if (dateRange.start || dateRange.end) {
        loans = allLoans.filter((loan: any) => {
          // Handle various possible date fields in loan object
          const dateValue = loan.createdAt || loan.timestamp || loan.date || loan.submittedAt || loan.startDate;
          if (!dateValue) return false; // Exclude loans without dates when filtering
          
          let loanDate: Date;
          if (typeof dateValue === 'string' || typeof dateValue === 'number') {
            loanDate = new Date(dateValue);
          } else if (dateValue && typeof dateValue.toDate === 'function') {
            // Firestore Timestamp
            loanDate = dateValue.toDate();
          } else {
            return false;
          }
          
          // Normalize loan date to start of day for accurate comparison
          const loanDay = new Date(loanDate.getFullYear(), loanDate.getMonth(), loanDate.getDate());
          
          // Get filter date range
          let filterStartDate: Date | null = null;
          let filterEndDate: Date | null = null;
          
          if (dateRange.start) {
            const [year, month, day] = dateRange.start.split('-').map(Number);
            filterStartDate = new Date(year, month - 1, day, 0, 0, 0, 0);
          }
          
          if (dateRange.end) {
            const [year, month, day] = dateRange.end.split('-').map(Number);
            filterEndDate = new Date(year, month - 1, day, 23, 59, 59, 999);
          }
          
          // Check if loan falls within the date range
          const afterStart = filterStartDate ? loanDay >= filterStartDate : true;
          const beforeEnd = filterEndDate ? loanDate <= filterEndDate : true;
          
          return afterStart && beforeEnd;
        });
      }
      
      // Process members summary (ensure accurate member counts)
      const activeMembers = members.filter((m: any) => {
        const isActive = m.status === 'Active' || m.status === 'active';
        const isNotArchived = !m.archived;
        return isActive && isNotArchived;
      });
      
      const inactiveMembers = members.filter((m: any) => {
        const isInactive = m.status !== 'Active' && m.status !== 'active';
        const isArchived = m.archived === true;
        return isInactive || isArchived;
      });
      
      const roleDistribution: Record<string, number> = {};
      members.forEach((member: any) => {
        const role = (member.role || 'Member').toLowerCase();
        // Capitalize first letter for consistent display
        const displayRole = role.charAt(0).toUpperCase() + role.slice(1);
        roleDistribution[displayRole] = (roleDistribution[displayRole] || 0) + 1;
      });
      
      // Process savings data (calculate accurate balances based on transactions)
      let totalSavings = 0;
      const savingsPromises = members.map(async (member: any) => {
        try {
          const savingsResult = await firestore.getCollection(`members/${member.id}/savings`);
          if (savingsResult.success && savingsResult.data) {
            // Apply date range filter to savings transactions
            let filteredTransactions = [...savingsResult.data]; // Create a copy to avoid mutating original data
            if (dateRange.start || dateRange.end) {
              filteredTransactions = savingsResult.data.filter((transaction: any) => {
                // Handle various possible date fields in transaction object
                const dateValue = transaction.createdAt || transaction.timestamp || transaction.date || transaction.transactionDate;
                if (!dateValue) return false; // Exclude transactions without dates when filtering
                
                let transactionDate: Date;
                if (typeof dateValue === 'string' || typeof dateValue === 'number') {
                  transactionDate = new Date(dateValue);
                } else if (dateValue && typeof dateValue.toDate === 'function') {
                  // Firestore Timestamp
                  transactionDate = dateValue.toDate();
                } else {
                  return false;
                }
                
                // Normalize transaction date to start of day for accurate comparison
                const transactionDay = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), transactionDate.getDate());
                
                // Get filter date range
                let filterStartDate: Date | null = null;
                let filterEndDate: Date | null = null;
                
                if (dateRange.start) {
                  const [year, month, day] = dateRange.start.split('-').map(Number);
                  filterStartDate = new Date(year, month - 1, day, 0, 0, 0, 0);
                }
                
                if (dateRange.end) {
                  const [year, month, day] = dateRange.end.split('-').map(Number);
                  filterEndDate = new Date(year, month - 1, day, 23, 59, 59, 999);
                }
                
                // Check if transaction falls within the date range
                const afterStart = filterStartDate ? transactionDay >= filterStartDate : true;
                const beforeEnd = filterEndDate ? transactionDate <= filterEndDate : true;
                
                return afterStart && beforeEnd;
              });
            }
            
            // Sort transactions by date to calculate running balance correctly
            const sortedFilteredTransactions = filteredTransactions
              .sort((a: any, b: any) => new Date(a.date || a.createdAt || a.timestamp).getTime() - new Date(b.date || b.createdAt || b.timestamp).getTime());
            
            // Calculate running balance based on chronological order of transactions
            let runningBalance = 0;
            sortedFilteredTransactions.forEach((transaction: any) => {
              if (transaction.type === 'deposit') {
                runningBalance += transaction.amount;
              } else if (transaction.type === 'withdrawal') {
                runningBalance -= transaction.amount;
              }
            });
            
            return { memberId: member.id, name: `${member.firstName} ${member.lastName}`, balance: runningBalance };
          }
          return { memberId: member.id, name: `${member.firstName} ${member.lastName}`, balance: 0 };
        } catch (error) {
          console.error('Error calculating savings for member:', member.id, error);
          return { memberId: member.id, name: `${member.firstName} ${member.lastName}`, balance: 0 };
        }
      });
      
      const savingsData = await Promise.all(savingsPromises);
      totalSavings = savingsData.reduce((sum, data) => sum + data.balance, 0);
      const topSavers = savingsData
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 10)
        .filter(data => data.balance > 0)
        .map(data => ({
          memberId: data.memberId,
          name: data.name,
          amount: data.balance
        }));
      
      // Process loans summary (ensure accurate calculations)
      // Include loans that are active, approved, or disbursed (any status that means money is out)
      const activeLoanStatuses = ['approved', 'active', 'disbursed', 'paid', 'completed'];
      const activeLoans = loans.filter((loan: any) => {
        const status = (loan.status || '').toLowerCase();
        return activeLoanStatuses.includes(status);
      });
      
      const loanAmounts = activeLoans.map((loan: any) => {
        // Ensure amount is a valid number
        const amount = parseFloat(loan.amount) || 0;
        return amount > 0 ? amount : 0;
      });
      const totalLoanAmount = loanAmounts.reduce((sum: number, amount: number) => sum + amount, 0);
      
      const loanStatusDistribution: Record<string, number> = {};
      loans.forEach((loan: any) => {
        const status = (loan.status || 'pending').toLowerCase();
        loanStatusDistribution[status] = (loanStatusDistribution[status] || 0) + 1;
      });
      
      setReportData({
        membersSummary: {
          totalMembers: members.length,
          activeMembers: activeMembers.length,
          inactiveMembers: inactiveMembers.length,
          roleDistribution
        },
        savingsSummary: {
          totalSavings,
          averageSavings: members.length > 0 ? Math.round((totalSavings / members.length) * 100) / 100 : 0,
          topSavers
        },
        loansSummary: {
          totalLoans: loans.length,
          totalLoanAmount,
          averageLoanAmount: activeLoans.length > 0 ? Math.round((totalLoanAmount / activeLoans.length) * 100) / 100 : 0,
          activeLoans: activeLoans.length,
          loanStatusDistribution
        }
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
      console.error('Members data length:', allMembers.length);
      console.error('Loans data length:', allLoans.length);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };
  
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>SAMPA Cooperative Reports</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                margin: 20px;
                color: #333;
              }
              .header { 
                text-align: center; 
                margin-bottom: 30px; 
                border-bottom: 2px solid #333;
                padding-bottom: 20px;
              }
              .section { 
                margin-bottom: 30px; 
                page-break-inside: avoid;
              }
              .section-title { 
                font-size: 18px; 
                font-weight: bold; 
                margin-bottom: 15px; 
                color: #2d3748;
                border-bottom: 1px solid #e2e8f0;
                padding-bottom: 5px;
              }
              .stats-grid { 
                display: grid; 
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
                gap: 15px; 
                margin-bottom: 20px;
              }
              .stat-card { 
                background: #f7fafc; 
                padding: 15px; 
                border-radius: 8px; 
                border: 1px solid #e2e8f0;
              }
              .stat-value { 
                font-size: 24px; 
                font-weight: bold; 
                color: #e53e3e;
              }
              .stat-label { 
                font-size: 14px; 
                color: #718096; 
                margin-top: 5px;
              }
              table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-top: 10px;
              }
              th, td { 
                border: 1px solid #ddd; 
                padding: 12px; 
                text-align: left; 
              }
              th { 
                background-color: #f2f2f2; 
                font-weight: bold;
              }
              .footer {
                margin-top: 40px;
                text-align: center;
                font-size: 12px;
                color: #666;
                border-top: 1px solid #ddd;
                padding-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>SAMPA Cooperative Financial Reports</h1>
              <p>Generated on: ${new Date().toLocaleString()}</p>
              ${dateRange.start || dateRange.end ? `<p>Period: ${dateRange.start} to ${dateRange.end}</p>` : ''}
              ${roleFilter !== 'all' ? `<p>Role Filter: ${roleFilter.charAt(0).toUpperCase() + roleFilter.slice(1)}</p>` : ''}
            </div>
            
            ${reportData ? `
              <!-- Members Overview -->
              <div class="section">
                <div class="section-title">Members Overview</div>
                <div class="stats-grid">
                  <div class="stat-card">
                    <div class="stat-value">${reportData.membersSummary.totalMembers}</div>
                    <div class="stat-label">Total Members</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-value">${reportData.membersSummary.activeMembers}</div>
                    <div class="stat-label">Active Members</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-value">${reportData.membersSummary.inactiveMembers}</div>
                    <div class="stat-label">Inactive Members</div>
                  </div>
                </div>
                
                <h3>Role Distribution</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Count</th>
                      <th>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${Object.entries(reportData.membersSummary.roleDistribution).map(([role, count]) => `
                      <tr>
                        <td>${role}</td>
                        <td>${count}</td>
                        <td>${((count / reportData.membersSummary.totalMembers) * 100).toFixed(1)}%</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
              
              <!-- Savings Summary -->
              <div class="section">
                <div class="section-title">Savings Summary</div>
                <div class="stats-grid">
                  <div class="stat-card">
                    <div class="stat-value">₱${reportData.savingsSummary.totalSavings.toLocaleString()}</div>
                    <div class="stat-label">Total Savings</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-value">₱${reportData.savingsSummary.averageSavings.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                    <div class="stat-label">Average per Member</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-value">${reportData.savingsSummary.topSavers.length}</div>
                    <div class="stat-label">Top Savers</div>
                  </div>
                </div>
                
                <h3>Top 10 Savers</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Member Name</th>
                      <th>Savings Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${reportData.savingsSummary.topSavers.map((saver, index) => `
                      <tr>
                        <td>${index + 1}</td>
                        <td>${saver.name}</td>
                        <td>₱${saver.amount.toLocaleString()}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
              
              <!-- Loans Summary -->
              <div class="section">
                <div class="section-title">Loans Summary</div>
                <div class="stats-grid">
                  <div class="stat-card">
                    <div class="stat-value">${reportData.loansSummary.totalLoans}</div>
                    <div class="stat-label">Total Loan Applications</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-value">${reportData.loansSummary.activeLoans}</div>
                    <div class="stat-label">Active Loans</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-value">₱${reportData.loansSummary.totalLoanAmount.toLocaleString()}</div>
                    <div class="stat-label">Total Loan Amount</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-value">₱${reportData.loansSummary.averageLoanAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                    <div class="stat-label">Average Loan Amount</div>
                  </div>
                </div>
                
                <h3>Loan Status Distribution</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Count</th>
                      <th>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${Object.entries(reportData.loansSummary.loanStatusDistribution).map(([status, count]) => `
                      <tr>
                        <td>${status}</td>
                        <td>${count}</td>
                        <td>${((count / reportData.loansSummary.totalLoans) * 100).toFixed(1)}%</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}
            
            <div class="footer">
              <p>This report was generated by SAMPA Cooperative Management System</p>
              <p>Confidential - For Internal Use Only</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };
  
  // Show access denied if user doesn't have viewReports permission
  if (!hasPermission('viewReports')) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Reports & Analytics</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <h2 className="text-lg font-semibold text-red-800">Access Denied</h2>
              <p className="text-red-600">You do not have permission to view reports.</p>
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
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reports & Analytics</h1>
          <p className="text-gray-600">Comprehensive financial reports and analytics</p>
        </div>
        <div className="flex gap-3">
          {hasPermission('exportData') && (
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
            >
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Report
            </button>
          )}
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Report Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 shadow-sm"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 shadow-sm"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role Filter</label>
            <select
              className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 shadow-sm"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all" className="text-gray-900">All Roles</option>
              <option value="driver" className="text-gray-900">Driver</option>
              <option value="operator" className="text-gray-900">Operator</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', name: 'Overview' },
            { id: 'members', name: 'Members' },
            { id: 'savings', name: 'Savings' },
            { id: 'loans', name: 'Loans' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>
      
      {/* Report Content */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {reportData && (
          <>
            {activeTab === 'overview' && (
              <div className="p-6 space-y-8">
                {/* Key Metrics */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Key Performance Indicators</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
                      <div className="text-3xl font-bold text-blue-600">{reportData.membersSummary.totalMembers}</div>
                      <div className="text-sm text-blue-800 mt-1">Total Members</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
                      <div className="text-3xl font-bold text-green-600">₱{reportData.savingsSummary.totalSavings.toLocaleString()}</div>
                      <div className="text-sm text-green-800 mt-1">Total Savings</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
                      <div className="text-3xl font-bold text-purple-600">{reportData.loansSummary.totalLoans}</div>
                      <div className="text-sm text-purple-800 mt-1">Total Loans</div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200">
                      <div className="text-3xl font-bold text-orange-600">₱{reportData.loansSummary.totalLoanAmount.toLocaleString()}</div>
                      <div className="text-sm text-orange-800 mt-1">Loan Portfolio</div>
                    </div>
                  </div>
                </div>
                
                {/* Analytics Charts */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Analytics Dashboard</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Member Status Distribution */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-700 mb-3">Member Status Distribution</h4>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Active', value: reportData.membersSummary.activeMembers, color: '#10B981' },
                                { name: 'Inactive', value: reportData.membersSummary.inactiveMembers, color: '#F59E0B' }
                              ].filter(item => item.value > 0)}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={(props: { name?: string; percent?: number }) => `${props.name || ''} ${((props.percent || 0) * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {[
                                { name: 'Active', value: reportData.membersSummary.activeMembers, color: '#10B981' },
                                { name: 'Inactive', value: reportData.membersSummary.inactiveMembers, color: '#F59E0B' }
                              ].filter(item => item.value > 0).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    
                    {/* Financial Overview */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-700 mb-3">Financial Overview</h4>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={[
                              { name: 'Total Savings', amount: reportData.savingsSummary.totalSavings },
                              { name: 'Loan Portfolio', amount: reportData.loansSummary.totalLoanAmount }
                            ]}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`} />
                            <Tooltip formatter={(value: number) => [`₱${value.toLocaleString()}`, 'Amount']} />
                            <Bar dataKey="amount" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'members' && (
              <div className="p-6 space-y-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Members Report</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{reportData.membersSummary.totalMembers}</div>
                    <div className="text-sm text-blue-800">Total Members</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{reportData.membersSummary.activeMembers}</div>
                    <div className="text-sm text-green-800">Active Members</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{reportData.membersSummary.inactiveMembers}</div>
                    <div className="text-sm text-yellow-800">Inactive Members</div>
                  </div>
                </div>
                
                {/* Role Distribution Chart */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-3">Role Distribution</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={Object.entries(reportData.membersSummary.roleDistribution).map(([role, count]) => ({
                          role,
                          count
                        }))}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="role" tick={{ fontSize: 12 }} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.entries(reportData.membersSummary.roleDistribution).map(([role, count]) => (
                        <tr key={role}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{role}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{count}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {((count / reportData.membersSummary.totalMembers) * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {activeTab === 'savings' && (
              <div className="p-6 space-y-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Savings Report</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">₱{reportData.savingsSummary.totalSavings.toLocaleString()}</div>
                    <div className="text-sm text-green-800">Total Savings</div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">₱{reportData.savingsSummary.averageSavings.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                    <div className="text-sm text-blue-800">Avg per Member</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{reportData.savingsSummary.topSavers.length}</div>
                    <div className="text-sm text-purple-800">Top Savers</div>
                  </div>
                </div>
                
                {/* Top Savers Chart */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-3">Top Savers Chart</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={reportData.savingsSummary.topSavers.slice(0, 5).map(saver => ({
                          name: saver.name.split(' ')[0],
                          amount: saver.amount
                        }))}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(value: number) => [`₱${value.toLocaleString()}`, 'Savings']} />
                        <Bar dataKey="amount" fill="#10B981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">Top 10 Savers</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Savings Amount</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.savingsSummary.topSavers.map((saver, index) => (
                          <tr key={saver.memberId}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{index + 1}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{saver.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">₱{saver.amount.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'loans' && (
              <div className="p-6 space-y-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Loans Report</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{reportData.loansSummary.totalLoans}</div>
                    <div className="text-sm text-purple-800">Total Applications</div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{reportData.loansSummary.activeLoans}</div>
                    <div className="text-sm text-blue-800">Active Loans</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">₱{reportData.loansSummary.totalLoanAmount.toLocaleString()}</div>
                    <div className="text-sm text-green-800">Total Loan Amount</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">₱{reportData.loansSummary.averageLoanAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                    <div className="text-sm text-orange-800">Avg Loan Amount</div>
                  </div>
                </div>
                
                {/* Loan Status Distribution Chart */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-3">Loan Status Distribution</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={Object.entries(reportData.loansSummary.loanStatusDistribution).map(([status, count]) => {
                            const colorMap: Record<string, string> = {
                              'active': '#3B82F6',     // Blue
                              'completed': '#22C55E',  // Bright Green
                              'approved': '#10B981',   // Emerald
                              'pending': '#F59E0B',    // Amber/Yellow
                              'rejected': '#EF4444',   // Red
                              'paid': '#06B6D4',       // Cyan
                              'defaulted': '#DC2626',  // Dark Red
                              'cancelled': '#6B7280',  // Gray
                              'processing': '#8B5CF6', // Purple
                              'under_review': '#F97316', // Orange
                              'closed': '#14B8A6',     // Teal
                              'disbursed': '#84CC16',  // Lime
                              'fully_paid': '#8B5CF6'  // Violet
                            };
                            return {
                              name: status.charAt(0).toUpperCase() + status.slice(1),
                              value: count,
                              color: colorMap[status.toLowerCase()] || '#6B7280'
                            };
                          })}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(props: { name?: string; percent?: number }) => `${props.name || ''} ${((props.percent || 0) * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {Object.entries(reportData.loansSummary.loanStatusDistribution).map(([status, count], index) => {
                            const colorMap: Record<string, string> = {
                              'active': '#3B82F6',
                              'completed': '#22C55E',
                              'approved': '#10B981',
                              'pending': '#F59E0B',
                              'rejected': '#EF4444',
                              'paid': '#06B6D4',
                              'defaulted': '#DC2626',
                              'cancelled': '#6B7280',
                              'processing': '#8B5CF6',
                              'under_review': '#F97316',
                              'closed': '#14B8A6',
                              'disbursed': '#84CC16',
                              'fully_paid': '#8B5CF6'
                            };
                            return (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={colorMap[status.toLowerCase()] || '#6B7280'} 
                                stroke="#fff"
                                strokeWidth={2}
                              />
                            );
                          })}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            border: '1px solid #e5e7eb', 
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Legend 
                          verticalAlign="bottom" 
                          height={36}
                          iconType="circle"
                          wrapperStyle={{ paddingTop: '20px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">Loan Status Distribution</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {Object.entries(reportData.loansSummary.loanStatusDistribution).map(([status, count]) => (
                          <tr key={status}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">{status}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{count}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {((count / reportData.loansSummary.totalLoans) * 100).toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}