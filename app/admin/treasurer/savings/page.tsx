'use client';

import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/admin';
import { DollarSign, Users, PiggyBank } from 'lucide-react';
import { Member } from '@/lib/types/member';
import { MemberSavings } from '@/lib/types/savings';
import { firestore } from '@/lib/firebase';
import { getSavingsBalanceForMember } from '@/lib/savingsService';

export default function TreasurerSavingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<MemberSavings[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/admin/login');
    } else if (user && user.role?.toLowerCase() !== 'treasurer') {
      router.push('/admin/unauthorized');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!loading && user && user.role?.toLowerCase() === 'treasurer') {
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
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Savings Records</h1>
          <p className="text-gray-600">View and manage member savings</p>
        </div>
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Search members..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredMembers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">
              {searchTerm ? 'No members found matching your search.' : 'No members found.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Member Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Savings
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
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
                {filteredMembers.map((member) => (
                  <tr key={member.memberId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {member.memberName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ₱{member.totalSavings.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        member.status === 'Active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {member.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(member.lastUpdated).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewSavings(member.memberId)}
                        className="text-red-600 hover:text-red-900"
                      >
                        View Savings
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}