'use client';

import { useState, useEffect } from 'react';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { Member } from '@/lib/types/member';
import { MemberSavings } from '@/lib/types/savings';
import { useRouter } from 'next/navigation';
import { usePermissions, PermissionGuard } from '@/lib/rolePermissions';

export default function SavingsPage() {
  const { hasPermission } = usePermissions();
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<MemberSavings[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberSavings | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  // Column filters
  const [nameFilter, setNameFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [savingsFilter, setSavingsFilter] = useState('');
  const itemsPerPage = 10;
  const router = useRouter();

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    filterMembers();
    // Reset to first page when any filter changes
    setCurrentPage(1);
  }, [searchTerm, nameFilter, roleFilter, statusFilter, savingsFilter, members]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      
      // First try to fetch from 'members' collection
      let result = await firestore.getCollection('members');
      
      // If that fails or returns no data, try 'users' collection with member filtering
      if (!result.success || !result.data || result.data.length === 0) {
        console.log('No data in members collection, trying users collection');
        result = await firestore.getCollection('users');
        
        if (result.success && result.data) {
          // Filter for users with member roles
          const membersData = result.data
            .filter((doc: any) => {
              const role = doc.role?.toLowerCase();
              return role && ['member', 'driver', 'operator'].includes(role);
            })
            .map((doc: any) => ({
              id: doc.id,
              firstName: doc.firstName || doc.fullName?.split(' ')[0] || 'Unknown',
              lastName: doc.lastName || doc.fullName?.split(' ').slice(-1)[0] || 'User',
              middleName: doc.middleName || '',
              suffix: doc.suffix || '',
              role: doc.role || 'Member',
              email: doc.email || '',
              phoneNumber: doc.contactNumber || doc.phoneNumber || '',
              birthdate: doc.birthdate || '',
              age: doc.age || 0,
              status: doc.status || 'Active',
              createdAt: doc.createdAt || new Date().toISOString(),
              archived: doc.archived || false,
              driverInfo: doc.driverInfo || null,
              operatorInfo: doc.operatorInfo || null,
              ...doc
            }));
          
          // Filter only active members
          const activeMembers = membersData.filter((member: any) => !member.archived);
          setMembers(activeMembers);
          return;
        }
      }
      
      if (result.success && result.data) {
        // Process members from the members collection
        const membersData = result.data.map((doc: any) => {
          // Handle different data structures
          const firstName = doc.firstName || 
                           doc.fullName?.split(' ')[0] || 
                           doc.displayName?.split(' ')[0] || 
                           'Unknown';
                           
          const lastName = doc.lastName || 
                          doc.fullName?.split(' ').slice(-1)[0] || 
                          doc.displayName?.split(' ').slice(-1)[0] || 
                          'User';
          
          return {
            id: doc.id,
            firstName,
            lastName,
            middleName: doc.middleName || '',
            suffix: doc.suffix || '',
            role: doc.role || 'Member',
            email: doc.email || '',
            phoneNumber: doc.contactNumber || doc.phoneNumber || '',
            birthdate: doc.birthdate || '',
            age: doc.age || 0,
            status: doc.status || 'Active',
            createdAt: doc.createdAt || new Date().toISOString(),
            archived: doc.archived || false,
            driverInfo: doc.driverInfo || null,
            operatorInfo: doc.operatorInfo || null,
            ...doc
          };
        });
        
        // Filter only active members
        const activeMembers = membersData.filter((member: any) => !member.archived);
        setMembers(activeMembers);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch total savings for a specific member
  const fetchMemberTotalSavings = async (memberId: string) => {
    try {
      // Use the savings service to get the total balance for the member
      const { getSavingsBalanceForMember } = await import('@/lib/savingsService');
      return await getSavingsBalanceForMember(memberId);
    } catch (error) {
      console.error(`Error fetching savings for member ${memberId}:`, error);
      return 0; // Return 0 if there's an error
    }
  };

  // Function to fetch all members' savings data
  const fetchAllMembersSavings = async () => {
    const membersWithSavings = await Promise.all(
      members.map(async (member) => {
        const totalSavings = await fetchMemberTotalSavings(member.id);
        // Find the full member object to get role information
        const fullMember = members.find(m => m.id === member.id);
        
        return {
          memberId: member.id,
          memberName: `${member.firstName || ''} ${member.middleName ? member.middleName + ' ' : ''}${member.lastName || ''}${member.suffix ? ' ' + member.suffix : ''}`.trim(),
          role: fullMember?.role || 'Member',
          totalSavings,
          status: member.status || 'Active',
          lastUpdated: member.createdAt || new Date().toISOString()
        };
      })
    );
    return membersWithSavings;
  };

  const filterMembers = async () => {
    // Check if members data is loaded
    if (!members || members.length === 0) {
      setFilteredMembers([]);
      return;
    }
    
    let membersWithSavings: MemberSavings[] = [];
    
    // Apply all filters
    const filteredMembers = members.filter(member => {
      // Global search term filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const firstName = member.firstName || '';
        const lastName = member.lastName || '';
        const email = member.email || '';
        const id = member.id || '';
        const middleName = member.middleName || '';
        const suffix = member.suffix || '';
        
        const matchesGlobalSearch = (
          firstName.toLowerCase().includes(term) ||
          lastName.toLowerCase().includes(term) ||
          email.toLowerCase().includes(term) ||
          id.toLowerCase().includes(term) ||
          middleName.toLowerCase().includes(term) ||
          suffix.toLowerCase().includes(term)
        );
        
        if (!matchesGlobalSearch) return false;
      }
      
      // Column-specific filters
      if (nameFilter) {
        const fullName = `${member.firstName || ''} ${member.middleName ? member.middleName + ' ' : ''}${member.lastName || ''}${member.suffix ? ' ' + member.suffix : ''}`.trim().toLowerCase();
        if (!fullName.includes(nameFilter.toLowerCase())) return false;
      }
      
      if (roleFilter && member.role) {
        if (member.role.toLowerCase() !== roleFilter.toLowerCase()) return false;
      }
      
      if (statusFilter && member.status) {
        if (member.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
      }
      
      return true;
    });
    
    // Fetch savings data for filtered members
    const rawMembersWithSavings = await Promise.all(
      filteredMembers.map(async (member) => {
        const totalSavings = await fetchMemberTotalSavings(member.id);
        
        // Apply savings amount filter
        if (savingsFilter) {
          if (savingsFilter === '50000+') {
            if (totalSavings < 50000) return null;
          } else {
            const [min, max] = savingsFilter.split('-').map(Number);
            if (totalSavings < min || totalSavings >= max) return null;
          }
        }
        
        return {
          memberId: member.id,
          memberName: `${member.firstName || ''} ${member.middleName ? member.middleName + ' ' : ''}${member.lastName || ''}${member.suffix ? ' ' + member.suffix : ''}`.trim(),
          role: member.role || 'Member',
          totalSavings,
          status: member.status || 'Active',
          lastUpdated: member.createdAt || new Date().toISOString()
        };
      })
    );
    
    // Remove null entries and apply final savings filters
    membersWithSavings = rawMembersWithSavings.filter(item => item !== null) as MemberSavings[];
    
    setFilteredMembers(membersWithSavings);
  };

  const handleViewSavings = (memberId: string) => {
    router.push(`/admin/savings/member/${memberId}`);
  };

  // Show access denied if user doesn't have viewSavings permission
  if (!hasPermission('viewSavings')) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Savings Management</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <h2 className="text-lg font-semibold text-red-800">Access Denied</h2>
              <p className="text-red-600">You do not have permission to view savings records.</p>
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

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredMembers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);

  const goToPage = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handlePrint = () => {
    // Create a new window with printable content
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Savings Report</title>
            <style>
              body { font-family: Arial, sans-serif; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              .header { text-align: center; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Savings Report</h1>
              <p>Generated on: ${new Date().toLocaleString()}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Member Name</th>
                  <th>Role</th>
                  <th>Total Savings</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                ${filteredMembers.map(member => `
                  <tr>
                    <td>${member.memberName}</td>
                    <td>${member.role}</td>
                    <td>₱${member.totalSavings.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>${member.status}</td>
                    <td>${new Date(member.lastUpdated).toLocaleDateString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  const resetFilters = () => {
    setNameFilter('');
    setRoleFilter('');
    setStatusFilter('');
    setSavingsFilter('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Savings Management</h1>
          <p className="text-gray-600">View and manage member savings</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {hasPermission('exportData') && (
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
            >
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Report
            </button>
          )}
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center"
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset Filters
          </button>
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search members..."
              className="pl-10 pr-4 py-2 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 w-full text-gray-900 placeholder-gray-500 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div>
                    <div>Role</div>
                    <select
                      className="mt-1 w-full px-2 py-1 text-sm bg-white border border-gray-300 rounded focus:ring-1 focus:ring-red-500 focus:border-red-500 text-gray-900"
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                    >
                      <option value="" className="text-gray-900">All Roles</option>
                      <option value="Driver" className="text-gray-900">Driver</option>
                      <option value="Operator" className="text-gray-900">Operator</option>
                    </select>
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div>
                    <div>Total Savings</div>
                    <select
                      className="mt-1 w-full px-2 py-1 text-sm bg-white border border-gray-300 rounded focus:ring-1 focus:ring-red-500 focus:border-red-500 text-gray-900"
                      value={savingsFilter}
                      onChange={(e) => setSavingsFilter(e.target.value)}
                    >
                      <option value="" className="text-gray-900">All Savings</option>
                      <option value="0-1000" className="text-gray-900">₱0 - ₱1,000</option>
                      <option value="1000-5000" className="text-gray-900">₱1,000 - ₱5,000</option>
                      <option value="5000-10000" className="text-gray-900">₱5,000 - ₱10,000</option>
                      <option value="10000-50000" className="text-gray-900">₱10,000 - ₱50,000</option>
                      <option value="50000+" className="text-gray-900">₱50,000+</option>
                    </select>
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div>
                    <div>Status</div>
                    <select
                      className="mt-1 w-full px-2 py-1 text-sm bg-white border border-gray-300 rounded focus:ring-1 focus:ring-red-500 focus:border-red-500 text-gray-900"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="" className="text-gray-900">All Status</option>
                      <option value="Active" className="text-gray-900">Active</option>
                      <option value="Inactive" className="text-gray-900">Inactive</option>
                    </select>
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <p className="text-gray-500">
                      {searchTerm ? 'No members found matching your search.' : 'No members found.'}
                    </p>
                  </td>
                </tr>
              ) : (
                currentItems.map((member) => (
                  <tr key={member.memberId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {member.memberName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        ₱{member.totalSavings.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        member.status?.toLowerCase() === 'active'
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {member.status ? member.status.charAt(0).toUpperCase() + member.status.slice(1).toLowerCase() : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(member.lastUpdated).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewSavings(member.memberId)}
                        className="text-red-600 hover:text-red-900 mr-3"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination - only show when there are results */}
        {filteredMembers.length > 0 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(indexOfLastItem, filteredMembers.length)}
              </span>{' '}
              of <span className="font-medium">{filteredMembers.length}</span> results
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={prevPage}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Previous
              </button>
              
              {/* Page numbers */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    currentPage === page
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              <button
                onClick={nextPage}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Member Savings Details Modal */}
      {showDetailsModal && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Savings Details</h2>
                <button 
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Member Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Member Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="font-medium">{selectedMember.memberName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Role</p>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {selectedMember.role}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        selectedMember.status === 'Active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedMember.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Last Updated</p>
                      <p className="font-medium">{new Date(selectedMember.lastUpdated).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="bg-red-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Financial Summary</h3>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Total Savings Balance</p>
                    <p className="text-3xl font-bold text-red-600">₱{selectedMember.totalSavings.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      handleViewSavings(selectedMember.memberId);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    View Full History
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}