'use client';

import { useState, useEffect } from 'react';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import MemberDetailsModal from '@/components/admin/MemberDetailsModal';
import MemberEditModal from '@/components/admin/MemberEditModal';
import MemberRegistrationModal from '@/components/admin/MemberRegistrationModal';
import { Member } from '@/lib/types/member';

export default function MemberRecordsPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [viewingMember, setViewingMember] = useState<Member | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);

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
              driverInfo: doc.driverInfo || null,
              operatorInfo: doc.operatorInfo || null,
              ...doc
            }));
          
          setMembers(memberData);
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
        
        setMembers(membersData);
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

  const handleRestoreMember = async (memberId: string) => {
    try {
      const result = await firestore.updateDocument('members', memberId, {
        archived: false,
        restoredAt: new Date().toISOString()
      });
      
      if (result.success) {
        // Update local state
        setMembers(prevMembers => 
          prevMembers.map(member => 
            member.id === memberId ? { ...member, archived: false } : member
          )
        );
        toast.success('Member restored successfully');
      } else {
        toast.error('Failed to restore member');
      }
    } catch (error) {
      console.error('Error restoring member:', error);
      toast.error('An error occurred while restoring member');
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Member Records</h1>
          <p className="text-gray-600">View and manage member records</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => setIsAddMemberModalOpen(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Member
          </button>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, ID, or email..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 w-full md:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
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
          </div>
        ) : (
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
                {filteredMembers.map((member) => (
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
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        member.archived 
                          ? 'bg-gray-100 text-gray-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {member.archived ? 'Archived' : (member.status || 'Active')}
                      </span>
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
                          <button
                            onClick={() => handleEditMember(member)}
                            className="text-yellow-600 hover:text-yellow-900 mr-3"
                            
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleArchiveMember(member.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Archive
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleViewMember(member)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleRestoreMember(member.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Restore
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Member Details Modal */}
      <MemberDetailsModal 
        member={viewingMember} 
        isOpen={!!viewingMember} 
        onClose={() => setViewingMember(null)} 
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
    </div>
  );
}