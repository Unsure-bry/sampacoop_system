'use client';

import { useState, useEffect } from 'react';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import MemberDetailsModal from '@/components/admin/MemberDetailsModal';
import MemberEditModal from '@/components/admin/MemberEditModal';
import { Member } from '@/lib/types/member';

export default function MemberRecordsPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [viewingMember, setViewingMember] = useState<Member | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    filterMembers();
  }, [searchTerm, members, activeTab]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const result = await firestore.getCollection('members');
      
      if (result.success && result.data) {
        const membersData = result.data.map((doc: any) => ({
          id: doc.id,
          ...doc
        }));
        setMembers(membersData);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const filterMembers = () => {
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
    const filtered = statusFiltered.filter(member => 
      member.firstName.toLowerCase().includes(term) ||
      member.lastName.toLowerCase().includes(term) ||
      member.email.toLowerCase().includes(term) ||
      member.id.toLowerCase().includes(term) ||
      (member.middleName && member.middleName.toLowerCase().includes(term)) ||
      (member.suffix && member.suffix.toLowerCase().includes(term))
    );
    
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

  const getFullName = (member: Member) => {
    return `${member.firstName} ${member.middleName ? member.middleName + ' ' : ''}${member.lastName}${member.suffix ? ' ' + member.suffix : ''}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Member Records</h1>
          <p className="text-gray-600">View and manage member records</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
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
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">
              {searchTerm ? 'No members found matching your search.' : `No ${activeTab} members found.`}
            </p>
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
    </div>
  );
}