'use client';

import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/admin';
import { Member } from '@/lib/types/member';
import { MemberSavings } from '@/lib/types/savings';
import { firestore } from '@/lib/firebase';
import { getSavingsBalanceForMember } from '@/lib/savingsService';

export default function ChairmanSavingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<MemberSavings[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/admin/login');
    } else if (user && user.role?.toLowerCase() !== 'chairman') {
      router.push('/admin/unauthorized');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!loading && user && user.role?.toLowerCase() === 'chairman') {
      fetchMembers();
    }
  }, [loading, user]);

  useEffect(() => {
    filterMembers();
  }, [searchTerm, members]);

  const fetchMembers = async () => {
    try {
      setLoadingData(true);
      
      // Fetch members from the members collection
      let result = await firestore.getCollection('members');
      
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
    } finally {
      setLoadingData(false);
    }
  };

  // Function to fetch total savings for a specific member
  const fetchMemberTotalSavings = async (memberId: string) => {
    try {
      // Use the savings service to get the total balance for the member
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
        return {
          memberId: member.id,
          memberName: `${member.firstName || ''} ${member.middleName ? member.middleName + ' ' : ''}${member.lastName || ''}${member.suffix ? ' ' + member.suffix : ''}`.trim(),
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
    
    if (!searchTerm) {
      // Fetch all members with their savings data
      membersWithSavings = await fetchAllMembersSavings();
    } else {
      // Filter members first
      const term = searchTerm.toLowerCase();
      const filtered = members.filter(member => {
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
      
      // Fetch savings data for filtered members
      membersWithSavings = await Promise.all(
        filtered.map(async (member) => {
          const totalSavings = await fetchMemberTotalSavings(member.id);
          return {
            memberId: member.id,
            memberName: `${member.firstName || ''} ${member.middleName ? member.middleName + ' ' : ''}${member.lastName || ''}${member.suffix ? ' ' + member.suffix : ''}`.trim(),
            totalSavings,
            status: member.status || 'Active',
            lastUpdated: member.createdAt || new Date().toISOString()
          };
        })
      );
    }
    
    setFilteredMembers(membersWithSavings);
  };

  const handleViewSavings = (memberId: string) => {
    router.push(`/admin/savings/member/${memberId}`);
  };

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Savings Records</h1>
        <button 
          onClick={() => router.push('/admin/chairman/home')}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Back
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-800">All Savings</h3>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Member
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMembers.map((member) => (
                    <tr key={member.memberId}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{member.memberName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">₱{member.totalSavings.toFixed(2)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">Savings</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {member.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button 
                          onClick={() => handleViewSavings(member.memberId)}
                          className="text-red-600 hover:text-red-900 mr-3"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleViewSavings(member.memberId)}
                          className="text-red-600 hover:text-red-900"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}