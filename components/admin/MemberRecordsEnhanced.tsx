'use client';

import { useEffect, useState, useCallback } from 'react';
import { firestore } from '@/lib/firebase';
import { ChevronLeft, ChevronRight, Search, User, Archive, RotateCcw, Eye, Filter, Calendar, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/lib/auth';
import { getSystemSettings, formatCurrency, SystemSettings } from '@/lib/settingsService';

interface Member {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  contactNumber?: string;
  phoneNumber?: string;
  address?: string;
  role?: string;
  status?: string;
  createdAt?: any;
  updatedAt?: any;
  lastActivityAt?: any;
  lastTransactionAt?: any;
  archivedAt?: string | null;
  archiveReason?: string | null;
  previousStatus?: string | null;
  restoredAt?: string | null;
  restoredBy?: string | null;
  reactivationFee?: number | null;
  reactivationReceiptNumber?: string | null;
}

// Constants for archiving
const INACTIVITY_THRESHOLD_DAYS = 180; // 6 months

export default function MemberRecordsEnhanced() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [archivingInProgress, setArchivingInProgress] = useState(false);
  const [autoArchiveInfo, setAutoArchiveInfo] = useState<{checked: number; archived: number} | null>(null);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  
  // Restore modal state
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [memberToRestore, setMemberToRestore] = useState<Member | null>(null);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [receiptError, setReceiptError] = useState('');
  const [restoreLoading, setRestoreLoading] = useState(false);
  
  // Mark as Inactive modal state
  const [showInactiveModal, setShowInactiveModal] = useState(false);
  const [memberToMarkInactive, setMemberToMarkInactive] = useState<Member | null>(null);
  const [markInactiveLoading, setMarkInactiveLoading] = useState(false);
  
  // Member details modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  // Format date for display
  const formatDate = (dateValue: any): string => {
    const date = parseFirestoreDate(dateValue);
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Check if member should be auto-archived (no transactions for 6 months)
  const shouldAutoArchiveMember = useCallback((member: Member): {shouldArchive: boolean; reason: string; daysInactive: number} => {
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
  }, []);

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

  // Restore an archived member with payment validation
  const restoreMember = async (member: Member, receiptNum: string): Promise<boolean> => {
    try {
      const now = new Date().toISOString();
      const reactivationFee = systemSettings?.reactivationFee || 1500;
      
      // Update member document
      const memberResult = await firestore.updateDocument('members', member.id, {
        status: member.previousStatus || 'active',
        archived: false,
        archivedAt: null,
        archiveReason: null,
        previousStatus: null,
        restoredAt: now,
        restoredBy: user?.uid || 'unknown',
        reactivationFee: reactivationFee,
        reactivationReceiptNumber: receiptNum,
        lastActivityAt: now,
        updatedAt: now
      });
      
      if (!memberResult.success) {
        throw new Error('Failed to update member document');
      }
      
      // Create reactivation transaction record
      const transactionId = `reactivation-${member.id}-${Date.now()}`;
      const transactionResult = await firestore.setDocument('transactions', transactionId, {
        id: transactionId,
        memberId: member.id,
        type: 'Reactivation Fee',
        amount: reactivationFee,
        receiptNumber: receiptNum,
        date: now,
        processedBy: user?.uid || 'unknown',
        processedByName: user?.displayName || user?.email || 'Admin',
        createdAt: now,
        description: `Membership reactivation fee for ${member.firstName} ${member.lastName}`
      });
      
      if (!transactionResult.success) {
        console.error('Failed to create transaction record:', transactionResult.error);
        // Don't fail the restore if transaction logging fails, but log it
      }
      
      // Also add to member's subcollection for easy retrieval
      const memberTransactionResult = await firestore.setDocument(
        `members/${member.id}/transactions`,
        transactionId,
        {
          id: transactionId,
          type: 'Reactivation Fee',
          amount: reactivationFee,
          receiptNumber: receiptNum,
          date: now,
          processedBy: user?.uid || 'unknown',
          processedByName: user?.displayName || user?.email || 'Admin',
          createdAt: now,
          description: 'Membership reactivation fee'
        }
      );
      
      if (!memberTransactionResult.success) {
        console.error('Failed to create member transaction record:', memberTransactionResult.error);
      }
      
      return true;
    } catch (error) {
      console.error(`Error restoring member ${member.id}:`, error);
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
      if (member.status === 'archived' || member.archivedAt) {
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

  // Open restore modal
  const openRestoreModal = (member: Member) => {
    setMemberToRestore(member);
    setReceiptNumber('');
    setReceiptError('');
    setShowRestoreModal(true);
  };

  // Close restore modal
  const closeRestoreModal = () => {
    setShowRestoreModal(false);
    setMemberToRestore(null);
    setReceiptNumber('');
    setReceiptError('');
  };

  // Handle restore with payment validation
  const handleRestoreWithPayment = async () => {
    if (!memberToRestore) return;
    
    // Validate receipt number
    if (!receiptNumber.trim()) {
      setReceiptError('Receipt number is required.');
      return;
    }
    
    setReceiptError('');
    setRestoreLoading(true);
    
    try {
      const success = await restoreMember(memberToRestore, receiptNumber.trim());
      if (success) {
        toast.success('Account successfully restored and marked as Active.');
        closeRestoreModal();
        fetchMembers();
      } else {
        toast.error('Failed to restore member. Please try again.');
      }
    } catch (error) {
      console.error('Error restoring member:', error);
      toast.error('An error occurred while restoring the member.');
    } finally {
      setRestoreLoading(false);
    }
  };

  // Open mark as inactive modal
  const openMarkInactiveModal = (member: Member, e: React.MouseEvent) => {
    e.stopPropagation();
    setMemberToMarkInactive(member);
    setShowInactiveModal(true);
  };

  // Close mark as inactive modal
  const closeMarkInactiveModal = () => {
    setShowInactiveModal(false);
    setMemberToMarkInactive(null);
  };

  // Handle mark as inactive
  const handleMarkAsInactive = async () => {
    if (!memberToMarkInactive) return;
    
    setMarkInactiveLoading(true);
    
    try {
      const success = await archiveMember(memberToMarkInactive, 'Marked manually by admin');
      if (success) {
        toast.success(`Member ${memberToMarkInactive.firstName} ${memberToMarkInactive.lastName} marked as inactive and archived.`);
        closeMarkInactiveModal();
        fetchMembers();
      } else {
        toast.error('Failed to mark member as inactive.');
      }
    } catch (error) {
      console.error('Error marking member as inactive:', error);
      toast.error('An error occurred.');
    } finally {
      setMarkInactiveLoading(false);
    }
  };

  // Open member details modal
  const openDetailsModal = (member: Member) => {
    setSelectedMember(member);
    setShowDetailsModal(true);
  };

  // Close member details modal
  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedMember(null);
  };

  useEffect(() => {
    fetchMembers();
    fetchSystemSettings();
  }, []);

  const fetchSystemSettings = async () => {
    const settings = await getSystemSettings();
    setSystemSettings(settings);
  };

  useEffect(() => {
    // Filter members based on search term and active tab
    const filtered = members.filter(member => {
      const fullName = `${member.firstName || ''} ${member.lastName || ''}`.toLowerCase();
      const email = (member.email || '').toLowerCase();
      const contact = (member.contactNumber || member.phoneNumber || '').toLowerCase();
      const search = searchTerm.toLowerCase();
      const matchesSearch = fullName.includes(search) || 
                           email.includes(search) || 
                           contact.includes(search) ||
                           member.id.toLowerCase().includes(search);
      
      // Filter by tab
      const isArchived = member.status === 'archived' || member.archivedAt;
      const matchesTab = activeTab === 'archived' ? isArchived : !isArchived;
      
      return matchesSearch && matchesTab;
    });
    setFilteredMembers(filtered);
    setCurrentPage(1);
  }, [searchTerm, members, activeTab]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      setArchivingInProgress(true);

      const result = await firestore.getCollection('members');
      if (!result.success) {
        throw new Error(`Failed to fetch members: ${result.error || 'Unknown error'}`);
      }

      const membersData = result.data || [];
      
      // Process member data
      const processedMembers = membersData.map((member: any) => ({
        id: member.id || '',
        firstName: member.firstName || member.fullName?.split(' ')[0] || 'Unknown',
        lastName: member.lastName || member.fullName?.split(' ').slice(1).join(' ') || 'Member',
        email: member.email || '',
        contactNumber: member.contactNumber || member.phoneNumber || '',
        phoneNumber: member.phoneNumber || '',
        address: member.address || '',
        role: member.role || 'Member',
        status: member.status || 'active',
        createdAt: member.createdAt || '',
        updatedAt: member.updatedAt || '',
        lastActivityAt: member.lastActivityAt || '',
        lastTransactionAt: member.lastTransactionAt || '',
        archivedAt: member.archivedAt || null,
        archiveReason: member.archiveReason || null,
        previousStatus: member.previousStatus || null,
        restoredAt: member.restoredAt || null,
        restoredBy: member.restoredBy || null,
        reactivationFee: member.reactivationFee || null,
        reactivationReceiptNumber: member.reactivationReceiptNumber || null
      }));
      
      // Auto-archive inactive members (6 months no transactions)
      const archiveResult = await autoArchiveInactiveMembers(processedMembers);
      setAutoArchiveInfo(archiveResult);
      
      if (archiveResult.archived > 0) {
        toast.success(`${archiveResult.archived} member(s) auto-archived due to 6 months inactivity`);
        
        // Re-fetch to get updated data after archiving
        const updatedResult = await firestore.getCollection('members');
        if (updatedResult.success && updatedResult.data) {
          const updatedMembers = updatedResult.data.map((member: any) => ({
            id: member.id || '',
            firstName: member.firstName || member.fullName?.split(' ')[0] || 'Unknown',
            lastName: member.lastName || member.fullName?.split(' ').slice(1).join(' ') || 'Member',
            email: member.email || '',
            contactNumber: member.contactNumber || member.phoneNumber || '',
            phoneNumber: member.phoneNumber || '',
            address: member.address || '',
            role: member.role || 'Member',
            status: member.status || 'active',
            createdAt: member.createdAt || '',
            updatedAt: member.updatedAt || '',
            lastActivityAt: member.lastActivityAt || '',
            lastTransactionAt: member.lastTransactionAt || '',
            archivedAt: member.archivedAt || null,
            archiveReason: member.archiveReason || null,
            previousStatus: member.previousStatus || null,
            restoredAt: member.restoredAt || null,
            restoredBy: member.restoredBy || null,
            reactivationFee: member.reactivationFee || null,
            reactivationReceiptNumber: member.reactivationReceiptNumber || null
          }));
          
          // Sort by createdAt descending
          updatedMembers.sort((a: Member, b: Member) => {
            const dateA = parseFirestoreDate(a.createdAt)?.getTime() || 0;
            const dateB = parseFirestoreDate(b.createdAt)?.getTime() || 0;
            return dateB - dateA;
          });
          
          setMembers(updatedMembers);
        }
      } else {
        // Sort by createdAt descending
        processedMembers.sort((a: Member, b: Member) => {
          const dateA = parseFirestoreDate(a.createdAt)?.getTime() || 0;
          const dateB = parseFirestoreDate(b.createdAt)?.getTime() || 0;
          return dateB - dateA;
        });
        
        setMembers(processedMembers);
      }
    } catch (err) {
      console.error('Error fetching members:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
      setArchivingInProgress(false);
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMembers = filteredMembers.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded w-full"></div>
          {[...Array(5)].map((_, idx) => (
            <div key={idx} className="h-12 bg-gray-200 rounded w-full"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Members</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchMembers}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Member Records</h2>
            {autoArchiveInfo && (
              <p className="text-xs text-gray-500 mt-1">
                Auto-checked {autoArchiveInfo.checked} members, {autoArchiveInfo.archived} archived for inactivity
              </p>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by name, email, phone, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 w-full sm:w-72 text-gray-900 placeholder-gray-500 shadow-sm"
            />
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex space-x-1 mt-4 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'active'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Active Members
            <span className="ml-2 text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
              {members.filter(m => m.status !== 'archived' && !m.archivedAt).length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'archived'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Archived Members
            <span className="ml-2 text-xs bg-red-200 text-red-700 px-2 py-0.5 rounded-full">
              {members.filter(m => m.status === 'archived' || m.archivedAt).length}
            </span>
          </button>
        </div>
        
        {archivingInProgress && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-sm text-blue-700">Checking for inactive members...</span>
          </div>
        )}
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              {activeTab === 'archived' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Archive Info</th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentMembers.length === 0 ? (
              <tr>
                <td colSpan={activeTab === 'archived' ? 6 : 5} className="px-6 py-8 text-center text-gray-500">
                  {searchTerm 
                    ? 'No members found matching your search.' 
                    : activeTab === 'archived' 
                      ? 'No archived members found.' 
                      : 'No active members found.'}
                </td>
              </tr>
            ) : (
              currentMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="shrink-0 h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-gray-500" />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {member.firstName} {member.lastName}
                        </div>
                        <div className="text-xs text-gray-400">
                          ID: #{member.id.slice(-6)}
                        </div>
                        {member.email && (
                          <div className="text-xs text-gray-500">
                            {member.email}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {member.contactNumber || member.phoneNumber || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                    {member.role || 'Member'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(member.status)}`}>
                      {member.status || 'Active'}
                    </span>
                  </td>
                  {activeTab === 'archived' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        <div className="text-xs text-gray-400">
                          {formatDate(member.archivedAt)}
                        </div>
                        <div className="text-xs text-gray-600 max-w-[200px] truncate" title={member.archiveReason || ''}>
                          {member.archiveReason || 'No reason provided'}
                        </div>
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      {/* View Details Button */}
                      <button
                        onClick={() => openDetailsModal(member)}
                        className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      
                      {activeTab === 'archived' ? (
                        <button
                          onClick={() => openRestoreModal(member)}
                          className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                          title="Restore member"
                        >
                          <RotateCcw className="h-3.5 w-3.5 mr-1" />
                          Restore
                        </button>
                      ) : (
                        <button
                          onClick={(e) => openMarkInactiveModal(member, e)}
                          className="inline-flex items-center px-3 py-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                          title="Mark as inactive"
                        >
                          <Archive className="h-3.5 w-3.5 mr-1" />
                          Mark Inactive
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredMembers.length)} of {filteredMembers.length} members
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

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
                    <AlertCircle className="h-4 w-4 inline mr-1" />
                    Restoring this account requires a reactivation fee of {systemSettings ? formatCurrency(systemSettings.reactivationFee) : '₱1,500.00'}. Please confirm the payment details before proceeding.
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
                  {memberToRestore.archiveReason && (
                    <p className="text-sm text-gray-800 mt-2">
                      <span className="font-medium">Archive Reason:</span> {memberToRestore.archiveReason}
                    </p>
                  )}
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
                
                {/* Receipt Number Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Receipt No. <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={receiptNumber}
                    onChange={(e) => {
                      setReceiptNumber(e.target.value);
                      if (e.target.value.trim()) setReceiptError('');
                    }}
                    placeholder="Enter receipt number"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                      receiptError ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {receiptError && (
                    <p className="text-red-500 text-xs mt-1">{receiptError}</p>
                  )}
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
                  onClick={handleRestoreWithPayment}
                  disabled={restoreLoading || !receiptNumber.trim()}
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
                    'Confirm Restore'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Inactive Confirmation Modal */}
      {showInactiveModal && memberToMarkInactive && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800">Mark as Inactive</h3>
                <button 
                  onClick={closeMarkInactiveModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-6">
                <div className="bg-red-50 p-4 rounded-lg mb-4">
                  <p className="text-sm text-red-800 mb-2">
                    <AlertCircle className="h-4 w-4 inline mr-1" />
                    Are you sure you want to mark this account as inactive?
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-800 mb-2">
                    <span className="font-medium">Member:</span> {memberToMarkInactive.firstName} {memberToMarkInactive.lastName}
                  </p>
                  <p className="text-sm text-gray-800">
                    <span className="font-medium">Email:</span> {memberToMarkInactive.email || 'N/A'}
                  </p>
                </div>
                
                <p className="text-gray-600 text-sm mt-4">
                  This will archive the account and move it to the Archived Members list. The member can be restored later with a reactivation fee of {systemSettings ? formatCurrency(systemSettings.reactivationFee) : '₱1,500.00'}.
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeMarkInactiveModal}
                  disabled={markInactiveLoading}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkAsInactive}
                  disabled={markInactiveLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {markInactiveLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    'Yes, Mark as Inactive'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Member Details Modal */}
      {showDetailsModal && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-800">Member Details</h3>
                <button 
                  onClick={closeDetailsModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Personal Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-3">Personal Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Full Name</p>
                      <p className="text-sm font-medium">{selectedMember.firstName} {selectedMember.lastName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Member ID</p>
                      <p className="text-sm font-medium">#{selectedMember.id.slice(-6)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="text-sm">{selectedMember.email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Contact</p>
                      <p className="text-sm">{selectedMember.contactNumber || selectedMember.phoneNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Role</p>
                      <p className="text-sm capitalize">{selectedMember.role || 'Member'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedMember.status)}`}>
                        {selectedMember.status || 'Active'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Dates */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-3">Account Timeline</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Created</p>
                      <p className="text-sm">{formatDate(selectedMember.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Last Activity</p>
                      <p className="text-sm">{formatDate(selectedMember.lastActivityAt || selectedMember.lastTransactionAt)}</p>
                    </div>
                    {selectedMember.archivedAt && (
                      <>
                        <div>
                          <p className="text-xs text-gray-500">Archived</p>
                          <p className="text-sm">{formatDate(selectedMember.archivedAt)}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500">Archive Reason</p>
                          <p className="text-sm">{selectedMember.archiveReason || 'No reason provided'}</p>
                        </div>
                      </>
                    )}
                    {selectedMember.restoredAt && (
                      <>
                        <div>
                          <p className="text-xs text-gray-500">Restored</p>
                          <p className="text-sm">{formatDate(selectedMember.restoredAt)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Reactivation Fee</p>
                          <p className="text-sm">₱{selectedMember.reactivationFee?.toLocaleString() || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Receipt Number</p>
                          <p className="text-sm">{selectedMember.reactivationReceiptNumber || 'N/A'}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={closeDetailsModal}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
