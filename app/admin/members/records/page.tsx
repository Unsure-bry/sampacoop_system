'use client';

import { useState, useEffect } from 'react';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import MemberDetailsModal from '@/components/admin/MemberDetailsModal';
import MemberEditModal from '@/components/admin/MemberEditModal';
import MemberRegistrationModal from '@/components/admin/MemberRegistrationModal';
import { Member } from '@/lib/types/member';
import { getSystemSettings, formatCurrency, SystemSettings } from '@/lib/settingsService';
import { usePermissions, PermissionGuard } from '@/lib/rolePermissions';

export default function MemberRecordsPage() {
  const { hasPermission, hasAnyPermission } = usePermissions();
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [viewingMember, setViewingMember] = useState<Member | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [archivingInProgress, setArchivingInProgress] = useState(false);
  const [autoArchiveInfo, setAutoArchiveInfo] = useState<{checked: number; archived: number} | null>(null);

  // Constants for archiving
  const INACTIVITY_THRESHOLD_DAYS = 180; // 6 months

  // Restore modal state
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [memberToRestore, setMemberToRestore] = useState<Member | null>(null);
  const [controlNumber, setControlNumber] = useState('');
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);

  useEffect(() => {
    // Check if user has permission to view members
    if (!hasPermission('viewMembers')) {
      return;
    }
    fetchMembers();
    fetchSystemSettings();
  }, []);

  // Show access denied if user doesn't have viewMembers permission
  if (!hasPermission('viewMembers')) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Member Records</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <h2 className="text-lg font-semibold text-red-800">Access Denied</h2>
              <p className="text-red-600">You do not have permission to view member records.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const fetchSystemSettings = async () => {
    const settings = await getSystemSettings();
    setSystemSettings(settings);
  };

  // Helper function to parse Firestore timestamp
  const parseFirestoreDate = (dateValue: any): Date | null => {
    if (!dateValue) return null;
    
    // Handle Firestore Timestamp object { seconds: number, nanoseconds: number }
    if (typeof dateValue === 'object' && 'seconds' in dateValue) {
      return new Date(dateValue.seconds * 1000);
    }
    
    // Handle ISO string or other date formats
    const parsedDate = new Date(dateValue);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
    
    return null;
  };

  // Check if member should be auto-archived (no transactions for 6 months)
  const shouldAutoArchiveMember = (member: Member): {shouldArchive: boolean; reason: string; daysInactive: number} => {
    // Get the most recent activity date
    const lastActivity = member.lastTransactionAt || member.lastActivityAt || member.updatedAt;
    
    if (!lastActivity) {
      // If no activity recorded, check created date
      if (!member.createdAt) {
        return { shouldArchive: false, reason: 'No activity data', daysInactive: 0 };
      }
      
      const createdDate = parseFirestoreDate(member.createdAt);
      if (!createdDate) {
        return { shouldArchive: false, reason: 'Invalid date', daysInactive: 0 };
      }
      
      const currentDate = new Date();
      const diffTime = currentDate.getTime() - createdDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      // Only archive if member has been inactive since creation for 6+ months
      if (diffDays >= INACTIVITY_THRESHOLD_DAYS) {
        return { 
          shouldArchive: true, 
          reason: `No transactions since creation (${diffDays} days)`,
          daysInactive: diffDays 
        };
      }
      
      return { shouldArchive: false, reason: 'Recently created', daysInactive: diffDays };
    }
    
    const lastActivityDate = parseFirestoreDate(lastActivity);
    if (!lastActivityDate) {
      return { shouldArchive: false, reason: 'Invalid activity date', daysInactive: 0 };
    }
    
    const currentDate = new Date();
    const diffTime = currentDate.getTime() - lastActivityDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays >= INACTIVITY_THRESHOLD_DAYS) {
      return { 
        shouldArchive: true, 
        reason: `No transactions for ${diffDays} days`,
        daysInactive: diffDays 
      };
    }
    
    return { shouldArchive: false, reason: 'Active', daysInactive: diffDays };
  };

  // Archive a member
  const archiveMember = async (member: Member, reason: string): Promise<boolean> => {
    try {
      const result = await firestore.updateDocument('members', member.id, {
        status: 'archived',
        archived: true,
        archivedAt: new Date().toISOString(),
        archiveReason: reason,
        previousStatus: member.status || 'active',
        updatedAt: new Date().toISOString()
      });
      
      return result.success;
    } catch (error) {
      console.error(`Error archiving member ${member.id}:`, error);
      return false;
    }
  };

  // Auto-archive inactive members
  const autoArchiveInactiveMembers = async (membersList: Member[]): Promise<{checked: number; archived: number}> => {
    console.log('=== AUTO ARCHIVE CHECK (6 Months Inactivity) ===');
    
    let archivedCount = 0;
    let checkedCount = 0;
    
    for (const member of membersList) {
      // Skip already archived members
      if (member.status === 'archived' || member.archived) {
        continue;
      }
      
      checkedCount++;
      const { shouldArchive, reason, daysInactive } = shouldAutoArchiveMember(member);
      
      console.log(`Member: ${member.firstName} ${member.lastName}, Days Inactive: ${daysInactive}, Should Archive: ${shouldArchive}`);
      
      if (shouldArchive) {
        const archiveReason = `No transaction for 6 months (${daysInactive} days inactive)`;
        const success = await archiveMember(member, archiveReason);
        if (success) {
          archivedCount++;
          console.log(`✓ Auto-archived: ${member.firstName} ${member.lastName} - ${archiveReason}`);
        } else {
          console.error(`✗ Failed to archive: ${member.firstName} ${member.lastName}`);
        }
      }
    }
    
    console.log(`=== AUTO ARCHIVE COMPLETE: ${archivedCount} of ${checkedCount} checked members archived ===`);
    return { checked: checkedCount, archived: archivedCount };
  };

  useEffect(() => {
    filterMembers();
  }, [searchTerm, members, activeTab]);

  // Clear error when members are successfully loaded
  useEffect(() => {
    if (members.length > 0) {
      setError(null);
    }
  }, [members]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      setArchivingInProgress(true);
      
      // First try to fetch from 'members' collection
      let result = await firestore.getCollection('members');
      
      // If that fails or returns no data, try 'users' collection with member filtering
      if (!result.success || !result.data || result.data.length === 0) {
        console.log('No data in members collection, trying users collection');
        result = await firestore.getCollection('users');
        
        if (result.success && result.data) {
          // Filter for users with member roles
          const memberData = result.data
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
          
          // Sort members by creation date in descending order (newest first)
          const sortedMembers = memberData.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA; // Descending order
          });
          
          setMembers(sortedMembers);
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
        
        // Sort members by creation date in descending order (newest first)
        const sortedMembers = membersData.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA; // Descending order
        });
        
        // Auto-archive inactive members (6 months no transactions)
        const archiveResult = await autoArchiveInactiveMembers(sortedMembers);
        setAutoArchiveInfo(archiveResult);
        
        if (archiveResult.archived > 0) {
          toast.success(`${archiveResult.archived} member(s) auto-archived due to 6 months inactivity`);
          
          // Re-fetch to get updated data after archiving
          const updatedResult = await firestore.getCollection('members');
          if (updatedResult.success && updatedResult.data) {
            const updatedMembersData = updatedResult.data.map((doc: any) => {
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
            
            const sortedUpdatedMembers = updatedMembersData.sort((a, b) => {
              const dateA = new Date(a.createdAt || 0).getTime();
              const dateB = new Date(b.createdAt || 0).getTime();
              return dateB - dateA;
            });
            
            setMembers(sortedUpdatedMembers);
          }
        } else {
          setMembers(sortedMembers);
        }
      } else {
        // If both collections fail, show an error
        const errorMessage = 'Failed to fetch members from both collections. Please check your database connection.';
        console.error(errorMessage);
        setError(errorMessage);
        toast.error('Failed to load members. Please try again.');
      }
    } catch (error: any) {
      console.error('Error fetching members:', error);
      const errorMessage = `Failed to load members: ${error.message || 'Unknown error'}`;
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setArchivingInProgress(false);
    }
  };

  const filterMembers = () => {
    // Check if members data is loaded
    if (!members || members.length === 0) {
      setFilteredMembers([]);
      return;
    }
    
    // Filter by active/archived status first
    const statusFiltered = members.filter(member => {
      if (activeTab === 'active') {
        return !member.archived;
      } else {
        return member.archived === true;
      }
    });

    // Then apply search filter
    if (!searchTerm) {
      setFilteredMembers(statusFiltered);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = statusFiltered.filter(member => {
      // Safely handle potentially undefined fields
      const firstName = member.firstName || '';
      const lastName = member.lastName || '';
      const email = member.email || '';
      const id = member.id || '';
      const middleName = member.middleName || '';
      const suffix = member.suffix || '';
      
      return (
        firstName.toLowerCase().includes(term) ||
        lastName.toLowerCase().includes(term) ||
        email.toLowerCase().includes(term) ||
        id.toLowerCase().includes(term) ||
        middleName.toLowerCase().includes(term) ||
        suffix.toLowerCase().includes(term)
      );
    });
    
    setFilteredMembers(filtered);
    // Reset to first page when filtering changes
    setCurrentPage(1);
  };

  const handleEditMember = (member: Member) => {
    setEditingMember(member);
  };

  const handleViewMember = (member: Member) => {
    setViewingMember(member);
  };

  const handleArchiveMember = async (memberId: string) => {
    try {
      const result = await firestore.updateDocument('members', memberId, {
        archived: true,
        archivedAt: new Date().toISOString()
      });
      
      if (result.success) {
        // Update local state
        setMembers(prevMembers => 
          prevMembers.map(member => 
            member.id === memberId ? { ...member, archived: true } : member
          )
        );
        toast.success('Member archived successfully');
      } else {
        toast.error('Failed to archive member');
      }
    } catch (error) {
      console.error('Error archiving member:', error);
      toast.error('An error occurred while archiving member');
    }
  };

  const openRestoreModal = (member: Member) => {
    setMemberToRestore(member);
    setControlNumber('');
    setShowRestoreModal(true);
  };

  const closeRestoreModal = () => {
    setShowRestoreModal(false);
    setMemberToRestore(null);
    setControlNumber('');
    setRestoreLoading(false);
  };

  const handleRestoreMember = async () => {
    if (!memberToRestore) return;
    
    setRestoreLoading(true);
    try {
      const now = new Date().toISOString();
      const reactivationFee = systemSettings?.reactivationFee || 1500;
      const result = await firestore.updateDocument('members', memberToRestore.id, {
        archived: false,
        restoredAt: now,
        restoredBy: 'admin',
        reactivationFee: reactivationFee,
        reactivationReceiptNumber: controlNumber,
        status: 'Active'
      });
      
      if (result.success) {
        // Update local state
        setMembers(prevMembers => 
          prevMembers.map(member => 
            member.id === memberToRestore.id 
              ? { ...member, archived: false, status: 'Active' } 
              : member
          )
        );
        toast.success('Member restored successfully');
        closeRestoreModal();
      } else {
        toast.error('Failed to restore member');
      }
    } catch (error) {
      console.error('Error restoring member:', error);
      toast.error('An error occurred while restoring member');
    } finally {
      setRestoreLoading(false);
    }
  };

  const handleExport = () => {
    
    // Create CSV content
    const headers = ['Full Name', 'Role', 'Contact Number', 'Email', 'Status', 'Created At'];
    const csvContent = [
      headers.join(','),
      ...filteredMembers.map(member => {
        const fullName = `${member.firstName} ${member.middleName || ''} ${member.lastName} ${member.suffix || ''}`.trim();
        return [
          `"${fullName}"`,
          `"${member.role}"`,
          `"${member.phoneNumber}"`,
          `"${member.email}"`,
          `"${member.archived ? 'Archived' : (member.status || 'Active')}"`,
          `"${new Date(member.createdAt).toLocaleDateString()}"`
        ].join(',');
      })
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `member_records_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Member records exported successfully!');
  };

  const handleMemberUpdated = () => {
    // Refresh the member list after an update
    fetchMembers();
  };

  const handleMemberAdded = () => {
    // Refresh the member list after adding a new member
    fetchMembers();
    toast.success('Member registered successfully!');
  };

  const getFullName = (member: Member) => {
    if (!member) return 'Unknown Member';
    
    const firstName = member.firstName || '';
    const middleName = member.middleName || '';
    const lastName = member.lastName || '';
    const suffix = member.suffix || '';
    
    return `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}${suffix ? ' ' + suffix : ''}`.trim();
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredMembers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Member Records</h1>
          <p className="text-gray-600">View and manage member records</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <PermissionGuard permission="addMembers">
            <button
              onClick={() => setIsAddMemberModalOpen(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
            >
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Member
            </button>
          </PermissionGuard>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, ID, or email..."
              className="pl-10 pr-4 py-2 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 w-full md:w-64 text-gray-900 placeholder-gray-500 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <PermissionGuard permission="exportData">
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
            >
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export
            </button>
          </PermissionGuard>
        </div>
      </div>
      
      {/* Auto-archive info */}
      {autoArchiveInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-blue-800">
              Auto-checked {autoArchiveInfo.checked} members, {autoArchiveInfo.archived} archived for inactivity
            </span>
          </div>
        </div>
      )}
      
      {archivingInProgress && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          <span className="text-sm text-blue-700">Checking for inactive members...</span>
        </div>
      )}

      {/* Status Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('active')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'active'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Active Members
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'archived'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Archived
          </button>
        </nav>
      </div>
      
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-red-100 mb-4">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Error Loading Members</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <div className="mt-4">
              <button
                onClick={fetchMembers}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retry
              </button>
            </div>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-gray-100 mb-4">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No members found</h3>
            <p className="text-gray-500">
              {searchTerm ? 'No members found matching your search.' : `No ${activeTab} members found.`}
            </p>
            {hasPermission('addMembers') && (
              <div className="mt-4">
                <button
                  onClick={() => setIsAddMemberModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Member
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Full Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact Number
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentItems.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {getFullName(member)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          {member.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {member.phoneNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {member.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full w-fit ${
                            member.archived 
                              ? 'bg-gray-100 text-gray-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {member.archived ? 'Archived' : (member.status ? member.status.charAt(0).toUpperCase() + member.status.slice(1).toLowerCase() : 'Active')}
                          </span>
                          {member.archived && member.archiveReason && (
                            <span className="text-xs text-gray-500 mt-1 max-w-[150px] truncate" title={member.archiveReason}>
                              {member.archiveReason}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {activeTab === 'active' ? (
                          <>
                            <button
                              onClick={() => handleViewMember(member)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              View
                            </button>
                            {hasPermission('editMembers') && (
                              <button
                                onClick={() => handleEditMember(member)}
                                className="text-yellow-600 hover:text-yellow-900"
                              >
                                Edit
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleViewMember(member)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              View
                            </button>
                            {hasPermission('archiveMembers') && (
                              <button
                                onClick={() => openRestoreModal(member)}
                                className="text-green-600 hover:text-green-900"
                              >
                                Restore
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button
                    onClick={prevPage}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={nextPage}
                    disabled={currentPage === totalPages}
                    className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                      <span className="font-medium">{Math.min(indexOfLastItem, filteredMembers.length)}</span> of{' '}
                      <span className="font-medium">{filteredMembers.length}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                      <button
                        onClick={prevPage}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Previous</span>
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                        </svg>
                      </button>
                      
                      {/* Page numbers */}
                      {(() => {
                        const pageNumbers = [];
                        const maxVisiblePages = Math.min(5, totalPages);
                        
                        if (totalPages <= 5) {
                          for (let i = 1; i <= totalPages; i++) {
                            pageNumbers.push(i);
                          }
                        } else if (currentPage <= 3) {
                          for (let i = 1; i <= 5; i++) {
                            pageNumbers.push(i);
                          }
                        } else if (currentPage >= totalPages - 2) {
                          for (let i = totalPages - 4; i <= totalPages; i++) {
                            pageNumbers.push(i);
                          }
                        } else {
                          for (let i = currentPage - 2; i <= currentPage + 2; i++) {
                            pageNumbers.push(i);
                          }
                        }
                        
                        return pageNumbers.map(pageNum => (
                          <button
                            key={pageNum}
                            onClick={() => paginate(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                              pageNum === currentPage 
                                ? 'z-10 bg-red-600 text-white focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-red-600' 
                                : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0'
                            }`}
                          >
                            {pageNum}
                          </button>
                        ));
                      })()}
                      
                      <button
                        onClick={nextPage}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Next</span>
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Member Details Modal */}
      <MemberDetailsModal 
        member={viewingMember} 
        isOpen={!!viewingMember} 
        onClose={() => setViewingMember(null)} 
        onMarkInactive={() => fetchMembers()}
      />
      
      {/* Member Edit Modal */}
      <MemberEditModal 
        member={editingMember} 
        isOpen={!!editingMember} 
        onClose={() => setEditingMember(null)} 
        onMemberUpdated={handleMemberUpdated}
      />
      
      {/* Add Member Modal */}
      <MemberRegistrationModal 
        isOpen={isAddMemberModalOpen} 
        onClose={() => setIsAddMemberModalOpen(false)} 
        onMemberAdded={handleMemberAdded} 
      />

      {/* Restore Confirmation Modal */}
      {showRestoreModal && memberToRestore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800">Restore Member</h3>
                <button 
                  onClick={closeRestoreModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-6">
                {/* Confirmation Message */}
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
                  <p className="text-sm text-blue-800">
                    Restoring this account requires a reactivation fee of {systemSettings ? formatCurrency(systemSettings.reactivationFee) : '₱1,500.00'}. Please confirm payment details before proceeding.
                  </p>
                </div>
                
                {/* Member Details */}
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <p className="text-sm text-gray-800 mb-2">
                    <span className="font-medium">Member:</span> {memberToRestore.firstName} {memberToRestore.lastName}
                  </p>
                  <p className="text-sm text-gray-800">
                    <span className="font-medium">Email:</span> {memberToRestore.email || 'N/A'}
                  </p>
                </div>
                
                {/* Fixed Amount Display */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reactivation Fee
                  </label>
                  <div className="px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-lg font-bold text-gray-900">
                    {systemSettings ? formatCurrency(systemSettings.reactivationFee) : '₱1,500.00'}
                  </div>
                </div>
                
                {/* Control Number Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Receipt Control Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={controlNumber}
                    onChange={(e) => setControlNumber(e.target.value)}
                    placeholder="Enter receipt control number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-black"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeRestoreModal}
                  disabled={restoreLoading}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRestoreMember}
                  disabled={restoreLoading || controlNumber.trim() === ''}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {restoreLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    'Restore'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}