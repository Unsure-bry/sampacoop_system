'use client';

import { useAuth } from '@/lib/auth';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { Eye, ChevronLeft, ChevronRight, Search, X, DollarSign, FileText, User } from 'lucide-react';

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  phoneNumber: string;
  status: string;
  createdAt: string;
  role: string;
}

interface MemberDetails {
  member: Member;
  totalSavings: number;
  activeLoans: number;
  totalLoanAmount: number;
}

type MemberStatus = 'all' | 'active' | 'pending' | 'rejected';
type SortOption = 'newest' | 'oldest' | 'alphabetical';

const ITEMS_PER_PAGE = 10;

export default function BODMembersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [activeTab, setActiveTab] = useState<MemberStatus>('all');
  const [loading, setLoading] = useState(true);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [selectedMember, setSelectedMember] = useState<MemberDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Pagination states for each tab
  const [pagination, setPagination] = useState({
    all: { currentPage: 1, totalPages: 1 },
    active: { currentPage: 1, totalPages: 1 },
    pending: { currentPage: 1, totalPages: 1 },
    rejected: { currentPage: 1, totalPages: 1 }
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/admin/login');
    } else if (user && user.role?.toLowerCase() !== 'board of directors') {
      router.push('/admin/unauthorized');
    }
  }, [user, authLoading, router]);

  // Fetch members from Firestore
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoading(true);
        const result = await firestore.getCollection('members');
        
        if (result.success && result.data) {
          const processedMembers = result.data.map((doc: any) => ({
            id: doc.id,
            firstName: doc.firstName || doc.fullName?.split(' ')[0] || 'Unknown',
            lastName: doc.lastName || doc.fullName?.split(' ').slice(-1)[0] || 'User',
            middleName: doc.middleName || '',
            email: doc.email || '',
            phoneNumber: doc.contactNumber || doc.phoneNumber || '',
            status: (doc.status || 'pending').toLowerCase(),
            createdAt: doc.createdAt || new Date().toISOString(),
            role: doc.role || 'Member'
          }));

          setAllMembers(processedMembers);
          
          // Calculate total pages for each status
          const counts = {
            all: processedMembers.length,
            active: processedMembers.filter((m: Member) => m.status === 'active').length,
            pending: processedMembers.filter((m: Member) => m.status === 'pending').length,
            rejected: processedMembers.filter((m: Member) => m.status === 'rejected').length
          };

          setPagination({
            all: { currentPage: 1, totalPages: Math.ceil(counts.all / ITEMS_PER_PAGE) || 1 },
            active: { currentPage: 1, totalPages: Math.ceil(counts.active / ITEMS_PER_PAGE) || 1 },
            pending: { currentPage: 1, totalPages: Math.ceil(counts.pending / ITEMS_PER_PAGE) || 1 },
            rejected: { currentPage: 1, totalPages: Math.ceil(counts.rejected / ITEMS_PER_PAGE) || 1 }
          });
        }
      } catch (error) {
        console.error('Error fetching members:', error);
        toast.error('Failed to load members');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchMembers();
    }
  }, [user]);

  const getFilteredMembers = (status: MemberStatus) => {
    let filtered = status === 'all' ? allMembers : allMembers.filter(member => member.status === status);
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(member => 
        `${member.firstName} ${member.lastName}`.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query) ||
        member.phoneNumber.toLowerCase().includes(query) ||
        member.id.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'alphabetical':
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        default:
          return 0;
      }
    });
    
    return filtered;
  };

  const getPaginatedMembers = (status: MemberStatus) => {
    const filtered = getFilteredMembers(status);
    const startIndex = (pagination[status].currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  };

  const handlePageChange = (status: MemberStatus, direction: 'prev' | 'next') => {
    setPagination(prev => ({
      ...prev,
      [status]: {
        ...prev[status],
        currentPage: direction === 'prev' 
          ? Math.max(1, prev[status].currentPage - 1)
          : Math.min(prev[status].totalPages, prev[status].currentPage + 1)
      }
    }));
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const fetchMemberDetails = async (member: Member) => {
    try {
      // Fetch savings
      let totalSavings = 0;
      try {
        const savingsResult = await firestore.getCollection(`members/${member.id}/savings`);
        if (savingsResult.success && savingsResult.data) {
          totalSavings = savingsResult.data.reduce((total: number, transaction: any) => {
            const amount = Number(transaction.amount) || 0;
            if (transaction.type === 'deposit') {
              return total + amount;
            } else if (transaction.type === 'withdrawal') {
              return total - amount;
            }
            return total;
          }, 0);
        }
      } catch (error) {
        console.warn('Error fetching savings:', error);
      }

      // Fetch loans
      let activeLoans = 0;
      let totalLoanAmount = 0;
      try {
        const loansResult = await firestore.getCollection('loans');
        if (loansResult.success && loansResult.data) {
          const memberLoans = loansResult.data.filter((loan: any) => 
            loan.userId === member.id || loan.memberId === member.id
          );
          activeLoans = memberLoans.filter((loan: any) => loan.status === 'active').length;
          totalLoanAmount = memberLoans.reduce((sum: number, loan: any) => 
            sum + (Number(loan.amount) || 0), 0
          );
        }
      } catch (error) {
        console.warn('Error fetching loans:', error);
      }

      setSelectedMember({
        member,
        totalSavings,
        activeLoans,
        totalLoanAmount
      });
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error fetching member details:', error);
      toast.error('Failed to load member details');
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedMember(null);
  };

  const renderTable = (status: MemberStatus) => {
    const members = getPaginatedMembers(status);
    const currentPagination = pagination[status];

    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Full Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {members.length > 0 ? (
                members.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {member.firstName} {member.middleName} {member.lastName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{member.email || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{member.phoneNumber || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 capitalize">{member.role}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(member.status)}`}>
                        {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button 
                        onClick={() => fetchMemberDetails(member)}
                        className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        title="View Member"
                      >
                        <Eye className="h-4 w-4 mr-1.5" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {members.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {((currentPagination.currentPage - 1) * ITEMS_PER_PAGE) + 1} to{' '}
              {Math.min(currentPagination.currentPage * ITEMS_PER_PAGE, getFilteredMembers(status).length)} of{' '}
              {getFilteredMembers(status).length} results
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(status, 'prev')}
                disabled={currentPagination.currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPagination.currentPage} of {currentPagination.totalPages}
              </span>
              <button
                onClick={() => handlePageChange(status, 'next')}
                disabled={currentPagination.currentPage === currentPagination.totalPages}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const tabs: { key: MemberStatus; label: string; count: number }[] = [
    { key: 'all', label: 'All Members', count: allMembers.length },
    { key: 'active', label: 'Approved', count: allMembers.filter(m => m.status === 'active').length },
    { key: 'pending', label: 'Pending', count: allMembers.filter(m => m.status === 'pending').length },
    { key: 'rejected', label: 'Rejected', count: allMembers.filter(m => m.status === 'rejected').length }
  ];

  return (
    <div className="space-y-6">
      {/* Header Section - Matching Secretary Layout */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Member Records</h1>
          <p className="text-gray-600">View member records</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, ID, or email..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full md:w-64"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPagination(prev => ({
                  ...prev,
                  [activeTab]: { ...prev[activeTab], currentPage: 1 }
                }));
              }}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Sort Dropdown */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="alphabetical">Alphabetical</option>
          </select>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                activeTab === tab.key ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Table */}
      <div className="mt-6">
        {renderTable(activeTab)}
      </div>

      {/* Member Details Modal */}
      {isModalOpen && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Member Details</h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Member Info */}
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <User className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedMember.member.firstName} {selectedMember.member.middleName} {selectedMember.member.lastName}
                  </h3>
                  <p className="text-sm text-gray-600 capitalize">{selectedMember.member.role}</p>
                  <span className={`inline-block mt-2 px-3 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(selectedMember.member.status)}`}>
                    {selectedMember.member.status.charAt(0).toUpperCase() + selectedMember.member.status.slice(1)}
                  </span>
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-900">{selectedMember.member.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="text-sm font-medium text-gray-900">{selectedMember.member.phoneNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Member ID</p>
                  <p className="text-sm font-medium text-gray-900">{selectedMember.member.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Registration Date</p>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedMember.member.createdAt 
                      ? new Date(selectedMember.member.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <p className="text-sm text-gray-600">Total Savings</p>
                  </div>
                  <p className="text-xl font-bold text-gray-900">
                    ₱{selectedMember.totalSavings.toLocaleString()}
                  </p>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <p className="text-sm text-gray-600">Active Loans</p>
                  </div>
                  <p className="text-xl font-bold text-gray-900">
                    {selectedMember.activeLoans}
                  </p>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <DollarSign className="h-5 w-5 text-purple-600" />
                    <p className="text-sm text-gray-600">Total Loan Amount</p>
                  </div>
                  <p className="text-xl font-bold text-gray-900">
                    ₱{selectedMember.totalLoanAmount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}