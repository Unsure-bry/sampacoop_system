'use client';

import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/admin';
import MemberRegistrationModal from '@/components/admin/MemberRegistrationModal';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';

export default function BODMembersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<any[]>([]);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/admin/login');
    } else if (user && user.role?.toLowerCase() !== 'board of directors') {
      router.push('/admin/unauthorized');
    }
  }, [user, loading, router]);

  // Fetch members from Firestore
  useEffect(() => {
    const fetchMembers = async () => {
      try {
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
            
            setMembers(membersData);
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
        }
      } catch (error) {
        console.error('Error fetching members:', error);
        toast.error('Failed to load members');
      }
    };

    fetchMembers();
  }, []);

  const handleMemberAdded = () => {
    // Refresh the member list after adding a new member
    const fetchMembers = async () => {
      try {
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
            
            setMembers(membersData);
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
        }
      } catch (error) {
        console.error('Error fetching members:', error);
        toast.error('Failed to load members');
      }
    };

    fetchMembers();
    toast.success('Member registered successfully!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Member Records</h1>
        <button 
          onClick={() => setIsAddMemberModalOpen(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Add Member
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map((member) => (
          <Card key={member.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {member.firstName} {member.lastName}
                </h3>
                <p className="text-gray-600">{member.role}</p>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${
                member.archived ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'
              }`}>
                {member.archived ? 'Archived' : 'Active'}
              </span>
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Email:</span> {member.email || 'N/A'}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Phone:</span> {member.phoneNumber || 'N/A'}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Joined:</span> {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </Card>
        ))}
      </div>

      <MemberRegistrationModal 
        isOpen={isAddMemberModalOpen} 
        onClose={() => setIsAddMemberModalOpen(false)} 
        onMemberAdded={handleMemberAdded} 
      />
    </div>
  );
}