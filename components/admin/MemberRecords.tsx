'use client';

import { useEffect, useState, useCallback } from 'react';
import { firestore } from '@/lib/firebase';
import { ChevronLeft, ChevronRight, Search, User, Archive, RotateCcw, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/lib/auth';

interface Member {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  contactNumber?: string;
  address?: string;
  role?: string;
  status?: string;
  createdAt?: any;
  archivedAt?: string | null;
  archiveReason?: string | null;
  previousStatus?: string | null;
}

// Constants for archiving
const ARCHIVE_THRESHOLD_DAYS = 180; // 6 months
const REACTIVATION_FEE = 1500;

export default function MemberRecords() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [archivingInProgress, setArchivingInProgress] = useState(false);
  
  // Restore modal state
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [memberToRestore, setMemberToRestore] = useState<Member | null>(null);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [receiptError, setReceiptError] = useState('');
  const [restoreLoading, setRestoreLoading] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Helper function to parse Firestore timestamp (handles both Timestamp objects and ISO strings)
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

  // Check if member should be archived (older than 6 months)
  const shouldArchiveMember = useCallback((member: Member): boolean => {
    if (!member.createdAt) {
      console.log(`Member ${member.firstName} ${member.lastName}: No createdAt field`);
      return false;
    }
    
    console.log(`Member ${member.firstName} ${member.lastName}: createdAt raw value =`, member.createdAt);
    
    const createdDate = parseFirestoreDate(member.createdAt);
    if (!createdDate) {
      console.log(`Member ${member.firstName} ${member.lastName}: Failed to parse createdAt`);
      return false;
    }
    
    const currentDate = new Date();
    const diffTime = currentDate.getTime() - createdDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    console.log(`Member ${member.firstName} ${member.lastName}: created ${diffDays} days ago (threshold: ${ARCHIVE_THRESHOLD_DAYS})`);
    
    return diffDays >= ARCHIVE_THRESHOLD_DAYS;
  }, []);

  // Archive a single member
  const archiveMember = async (member: Member): Promise<boolean> => {
    try {
      const result = await firestore.updateDocument('members', member.id, {
        status: 'archived',
        archived: true,
        archivedAt: new Date().toISOString(),
        previousStatus: member.status || 'active'
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
      
      // Update member document
      const memberResult = await firestore.updateDocument('members', member.id, {
        status: member.previousStatus || 'active',
        archived: false,
        archivedAt: null,
        archiveReason: null,
        previousStatus: null,
        restoredAt: now,
        restoredBy: user?.uid || 'unknown',
        reactivationFee: REACTIVATION_FEE,
        reactivationReceiptNumber: receiptNum,
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
        amount: REACTIVATION_FEE,
        receiptNumber: receiptNum,
        date: now,
        processedBy: user?.uid || 'unknown',
        processedByName: user?.displayName || user?.email || 'Admin',
        createdAt: now,
        description: `Membership reactivation fee for ${member.firstName} ${member.lastName}`
      });
      
      if (!transactionResult.success) {
        console.error('Failed to create transaction record:', transactionResult.error);
      }
      
      // Also add to member's subcollection for easy retrieval
      const memberTransactionResult = await firestore.setDocument(
        `members/${member.id}/transactions`,
        transactionId,
        {
          id: transactionId,
          type: 'Reactivation Fee',
          amount: REACTIVATION_FEE,
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

  // Auto-archive members older than 6 months
  const autoArchiveOldMembers = async (membersList: Member[]): Promise<number> => {
    console.log('=== AUTO ARCHIVE CHECK ===');
    console.log(`Total members checked: ${membersList.length}`);
    
    const membersToArchive = membersList.filter(member => {
      const isNotArchived = member.status !== 'archived';
      const isOld = shouldArchiveMember(member);
      
      console.log(`Member: ${member.firstName} ${member.lastName}, Status: ${member.status}, Should Archive: ${isNotArchived && isOld}`);
      
      return isNotArchived && isOld;
    });
    
    console.log(`Members to archive: ${membersToArchive.length}`);
    
    if (membersToArchive.length === 0) {
      console.log('No members need archiving');
      return 0;
    }
    
    setArchivingInProgress(true);
    let archivedCount = 0;
    
    for (const member of membersToArchive) {
      console.log(`Archiving member: ${member.firstName} ${member.lastName}`);
      const success = await archiveMember(member);
      if (success) {
        archivedCount++;
        console.log(`Successfully archived: ${member.firstName} ${member.lastName}`);
      } else {
        console.error(`Failed to archive: ${member.firstName} ${member.lastName}`);
      }
    }
    
    setArchivingInProgress(false);
    console.log(`=== ARCHIVE COMPLETE: ${archivedCount} members archived ===`);
    return archivedCount;
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
    const trimmedReceipt = receiptNumber.trim();
    if (!trimmedReceipt) {
      setReceiptError('Receipt number is required.');
      return;
    }
    
    setReceiptError('');
    setRestoreLoading(true);
    
    try {
      const success = await restoreMember(memberToRestore, trimmedReceipt);
      if (success) {
        toast.success('Account successfully restored.');
        closeRestoreModal();
        // Switch to active tab to show restored member
        setActiveTab('active');
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

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    // Filter members based on search term and active tab
    const filtered = members.filter(member => {
      const fullName = `${member.firstName || ''} ${member.lastName || ''}`.toLowerCase();
      const email = (member.email || '').toLowerCase();
      const search = searchTerm.toLowerCase();
      const matchesSearch = fullName.includes(search) || email.includes(search);
      
      // Filter by tab
      const isArchived = member.status === 'archived';
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

      const result = await firestore.getCollection('members');
      if (!result.success) {
        throw new Error(`Failed to fetch members: ${result.error || 'Unknown error'}`);
      }

      const membersData = result.data || [];
      
      // Process member data to ensure proper name fields
      const processedMembers = membersData.map((member: any) => {
        console.log('Processing member:', member.id, 'createdAt:', member.createdAt, 'archived:', member.archived, 'status:', member.status);
        
        // Handle both 'archived: true' and 'status: archived' formats
        const isArchived = member.archived === true || member.status === 'archived';
        const memberStatus = isArchived ? 'archived' : (member.status || 'active');
        
        return {
          id: member.id || '',
          firstName: member.firstName || member.fullName?.split(' ')[0] || 'Unknown',
          lastName: member.lastName || member.fullName?.split(' ').slice(1).join(' ') || 'Member',
          email: member.email || '',
          contactNumber: member.contactNumber || member.phoneNumber || '',
          address: member.address || '',
          role: member.role || 'Member',
          status: memberStatus,
          createdAt: member.createdAt || '',
          archivedAt: member.archivedAt || null,
          previousStatus: member.previousStatus || null
        };
      });
      
      // Auto-archive members older than 6 months
      const archivedCount = await autoArchiveOldMembers(processedMembers);
      if (archivedCount > 0) {
        toast.success(`${archivedCount} member(s) automatically archived (older than 6 months)`);
      }
      
      // Re-fetch to get updated data after archiving
      if (archivedCount > 0) {
        const updatedResult = await firestore.getCollection('members');
        if (updatedResult.success && updatedResult.data) {
          const updatedMembers = updatedResult.data.map((member: any) => ({
            id: member.id || '',
            firstName: member.firstName || member.fullName?.split(' ')[0] || 'Unknown',
            lastName: member.lastName || member.fullName?.split(' ').slice(1).join(' ') || 'Member',
            email: member.email || '',
            contactNumber: member.contactNumber || member.phoneNumber || '',
            address: member.address || '',
            role: member.role || 'Member',
            status: member.status || 'active',
            createdAt: member.createdAt || '',
            archivedAt: member.archivedAt || null,
            previousStatus: member.previousStatus || null
          }));
          
          // Sort by createdAt descending
          updatedMembers.sort((a: Member, b: Member) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          });
          
          setMembers(updatedMembers);
        }
      } else {
        // Sort by createdAt descending
        processedMembers.sort((a: Member, b: Member) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        
        setMembers(processedMembers);
      }
    } catch (err) {
      console.error('Error fetching members:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
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

  // Calculate days since creation
  const getDaysSinceCreation = (createdAt?: string): number => {
    if (!createdAt) return 0;
    const createdDate = new Date(createdAt);
    const currentDate = new Date();
    const diffTime = currentDate.getTime() - createdDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
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
          <h2 className="text-xl font-semibold text-gray-800">Member Records</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64"
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
          </button>
        </div>
        
        {archivingInProgress && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-sm text-blue-700">Auto-archiving old members...</span>
          </div>
        )}
        
        {/* Manual Archive Trigger */}
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={fetchMembers}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            Refresh & Check for Archives
          </button>
          <span className="text-xs text-gray-500">
            (Checks all members and archives those older than 6 months)
          </span>
        </div>
        
        {/* Debug Info */}     
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              {(activeTab === 'archived' || activeTab === 'active') && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              )}
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
                        {member.createdAt && (
                          <div className="text-xs text-gray-400">
                            Created: {new Date(member.createdAt).toLocaleDateString()}
                            {activeTab === 'active' && getDaysSinceCreation(member.createdAt) >= 150 && (
                              <span className="ml-1 text-orange-500">
                                ({getDaysSinceCreation(member.createdAt)} days)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {member.email || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {member.contactNumber || 'N/A'}
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
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openRestoreModal(member);
                        }}
                        className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                        title="Restore member to active status"
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        Restore
                      </button>
                    </td>
                  )}
                  {activeTab === 'active' && shouldArchiveMember(member) && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={async () => {
                          const success = await archiveMember(member);
                          if (success) {
                            toast.success(`Member archived successfully`);
                            fetchMembers();
                          } else {
                            toast.error('Failed to archive member');
                          }
                        }}
                        className="inline-flex items-center px-3 py-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                        title="Archive this member now"
                      >
                        <Archive className="h-3.5 w-3.5 mr-1" />
                        Archive Now
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
                    Restoring this account requires a reactivation fee of ₱1,500.00. Please confirm payment details before proceeding.
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
                    ₱{REACTIVATION_FEE.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
    </div>
  );
}
