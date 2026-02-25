'use client';

import { useState, useEffect } from 'react';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/lib/auth';
import MemberEditModal from '@/components/admin/MemberEditModal';
import MemberRegistrationModal from '@/components/admin/MemberRegistrationModal';
import { Member } from '@/lib/types/member';
import { Eye, Pencil, Archive, Plus, Download, Search, RotateCcw, AlertCircle, History, FileText, X } from 'lucide-react';

const REACTIVATION_FEE = 1500;
const TRANSACTIONS_PER_PAGE = 5;

// Transaction type definition
interface Transaction {
  id: string;
  memberId: string;
  type: string;
  amount: number;
  receiptNumber?: string;
  date: string;
  status?: string;
  description?: string;
  createdAt?: string;
}

// Loan type definition
interface Loan {
  id: string;
  memberId: string;
  status: 'Active' | 'Closed' | 'Partially Settled via Savings' | string;
  remainingBalance: number;
  amount: number;
  autoDeducted?: boolean;
  autoDeductedAt?: string;
  closedReason?: string;
}

export default function SecretaryMemberRecordsPage() {
  const { user } = useAuth();
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
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [memberToArchive, setMemberToArchive] = useState<Member | null>(null);
  const [archivingMember, setArchivingMember] = useState(false);
  
  // View modal transaction state
  const [viewMemberTransactions, setViewMemberTransactions] = useState<Transaction[]>([]);
  const [loadingViewTransactions, setLoadingViewTransactions] = useState(false);
  const [viewTransactionPage, setViewTransactionPage] = useState(1);
  const [showViewCertificate, setShowViewCertificate] = useState(false);
  
  // Test date input state for auto-archive simulation
  const [testDateInput, setTestDateInput] = useState('');
  const [savingTestDate, setSavingTestDate] = useState(false);
  
  // Restore modal state
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [memberToRestore, setMemberToRestore] = useState<Member | null>(null);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [receiptError, setReceiptError] = useState('');
  const [restoreLoading, setRestoreLoading] = useState(false);
  
  // Restore confirmation modal state
  const [showRestoreConfirmModal, setShowRestoreConfirmModal] = useState(false);
  
  // Mark as Inactive modal state
  const [showMarkInactiveModal, setShowMarkInactiveModal] = useState(false);
  const [memberToMarkInactive, setMemberToMarkInactive] = useState<Member | null>(null);
  const [markingInactive, setMarkingInactive] = useState(false);
  const [inactiveCheckResult, setInactiveCheckResult] = useState<{
    canMark: boolean;
    lastTransactionDate: Date | null;
    monthsSinceLastTransaction: number;
  } | null>(null);
  
  const itemsPerPage = 10;

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    filterMembers();
  }, [searchTerm, members, activeTab]);

  // Clear error when members are successfully loaded
  useEffect(() => {
    if (members.length > 0) {
      setError(null);
    }
  }, [members]);

  // Convert Firestore timestamp to JS Date
  const convertTimestampToDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    
    // Handle Firestore Timestamp object (has seconds and nanoseconds)
    if (timestamp.seconds !== undefined && timestamp.nanoseconds !== undefined) {
      return new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
    }
    
    // Handle ISO string or regular date string
    if (typeof timestamp === 'string') {
      return new Date(timestamp);
    }
    
    // Handle Date object
    if (timestamp instanceof Date) {
      return timestamp;
    }
    
    return null;
  };

  // Create notification for member
  const createNotification = async (memberId: string, title: string, message: string, type: string) => {
    try {
      const notificationId = `notif-${memberId}-${Date.now()}`;
      await firestore.setDocument('notifications', notificationId, {
        id: notificationId,
        memberId,
        title,
        message,
        type,
        read: false,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  // Log activity to activityLogs collection
  const logActivity = async (action: string, target: string, targetId: string, details: string) => {
    try {
      const logId = `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await firestore.setDocument('activityLogs', logId, {
        id: logId,
        action,
        target,
        targetId,
        details,
        timestamp: new Date().toISOString(),
        userId: user?.uid || 'system',
        userRole: 'Secretary',
        userName: user?.displayName || user?.email || 'Secretary',
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  // Handle loan deduction from savings when member becomes inactive
  const handleInactiveLoanDeduction = async (member: Member): Promise<{ deducted: boolean; amount: number; remainingLoan: number }> => {
    try {
      // Fetch member's active loans
      const loansResult = await firestore.getCollection('loans');
      if (!loansResult.success || !loansResult.data) {
        return { deducted: false, amount: 0, remainingLoan: 0 };
      }

      const activeLoans = loansResult.data.filter((loan: any) => 
        loan.memberId === member.id && 
        loan.status?.toLowerCase() === 'active'
      ) as Loan[];

      if (activeLoans.length === 0) {
        return { deducted: false, amount: 0, remainingLoan: 0 };
      }

      let totalDeducted = 0;
      let totalRemaining = 0;

      for (const loan of activeLoans) {
        const savingsCredits = member.savingsCredits || 0;
        const remainingBalance = loan.remainingBalance || 0;

        if (savingsCredits >= remainingBalance) {
          // Case 1: Savings >= Remaining Loan
          const newSavings = savingsCredits - remainingBalance;
          const now = new Date().toISOString();

          // Update member savings
          await firestore.updateDocument('members', member.id, {
            savingsCredits: newSavings,
            updatedAt: now,
          });

          // Update loan status
          await firestore.updateDocument('loans', loan.id, {
            remainingBalance: 0,
            status: 'Closed',
            closedReason: 'Auto-deducted due to 6 months inactivity',
            autoDeducted: true,
            autoDeductedAt: now,
            updatedAt: now,
          });

          // Create loan payment transaction record
          const transactionId = `loan-deduction-${loan.id}-${Date.now()}`;
          await firestore.setDocument('transactions', transactionId, {
            id: transactionId,
            memberId: member.id,
            loanId: loan.id,
            type: 'Loan Deduction',
            amount: remainingBalance,
            description: `Loan auto-deducted from savings due to 6 months inactivity`,
            date: now,
            status: 'Completed',
            processedBy: 'system',
            processedByName: 'Auto-Archive System',
            createdAt: now,
          });

          totalDeducted += remainingBalance;

          // Log activity
          await logActivity(
            'Loan Auto-Deducted',
            'Loan',
            loan.id,
            `Loan of ₱${remainingBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })} auto-deducted from savings for member ${member.firstName} ${member.lastName} due to inactivity`
          );

        } else if (savingsCredits > 0) {
          // Case 2: Savings < Remaining Loan
          const newRemainingBalance = remainingBalance - savingsCredits;
          const now = new Date().toISOString();

          // Update member savings (set to 0)
          await firestore.updateDocument('members', member.id, {
            savingsCredits: 0,
            updatedAt: now,
          });

          // Update loan status
          await firestore.updateDocument('loans', loan.id, {
            remainingBalance: newRemainingBalance,
            status: 'Partially Settled via Savings',
            autoDeducted: true,
            autoDeductedAt: now,
            updatedAt: now,
          });

          // Create loan payment transaction record
          const transactionId = `loan-deduction-${loan.id}-${Date.now()}`;
          await firestore.setDocument('transactions', transactionId, {
            id: transactionId,
            memberId: member.id,
            loanId: loan.id,
            type: 'Loan Partial Deduction',
            amount: savingsCredits,
            description: `Partial loan payment from savings due to 6 months inactivity. Remaining balance: ₱${newRemainingBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
            date: now,
            status: 'Completed',
            processedBy: 'system',
            processedByName: 'Auto-Archive System',
            createdAt: now,
          });

          totalDeducted += savingsCredits;
          totalRemaining += newRemainingBalance;

          // Log activity
          await logActivity(
            'Loan Partially Auto-Deducted',
            'Loan',
            loan.id,
            `Partial payment of ₱${savingsCredits.toLocaleString('en-PH', { minimumFractionDigits: 2 })} applied to loan for member ${member.firstName} ${member.lastName}. Remaining: ₱${newRemainingBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
          );

          // Flag for admin review
          await createNotification(
            member.id,
            'Loan Partially Settled - Admin Review Required',
            `Your loan was partially settled using your savings (₱${savingsCredits.toLocaleString('en-PH', { minimumFractionDigits: 2 })}). Remaining balance: ₱${newRemainingBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}. Please contact the office.`,
            'loan_partial_settlement'
          );
        }
      }

      // Update member object locally
      if (totalDeducted > 0) {
        member.savingsCredits = Math.max(0, (member.savingsCredits || 0) - totalDeducted);
      }

      return { deducted: totalDeducted > 0, amount: totalDeducted, remainingLoan: totalRemaining };
    } catch (error) {
      console.error('Error handling inactive loan deduction:', error);
      return { deducted: false, amount: 0, remainingLoan: 0 };
    }
  };

  // Check if member has been inactive for 6 months and auto-archive
  const checkAndAutoArchiveInactiveMembers = async (membersList: Member[]) => {
    const membersToArchive: Member[] = [];
    
    for (const member of membersList) {
      // Only process members who are ALREADY marked as inactive
      // Skip active members, archived members, and members without inactive status
      if (member.archived || member.status === 'archived') continue;
      if (member.status?.toLowerCase() !== 'inactive') continue;
      
      try {
        // Check if member has been inactive for 6 months
        const inactiveAt = member.inactiveAt 
          ? convertTimestampToDate(member.inactiveAt) 
          : null;
        
        if (!inactiveAt) continue;
        
        // Determine comparison date: use autoArchiveTestDate if exists, otherwise use current date
        const comparisonDate = member.autoArchiveTestDate 
          ? convertTimestampToDate(member.autoArchiveTestDate) 
          : new Date();
        
        if (!comparisonDate) continue;
        
        const sixMonthsAgo = new Date(comparisonDate.getFullYear(), comparisonDate.getMonth() - 6, comparisonDate.getDate());
        
        // Only archive if member has been inactive for more than 6 months
        if (inactiveAt < sixMonthsAgo) {
          membersToArchive.push(member);
        }
      } catch (error) {
        console.error(`Error checking inactive status for member ${member.id}:`, error);
      }
    }
    
    // Auto-archive members who have been inactive for 6+ months
    if (membersToArchive.length > 0) {
      console.log(`Auto-archiving ${membersToArchive.length} members who have been inactive for 6+ months`);
      
      for (const member of membersToArchive) {
        try {
          const now = new Date().toISOString();
          
          // Step 1: Handle loan deduction from savings (if active loan exists)
          const deductionResult = await handleInactiveLoanDeduction(member);
          
          if (deductionResult.deducted) {
            // Send loan deduction notification
            const remainingMsg = deductionResult.remainingLoan > 0 
              ? ` Remaining loan balance: ₱${deductionResult.remainingLoan.toLocaleString('en-PH', { minimumFractionDigits: 2 })}.`
              : ' Your loan has been fully settled.';
            
            await createNotification(
              member.id,
              'Loan Deducted from Savings',
              `₱${deductionResult.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} has been deducted from your savings to settle your loan due to 6 months inactivity.${remainingMsg}`,
              'loan_deduction'
            );
          }
          
          // Step 2: Archive the member
          const archiveResult = await firestore.updateDocument('members', member.id, {
            status: 'archived',
            archived: true,
            archivedAt: now,
            archiveReason: 'Auto-archived after 6 months of inactivity',
            previousStatus: 'inactive',
            autoArchived: true,
            updatedAt: now,
          });
          
          if (archiveResult.success) {
            // Update local state
            member.status = 'archived';
            member.archived = true;
            member.archivedAt = now;
            member.archiveReason = 'Auto-archived after 6 months of inactivity';
            member.autoArchived = true;
            member.previousStatus = 'inactive';
            
            // Log archiving
            await logActivity(
              'Member Auto-Archived',
              'Member',
              member.id,
              `Member ${member.firstName} ${member.lastName} auto-archived after 6 months of inactivity`
            );
            
            // Send archive notification to user
            await createNotification(
              member.id,
              'Account Archived',
              'Your account has been archived due to 6 months of inactivity. Please contact the office to restore your account.',
              'account_archived'
            );
            
            toast.success(`${member.firstName} ${member.lastName} auto-archived after 6 months of inactivity`);
          }
        } catch (error) {
          console.error(`Error auto-archiving member ${member.id}:`, error);
        }
      }
    }
    
    return membersToArchive.length;
  };

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      
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
              archivedAt: doc.archivedAt || null,
              archiveReason: doc.archiveReason || null,
              autoArchived: doc.autoArchived || false,
              driverInfo: doc.driverInfo || null,
              operatorInfo: doc.operatorInfo || null,
              ...doc
            }));
          
          // Check for inactive members and auto-archive
          await checkAndAutoArchiveInactiveMembers(memberData);
          
          // Sort members by creation date in descending order (newest first)
          const sortedMembers = memberData.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
          });
          
          setMembers(sortedMembers);
          return;
        }
      }
      
      if (result.success && result.data) {
        // Process members from the members collection
        const membersData = result.data.map((doc: any) => {
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
            archivedAt: doc.archivedAt || null,
            archiveReason: doc.archiveReason || null,
            autoArchived: doc.autoArchived || false,
            driverInfo: doc.driverInfo || null,
            operatorInfo: doc.operatorInfo || null,
            ...doc
          };
        });
        
        // Check for inactive members and auto-archive
        await checkAndAutoArchiveInactiveMembers(membersData);
        
        // Sort members by creation date in descending order
        const sortedMembers = membersData.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });
        
        setMembers(sortedMembers);
      } else {
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
    }
  };

  const filterMembers = () => {
    if (!members || members.length === 0) {
      setFilteredMembers([]);
      return;
    }
    
    // Filter by active/archived status first
    // Active tab shows: active members AND inactive members (not yet archived)
    // Archived tab shows: only archived members
    const statusFiltered = members.filter(member => {
      if (activeTab === 'active') {
        // Show active members and inactive members (who are not archived)
        return !member.archived && member.status !== 'archived';
      } else {
        // Archived tab only shows archived members
        return member.archived === true || member.status === 'archived';
      }
    });

    // Then apply search filter
    if (!searchTerm) {
      setFilteredMembers(statusFiltered);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = statusFiltered.filter(member => {
      const firstName = member.firstName || '';
      const lastName = member.lastName || '';
      const email = member.email || '';
      const id = member.id || '';
      const middleName = member.middleName || '';
      const suffix = member.suffix || '';
      const phoneNumber = member.phoneNumber || '';
      
      return (
        firstName.toLowerCase().includes(term) ||
        lastName.toLowerCase().includes(term) ||
        email.toLowerCase().includes(term) ||
        id.toLowerCase().includes(term) ||
        middleName.toLowerCase().includes(term) ||
        suffix.toLowerCase().includes(term) ||
        phoneNumber.toLowerCase().includes(term)
      );
    });
    
    setFilteredMembers(filtered);
    setCurrentPage(1);
  };

  const handleEditMember = (member: Member) => {
    setEditingMember(member);
  };



  const openArchiveConfirmation = (member: Member) => {
    // Only allow archiving if status is Inactive or inactive
    if (member.status?.toLowerCase() !== 'inactive' && !member.archived) {
      toast.error('Account must be marked as Inactive before archiving.');
      return;
    }
    setMemberToArchive(member);
    setShowArchiveConfirm(true);
  };

  const closeArchiveConfirmation = () => {
    setShowArchiveConfirm(false);
    setMemberToArchive(null);
  };

  const handleArchiveMember = async () => {
    if (!memberToArchive) return;
    
    setArchivingMember(true);
    try {
      const now = new Date().toISOString();
      const result = await firestore.updateDocument('members', memberToArchive.id, {
        archived: true,
        status: 'archived',
        archivedAt: now,
        archivedBy: user?.uid || 'secretary',
        updatedAt: now,
      });
      
      if (result.success) {
        setMembers(prevMembers => 
          prevMembers.map(member => 
            member.id === memberToArchive.id 
              ? { ...member, archived: true, status: 'archived', archivedAt: now } 
              : member
          )
        );
        
        // Send notification to user about manual archiving
        await createNotification(
          memberToArchive.id,
          'Account Archived',
          'Your account has been archived by the administrator due to prolonged inactivity. Please contact support for assistance.',
          'account_archived'
        );
        
        // Log the manual archive activity
        await logActivity(
          'Member Manually Archived',
          'Member',
          memberToArchive.id,
          `Member ${memberToArchive.firstName} ${memberToArchive.lastName} manually archived by Secretary`
        );
        
        toast.success('Member archived successfully');
        closeArchiveConfirmation();
      } else {
        toast.error('Failed to archive member');
      }
    } catch (error) {
      console.error('Error archiving member:', error);
      toast.error('An error occurred while archiving member');
    } finally {
      setArchivingMember(false);
    }
  };

  const openRestoreModal = (member: Member) => {
    setMemberToRestore(member);
    setReceiptNumber('');
    setReceiptError('');
    setShowRestoreModal(true);
  };

  const closeRestoreModal = () => {
    setShowRestoreModal(false);
    setMemberToRestore(null);
    setReceiptNumber('');
    setReceiptError('');
  };

  const handleRestoreWithPayment = async () => {
    if (!memberToRestore) return;
    
    // Validate receipt number
    const trimmedReceipt = receiptNumber.trim();
    if (!trimmedReceipt) {
      setReceiptError('Receipt number is required.');
      return;
    }
    
    // Show confirmation modal
    setShowRestoreConfirmModal(true);
  };

  const confirmRestore = async () => {
    if (!memberToRestore) return;
    
    const trimmedReceipt = receiptNumber.trim();
    if (!trimmedReceipt) {
      setReceiptError('Receipt number is required.');
      return;
    }
    
    setReceiptError('');
    setRestoreLoading(true);
    
    try {
      const now = new Date().toISOString();
      const memberId = memberToRestore.id;
      const memberName = `${memberToRestore.firstName} ${memberToRestore.lastName}`;
      
      // Update member document
      const memberResult = await firestore.updateDocument('members', memberId, {
        status: 'active',
        archived: false,
        archivedAt: null,
        archiveReason: null,
        previousStatus: null,
        restoredAt: now,
        restoredBy: user?.uid || 'unknown',
        reactivationFee: REACTIVATION_FEE,
        reactivationReceiptNumber: trimmedReceipt,
        updatedAt: now
      });
      
      if (!memberResult.success) {
        throw new Error('Failed to update member document');
      }
      
      // Create reactivation transaction record
      const transactionId = `reactivation-${memberId}-${Date.now()}`;
      await firestore.setDocument('transactions', transactionId, {
        id: transactionId,
        memberId: memberId,
        type: 'Reactivation Fee',
        amount: REACTIVATION_FEE,
        receiptNumber: trimmedReceipt,
        date: now,
        processedBy: user?.uid || 'unknown',
        processedByName: user?.displayName || user?.email || 'Secretary',
        createdAt: now,
        description: `Membership reactivation fee for ${memberName}`
      });
      
      // Also add to member's subcollection
      await firestore.setDocument(
        `members/${memberId}/transactions`,
        transactionId,
        {
          id: transactionId,
          type: 'Reactivation Fee',
          amount: REACTIVATION_FEE,
          receiptNumber: trimmedReceipt,
          date: now,
          processedBy: user?.uid || 'unknown',
          processedByName: user?.displayName || user?.email || 'Secretary',
          createdAt: now,
          description: 'Membership reactivation fee'
        }
      );
      
      // Update local state
      setMembers(prevMembers => 
        prevMembers.map(member => 
          member.id === memberId 
            ? { ...member, archived: false, status: 'active' } 
            : member
        )
      );
      
      toast.success('Member restored successfully');
      setShowRestoreConfirmModal(false);
      closeRestoreModal();
    } catch (error) {
      console.error('Error restoring member:', error);
      toast.error('An error occurred while restoring member');
    } finally {
      setRestoreLoading(false);
    }
  };

  const handleMarkInactive = (member: Member) => {
    // Update the member in the local state
    setMembers(prevMembers => 
      prevMembers.map(m => 
        m.id === member.id 
          ? { ...m, status: 'inactive', inactiveAt: new Date().toISOString() } 
          : m
      )
    );
    fetchMembers(); // Refresh from server
  };

  // Check if member can be marked as inactive (no transaction in 6 months)
  const checkAndOpenMarkInactiveModal = async (member: Member) => {
    setMemberToMarkInactive(member);
    setShowMarkInactiveModal(true);
    setMarkingInactive(true);
    
    try {
      // Fetch all transactions for this member
      const result = await firestore.getCollection(`members/${member.id}/transactions`);
      
      let lastTransactionDate: Date | null = null;
      let monthsSinceLastTransaction = 0;
      let canMark = false;
      
      if (result.success && result.data && result.data.length > 0) {
        // Sort by date descending and get the most recent
        const sortedTransactions = result.data.sort((a: any, b: any) => {
          const dateA = convertTimestampToDate(a.date)?.getTime() || 0;
          const dateB = convertTimestampToDate(b.date)?.getTime() || 0;
          return dateB - dateA;
        });
        
        const mostRecentTransaction = sortedTransactions[0] as any;
        if (mostRecentTransaction?.date) {
          lastTransactionDate = convertTimestampToDate(mostRecentTransaction.date);
        }
      }
      
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      
      // Only allow marking as inactive if member HAS transactions and last one is 6+ months ago
      // New accounts without transactions cannot be marked as inactive
      if (lastTransactionDate && lastTransactionDate < sixMonthsAgo) {
        canMark = true;
      }
      
      if (lastTransactionDate) {
        const diffTime = now.getTime() - lastTransactionDate.getTime();
        monthsSinceLastTransaction = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));
      }
      
      setInactiveCheckResult({
        canMark,
        lastTransactionDate,
        monthsSinceLastTransaction
      });
    } catch (error) {
      console.error('Error checking transactions:', error);
      setInactiveCheckResult({
        canMark: false,
        lastTransactionDate: null,
        monthsSinceLastTransaction: 0
      });
    } finally {
      setMarkingInactive(false);
    }
  };

  const closeMarkInactiveModal = () => {
    setShowMarkInactiveModal(false);
    setMemberToMarkInactive(null);
    setInactiveCheckResult(null);
  };

  const confirmMarkAsInactive = async () => {
    if (!memberToMarkInactive || !inactiveCheckResult?.canMark) return;
    
    setMarkingInactive(true);
    try {
      const now = new Date().toISOString();
      const result = await firestore.updateDocument('members', memberToMarkInactive.id, {
        status: 'inactive',
        inactiveAt: now,
        inactiveReason: 'No transaction in 6 months',
        updatedAt: now,
      });
      
      if (result.success) {
        // Update local state
        setMembers(prevMembers => 
          prevMembers.map(m => 
            m.id === memberToMarkInactive.id 
              ? { ...m, status: 'inactive', inactiveAt: now } 
              : m
          )
        );
        
        // Update viewing member if it's the same
        if (viewingMember?.id === memberToMarkInactive.id) {
          setViewingMember({ ...viewingMember, status: 'inactive', inactiveAt: now });
        }
        
        // Send notification to user
        await createNotification(
          memberToMarkInactive.id,
          'Account Inactive',
          'Your account has been marked Inactive due to no transactions for 6 months. Please contact the office to reactivate your account.',
          'account_inactive'
        );
        
        // Log the activity
        await logActivity(
          'Member Marked Inactive (Manual)',
          'Member',
          memberToMarkInactive.id,
          `Member ${memberToMarkInactive.firstName} ${memberToMarkInactive.lastName} manually marked as inactive by Secretary due to 6 months no transaction`
        );
        
        toast.success(`${getFullName(memberToMarkInactive)} has been marked as inactive`);
        closeMarkInactiveModal();
      } else {
        toast.error('Failed to mark member as inactive');
      }
    } catch (error) {
      console.error('Error marking member as inactive:', error);
      toast.error('An error occurred while marking member as inactive');
    } finally {
      setMarkingInactive(false);
    }
  };

  // Handle view member - opens modal with transaction history
  const handleViewMember = async (member: Member) => {
    setViewingMember(member);
    setViewTransactionPage(1);
    setShowViewCertificate(false);
    await fetchViewMemberTransactions(member.id);
  };

  // Close view modal
  const closeViewModal = () => {
    setViewingMember(null);
    setViewMemberTransactions([]);
    setViewTransactionPage(1);
    setShowViewCertificate(false);
    setTestDateInput('');
  };

  // Save test date for auto-archive simulation
  const handleSaveTestDate = async () => {
    if (!viewingMember || !testDateInput) return;
    
    setSavingTestDate(true);
    try {
      // Convert input date to ISO string (which will be stored as Firestore Timestamp)
      const testDate = new Date(testDateInput);
      
      const result = await firestore.updateDocument('members', viewingMember.id, {
        autoArchiveTestDate: testDate.toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      if (result.success) {
        // Update local state
        setMembers(prevMembers => 
          prevMembers.map(m => 
            m.id === viewingMember.id 
              ? { ...m, autoArchiveTestDate: testDate.toISOString() } 
              : m
          )
        );
        setViewingMember({ ...viewingMember, autoArchiveTestDate: testDate.toISOString() });
        toast.success('Test date saved successfully');
      } else {
        toast.error('Failed to save test date');
      }
    } catch (error) {
      console.error('Error saving test date:', error);
      toast.error('An error occurred while saving test date');
    } finally {
      setSavingTestDate(false);
    }
  };

  // Clear test date
  const handleClearTestDate = async () => {
    if (!viewingMember) return;
    
    setSavingTestDate(true);
    try {
      const result = await firestore.updateDocument('members', viewingMember.id, {
        autoArchiveTestDate: null,
        updatedAt: new Date().toISOString()
      });
      
      if (result.success) {
        // Update local state
        setMembers(prevMembers => 
          prevMembers.map(m => {
            if (m.id === viewingMember.id) {
              const { autoArchiveTestDate, ...rest } = m;
              return rest;
            }
            return m;
          })
        );
        setViewingMember({ ...viewingMember, autoArchiveTestDate: undefined });
        setTestDateInput('');
        toast.success('Test date cleared successfully');
      } else {
        toast.error('Failed to clear test date');
      }
    } catch (error) {
      console.error('Error clearing test date:', error);
      toast.error('An error occurred while clearing test date');
    } finally {
      setSavingTestDate(false);
    }
  };

  // Fetch transactions for view modal
  const fetchViewMemberTransactions = async (memberId: string) => {
    setLoadingViewTransactions(true);
    try {
      // Fetch from both member subcollection and main transactions collection
      const [memberSubResult, mainTransactionsResult] = await Promise.all([
        firestore.getCollection(`members/${memberId}/transactions`),
        firestore.getCollection('transactions')
      ]);
      
      const allTransactions: Transaction[] = [];
      
      // Process member subcollection transactions
      if (memberSubResult.success && memberSubResult.data) {
        memberSubResult.data.forEach((doc: any) => {
          allTransactions.push({
            id: doc.id,
            memberId: doc.memberId || memberId,
            type: doc.type || 'Unknown',
            amount: doc.amount || 0,
            receiptNumber: doc.receiptNumber || '-',
            date: doc.date || doc.createdAt || new Date().toISOString(),
            status: doc.status || 'Completed',
            description: doc.description || '',
            createdAt: doc.createdAt || doc.date || new Date().toISOString()
          });
        });
      }
      
      // Process main transactions collection (filter by memberId)
      if (mainTransactionsResult.success && mainTransactionsResult.data) {
        mainTransactionsResult.data
          .filter((doc: any) => doc.memberId === memberId)
          .forEach((doc: any) => {
            // Avoid duplicates by checking if ID already exists
            if (!allTransactions.find(t => t.id === doc.id)) {
              allTransactions.push({
                id: doc.id,
                memberId: doc.memberId || memberId,
                type: doc.type || 'Unknown',
                amount: doc.amount || 0,
                receiptNumber: doc.receiptNumber || '-',
                date: doc.date || doc.createdAt || new Date().toISOString(),
                status: doc.status || 'Completed',
                description: doc.description || '',
                createdAt: doc.createdAt || doc.date || new Date().toISOString()
              });
            }
          });
      }
      
      // Sort by date descending (latest first)
      allTransactions.sort((a, b) => {
        const dateA = convertTimestampToDate(a.date)?.getTime() || 0;
        const dateB = convertTimestampToDate(b.date)?.getTime() || 0;
        return dateB - dateA;
      });
      
      setViewMemberTransactions(allTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setViewMemberTransactions([]);
    } finally {
      setLoadingViewTransactions(false);
    }
  };

  // Get paginated transactions for view modal
  const getPaginatedViewTransactions = () => {
    const startIndex = (viewTransactionPage - 1) * TRANSACTIONS_PER_PAGE;
    const endIndex = startIndex + TRANSACTIONS_PER_PAGE;
    return viewMemberTransactions.slice(startIndex, endIndex);
  };

  const totalViewTransactionPages = Math.ceil(viewMemberTransactions.length / TRANSACTIONS_PER_PAGE);

  const handleExport = () => {
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
    fetchMembers();
  };

  const handleMemberAdded = () => {
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

  const isMemberInactive = (member: Member) => {
    return member.status?.toLowerCase() === 'inactive' || member.status?.toLowerCase() === 'archived';
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
      {/* Header Section - Matching Admin Layout */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Member Records</h1>
          <p className="text-gray-600">View and manage member records</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => setIsAddMemberModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Member
          </button>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, ID, or email..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full md:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
          >
            <Download className="h-5 w-5 mr-2" />
            Export
          </button>
        </div>
      </div>
      
      {/* Status Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('active')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'active'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Active Members
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'archived'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Archived
          </button>
        </nav>
      </div>
      
      {/* Table Container */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
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
            <button
              onClick={fetchMembers}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-gray-100 mb-4">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No members found</h3>
            <p className="text-gray-500">
              {searchTerm ? 'No members found matching your search.' : `No ${activeTab} members found.`}
            </p>
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
                    {activeTab === 'archived' && (
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Archive Reason
                      </th>
                    )}
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {member.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {member.phoneNumber || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {member.email || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          member.archived || member.status === 'archived'
                            ? 'bg-red-100 text-red-800'
                            : member.status?.toLowerCase() === 'inactive'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {member.archived || member.status === 'archived' 
                            ? 'Archived' 
                            : (member.status || 'Active')}
                        </span>
                      </td>
                      {activeTab === 'archived' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {member.archiveReason || 'Manually archived'}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        {activeTab === 'active' ? (
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => handleViewMember(member)}
                              className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Member"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEditMember(member)}
                              className="p-2 text-yellow-600 hover:text-yellow-900 hover:bg-yellow-50 rounded-lg transition-colors"
                              title="Edit Member"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openArchiveConfirmation(member)}
                              disabled={member.status?.toLowerCase() !== 'inactive'}
                              className={`p-2 rounded-lg transition-colors ${
                                member.status?.toLowerCase() === 'inactive'
                                  ? 'text-red-600 hover:text-red-900 hover:bg-red-50'
                                  : 'text-gray-400 cursor-not-allowed'
                              }`}
                              title={member.status?.toLowerCase() === 'inactive' ? 'Archive Member' : 'Must be Inactive to archive'}
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => handleViewMember(member)}
                              className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Member"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openRestoreModal(member)}
                              className="px-3 py-1.5 text-sm text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg transition-colors flex items-center"
                              title="Restore Member"
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Restore
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6">
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                      <span className="font-medium">{Math.min(indexOfLastItem, filteredMembers.length)}</span> of{' '}
                      <span className="font-medium">{filteredMembers.length}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                      <button
                        onClick={prevPage}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <span className="sr-only">Previous</span>
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                        </svg>
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                        <button
                          key={pageNum}
                          onClick={() => paginate(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                            pageNum === currentPage 
                              ? 'z-10 bg-blue-600 text-white' 
                              : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      ))}
                      <button
                        onClick={nextPage}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <span className="sr-only">Next</span>
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
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

      {/* Archive Confirmation Modal */}
      {showArchiveConfirm && memberToArchive && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="bg-red-100 p-2 rounded-full mr-3">
                  <Archive className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">Archive Account?</h3>
              </div>
              
              <p className="text-gray-600 mb-4">
                Are you sure you want to archive <strong>{getFullName(memberToArchive)}</strong>?
                This will move the account to the Archived table.
              </p>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Archived accounts cannot access the system until restored by an admin.
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeArchiveConfirmation}
                  disabled={archivingMember}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleArchiveMember}
                  disabled={archivingMember}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center disabled:opacity-50"
                >
                  {archivingMember ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Archiving...
                    </>
                  ) : (
                    <>
                      <Archive className="h-4 w-4 mr-2" />
                      Yes, Archive
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal with Payment */}
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
                    Restoring this account requires a reactivation fee of ₱{REACTIVATION_FEE.toLocaleString('en-PH')}.00. Please confirm payment details before proceeding.
                  </p>
                </div>
                
                {/* Member Details */}
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <p className="text-sm text-gray-800 mb-2">
                    <span className="font-medium">Member:</span> {getFullName(memberToRestore)}
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
                    placeholder="Enter receipt number from hardcopy"
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

      {/* Restore Confirmation Modal */}
      {showRestoreConfirmModal && memberToRestore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800">Confirm Restoration</h3>
                <button 
                  onClick={() => setShowRestoreConfirmModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-6">
                {/* Warning Message */}
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4">
                  <p className="text-sm text-yellow-800">
                    <AlertCircle className="h-4 w-4 inline mr-1" />
                    Are you sure you want to restore this account? This action cannot be undone.
                  </p>
                </div>
                
                {/* Member Details */}
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <p className="text-sm text-gray-800 mb-2">
                    <span className="font-medium">Member:</span> {getFullName(memberToRestore)}
                  </p>
                  <p className="text-sm text-gray-800 mb-2">
                    <span className="font-medium">Reactivation Fee:</span> ₱{REACTIVATION_FEE.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-gray-800">
                    <span className="font-medium">Receipt No.:</span> {receiptNumber}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowRestoreConfirmModal(false)}
                  disabled={restoreLoading}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRestore}
                  disabled={restoreLoading}
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
                    'Yes, Restore Account'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Inactive Confirmation Modal */}
      {showMarkInactiveModal && memberToMarkInactive && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="bg-gray-100 p-2 rounded-full mr-3">
                  <AlertCircle className="h-6 w-6 text-gray-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">Mark as Inactive?</h3>
              </div>
              
              <p className="text-gray-600 mb-4">
                Are you sure you want to mark <strong>{getFullName(memberToMarkInactive)}</strong> as inactive?
              </p>
              
              {markingInactive ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-600"></div>
                  <span className="ml-3 text-gray-600">Checking transaction history...</span>
                </div>
              ) : inactiveCheckResult ? (
                <>
                  {inactiveCheckResult.canMark ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-yellow-800">
                        <strong>Eligibility Check:</strong> This account is eligible to be marked as inactive.
                      </p>
                      {inactiveCheckResult.lastTransactionDate ? (
                        <p className="text-sm text-yellow-700 mt-2">
                          Last transaction was on{' '}
                          <strong>{inactiveCheckResult.lastTransactionDate.toLocaleDateString('en-PH', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}</strong>{' '}
                          ({inactiveCheckResult.monthsSinceLastTransaction} months ago).
                        </p>
                      ) : (
                        <p className="text-sm text-yellow-700 mt-2">
                          No transactions found for this account.
                        </p>
                      )}
                      <p className="text-sm text-yellow-700 mt-2">
                        Accounts with no transactions for 6+ months can be marked as inactive.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-red-800">
                        <strong>Not Eligible:</strong> This account cannot be marked as inactive.
                      </p>
                      {inactiveCheckResult.lastTransactionDate ? (
                        <p className="text-sm text-red-700 mt-2">
                          Last transaction was on{' '}
                          <strong>{inactiveCheckResult.lastTransactionDate.toLocaleDateString('en-PH', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}</strong>{' '}
                          ({inactiveCheckResult.monthsSinceLastTransaction} months ago).
                        </p>
                      ) : (
                        <p className="text-sm text-red-700 mt-2">
                          This is a new account with no transaction history. New accounts cannot be marked as inactive.
                        </p>
                      )}
                      <p className="text-sm text-red-700 mt-2">
                        Only accounts with existing transactions that are 6+ months old can be marked as inactive.
                      </p>
                    </div>
                  )}
                </>
              ) : null}
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeMarkInactiveModal}
                  disabled={markingInactive}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmMarkAsInactive}
                  disabled={markingInactive || !inactiveCheckResult?.canMark}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {markingInactive ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Yes, Mark as Inactive
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Member Modal with Transaction History */}
      {viewingMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">Member Details</h3>
                  <p className="text-sm text-gray-600 mt-1">Complete information and transaction history</p>
                </div>
                <button 
                  onClick={closeViewModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Member Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Full Name</p>
                  <p className="font-medium text-gray-900">{getFullName(viewingMember)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Member ID</p>
                  <p className="font-medium text-gray-900">{viewingMember.id}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Contact Number</p>
                  <p className="font-medium text-gray-900">{viewingMember.phoneNumber || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Address</p>
                  <p className="font-medium text-gray-900">
                    {viewingMember.driverInfo ? 
                      `${viewingMember.driverInfo.barangay || ''}, ${viewingMember.driverInfo.city || ''}` :
                      viewingMember.operatorInfo ?
                      `${viewingMember.operatorInfo.barangay || ''}, ${viewingMember.operatorInfo.city || ''}` :
                      'N/A'
                    }
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Date Registered</p>
                  <p className="font-medium text-gray-900">
                    {viewingMember.createdAt ? 
                      (() => {
                        const date = convertTimestampToDate(viewingMember.createdAt);
                        return date ? date.toLocaleDateString('en-PH', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        }) : 'N/A';
                      })() 
                      : 'N/A'
                    }
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</p>
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    viewingMember.archived || viewingMember.status === 'archived'
                      ? 'bg-red-100 text-red-800'
                      : viewingMember.status?.toLowerCase() === 'inactive'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {viewingMember.archived || viewingMember.status === 'archived' 
                      ? 'Archived' 
                      : (viewingMember.status || 'Active')}
                  </span>
                </div>
              </div>
              
              {/* Auto-Archive Test Date Section - For Testing Only */}
              {viewingMember.status?.toLowerCase() !== 'archived' && (
                <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 mr-2" />
                    <h4 className="text-md font-semibold text-blue-800">Auto-Archive Test Configuration</h4>
                  </div>
                  
                  {/* Current Test Date Display */}
                  {viewingMember.autoArchiveTestDate && (
                    <div className="bg-white rounded-lg p-3 mb-4 border border-blue-200">
                      <p className="text-sm text-gray-600">Current Test Date:</p>
                      <p className="text-lg font-semibold text-blue-700">
                        {convertTimestampToDate(viewingMember.autoArchiveTestDate)?.toLocaleDateString('en-PH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                  
                  {/* Test Date Input */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-blue-800 mb-1">
                        Set Test Date
                      </label>
                      <input
                        type="datetime-local"
                        value={testDateInput}
                        onChange={(e) => setTestDateInput(e.target.value)}
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="flex gap-2 items-end">
                      <button
                        onClick={handleSaveTestDate}
                        disabled={!testDateInput || savingTestDate}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        {savingTestDate ? (
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          'Save Test Date'
                        )}
                      </button>
                      {viewingMember.autoArchiveTestDate && (
                        <button
                          onClick={handleClearTestDate}
                          disabled={savingTestDate}
                          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  
                  
                  
                </div>
              )}

              {/* Membership Certificate Section */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-md font-semibold text-gray-800 flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Membership Certificate
                  </h4>
                  <button
                    onClick={() => setShowViewCertificate(!showViewCertificate)}
                    disabled={!viewingMember.certificateGenerated}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      viewingMember.certificateGenerated
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {showViewCertificate ? 'Hide Certificate' : 'View Certificate'}
                  </button>
                </div>
                
                {showViewCertificate && viewingMember.certificateGenerated && (
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <iframe
                      src={`/api/certificate/${encodeURIComponent(viewingMember.id)}`}
                      width="100%"
                      height="400px"
                      title="Membership Certificate"
                      className="border border-gray-300 rounded mb-4"
                    ></iframe>
                    <div className="flex justify-center space-x-3">
                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = `/api/certificate/${encodeURIComponent(viewingMember.id)}`;
                          link.download = `membership-certificate-${viewingMember.id}.pdf`;
                          link.click();
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        Download Certificate
                      </button>
                      <button
                        onClick={() => {
                          const win = window.open(`/api/certificate/${encodeURIComponent(viewingMember.id)}`, '_blank');
                          if (win) win.focus();
                        }}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                      >
                        Open in New Tab
                      </button>
                    </div>
                  </div>
                )}
                
                {!viewingMember.certificateGenerated && (
                  <div className="bg-gray-100 p-4 rounded-lg text-center text-gray-500">
                    No certificate generated for this member.
                  </div>
                )}
              </div>
              
              {/* Transaction History Section */}
              <div>
                <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
                  <History className="h-4 w-4 mr-2" />
                  Transaction History
                  <span className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full">
                    {viewMemberTransactions.length}
                  </span>
                </h4>
                
                {loadingViewTransactions ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
                  </div>
                ) : viewMemberTransactions.length === 0 ? (
                  <div className="bg-gray-50 p-6 rounded-lg text-center text-gray-500">
                    No transactions found for this member.
                  </div>
                ) : (
                  <>
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Type
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Description
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Amount
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Receipt No.
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {getPaginatedViewTransactions().map((transaction) => (
                            <tr key={transaction.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {(() => {
                                  const date = convertTimestampToDate(transaction.date);
                                  return date ? (
                                    <div>
                                      <div className="font-medium">
                                        {date.toLocaleDateString('en-PH', {
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric'
                                        })}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {date.toLocaleTimeString('en-PH', {
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </div>
                                    </div>
                                  ) : 'N/A';
                                })()}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  transaction.type === 'Reactivation Fee'
                                    ? 'bg-orange-100 text-orange-800'
                                    : transaction.type === 'Savings'
                                    ? 'bg-green-100 text-green-800'
                                    : transaction.type === 'Loan Payment'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {transaction.type}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                {transaction.description || '-'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                ₱{transaction.amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                {transaction.receiptNumber || '-'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  transaction.status === 'Completed'
                                    ? 'bg-green-100 text-green-800'
                                    : transaction.status === 'Pending'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {transaction.status || 'Completed'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Transaction Pagination */}
                    {totalViewTransactionPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-gray-600">
                          Showing {((viewTransactionPage - 1) * TRANSACTIONS_PER_PAGE) + 1} to{' '}
                          {Math.min(viewTransactionPage * TRANSACTIONS_PER_PAGE, viewMemberTransactions.length)} of{' '}
                          {viewMemberTransactions.length} transactions
                        </p>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setViewTransactionPage(prev => Math.max(prev - 1, 1))}
                            disabled={viewTransactionPage === 1}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                          >
                            Previous
                          </button>
                          <span className="px-3 py-1.5 text-sm text-gray-700">
                            Page {viewTransactionPage} of {totalViewTransactionPages}
                          </span>
                          <button
                            onClick={() => setViewTransactionPage(prev => Math.min(prev + 1, totalViewTransactionPages))}
                            disabled={viewTransactionPage === totalViewTransactionPages}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                {/* Mark as Inactive Button - Only show for active members */}
                {viewingMember.status?.toLowerCase() !== 'inactive' && 
                 viewingMember.status?.toLowerCase() !== 'archived' && (
                  <button
                    onClick={() => {
                      closeViewModal();
                      checkAndOpenMarkInactiveModal(viewingMember);
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center"
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Mark as Inactive
                  </button>
                )}
                <div className="flex-1"></div>
                <button
                  onClick={closeViewModal}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
