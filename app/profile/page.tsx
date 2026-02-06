'use client';

import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/shared/Card';
import { ProfileActions } from '@/components';
import ProfilePhotoUpload from '@/components/user/ProfilePhotoUpload';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [memberData, setMemberData] = useState<any>(null);
  const [loadingMember, setLoadingMember] = useState(true);


  // Remove the redirect effect - middleware handles authentication
  // useEffect(() => {
  //   if (!loading && !user) {
  //     router.push('/login');
  //   }
  // }, [user, loading, router]);

  useEffect(() => {
    if (user && user.uid) {
      fetchMemberData();
    }
  }, [user]);

  const fetchMemberData = async () => {
    try {
      setLoadingMember(true);
      
      // First try to fetch from 'members' collection
      let result = await firestore.getDocument('members', user?.uid || '');
      
      if (result.success && result.data) {
        // Process member data from members collection
        setMemberData(result.data);
      } else {
        // If not found in members, try users collection
        console.log('Member not found in members collection, trying users collection');
        const userResult = await firestore.getDocument('users', user?.uid || '');
        
        if (userResult.success && userResult.data) {
          // Process user data to match member structure
          const userData = userResult.data;
          
          // Extract name parts from fullName if available
          let firstName = userData.firstName || '';
          let lastName = userData.lastName || '';
          let middleName = userData.middleName || '';
          let suffix = userData.suffix || '';
          
          if (!firstName && !lastName && userData.fullName) {
            const nameParts = userData.fullName.split(' ');
            if (nameParts.length >= 2) {
              firstName = nameParts[0];
              lastName = nameParts[nameParts.length - 1];
              if (nameParts.length > 2) {
                middleName = nameParts.slice(1, nameParts.length - 1).join(' ');
              }
            }
          }
          
          setMemberData({
            id: user?.uid,
            firstName,
            lastName,
            middleName,
            suffix,
            email: userData.email || user?.email,
            phoneNumber: userData.contactNumber || userData.phoneNumber || '',
            birthdate: userData.birthdate || '',
            age: userData.age || 0,
            role: userData.role || user?.role,
            status: userData.status || 'Active',
            createdAt: userData.createdAt || '',
            archived: userData.archived || false,
            driverInfo: userData.driverInfo || null,
            operatorInfo: userData.operatorInfo || null,
            ...userData
          });
        } else {
          toast.error('Member data not found');
          console.error('Member not found in both members and users collections');
        }
      }
      
      // Fetch savings data
      if (user?.uid) {
        await fetchSavingsData(user.uid);
      }
    } catch (error) {
      console.error('Error fetching member data:', error);
      toast.error('Failed to load member data');
    } finally {
      setLoadingMember(false);
    }
  };

  const fetchSavingsData = async (userId: string) => {
    try {
      // Fetch savings transactions from /members/{userId}/savings collection
      const result = await firestore.getCollection(`members/${userId}/savings`);
      
      if (result.success && result.data) {
        // Calculate running balance for each transaction
        let runningBalance = 0;
        const sortedTransactions = result.data
          .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
          
        sortedTransactions.forEach((transaction: any) => {
          if (transaction.type === 'deposit') {
            runningBalance += transaction.amount;
          } else if (transaction.type === 'withdrawal') {
            runningBalance -= transaction.amount;
          }
        });
        

      }
    } catch (error) {
      console.error('Error fetching savings data:', error);
    }
  };

  if (loading || loadingMember) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const getFullName = () => {
    if (!memberData) return user?.email || 'Unknown User';
    
    const firstName = memberData.firstName || '';
    const middleName = memberData.middleName || '';
    const lastName = memberData.lastName || '';
    const suffix = memberData.suffix || '';
    
    return `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}${suffix ? ' ' + suffix : ''}`.trim();
  };

  const getAddress = () => {
    if (!memberData) return 'Address not available';
    
    // Check if it's a driver or operator with specific address info
    if (memberData.role?.toLowerCase() === 'driver' && memberData.driverInfo) {
      const { houseNumber, blockNumber, lotNumber, street, barangay, city } = memberData.driverInfo;
      return `${houseNumber || ''} ${street || ''}, ${barangay || ''}, ${city || ''}`.trim();
    } else if (memberData.role?.toLowerCase() === 'operator' && memberData.operatorInfo) {
      const { houseNumber, blockNumber, lotNumber, street, barangay, city } = memberData.operatorInfo;
      return `${houseNumber || ''} ${street || ''}, ${barangay || ''}, ${city || ''}`.trim();
    }
    
    // If it's a general member, check if address info exists in member data
    if (memberData.houseNumber || memberData.street || memberData.barangay || memberData.city) {
      return `${memberData.houseNumber || ''} ${memberData.street || ''}, ${memberData.barangay || ''}, ${memberData.city || ''}`.trim();
    }
    
    return 'Address not available';
  };

  const getLicenseInfo = () => {
    if (!memberData) return null;
    
    if (memberData.role?.toLowerCase() === 'driver' && memberData.driverInfo) {
      return {
        licenseNumber: memberData.driverInfo.licenseNumber,
        tinId: memberData.driverInfo.tinId
      };
    } else if (memberData.role?.toLowerCase() === 'operator' && memberData.operatorInfo) {
      return {
        licenseNumber: memberData.operatorInfo.licenseNumber,
        tinId: memberData.operatorInfo.tinId
      };
    }
    
    return null;
  };

  const getMemberSince = () => {
    if (!memberData) return 'Unknown';
    
    const dateStr = memberData.createdAt;
    if (!dateStr) return 'Unknown';
    
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return 'Unknown';
    }
  };



  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">My Profile</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-1">
          <Card title="Profile Picture" className="text-center">
            <ProfilePhotoUpload />
          </Card>
        </div>
        
        <div className="lg:col-span-2">
          <Card title="Personal Information">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Full Name</label>
                  <p className="font-medium">{getFullName()}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Email Address</label>
                  <p className="font-medium">{memberData?.email || user?.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Role</label>
                  <p className="font-medium">
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                      {memberData?.role || user?.role || 'Member'}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Phone Number</label>
                  <p className="font-medium">{memberData?.phoneNumber || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Member Since</label>
                  <p className="font-medium">{getMemberSince()}</p>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500">Address</label>
                <p className="font-medium">{getAddress()}</p>
              </div>
              
              {/* Additional Information for Driver/Operator */}
              {getLicenseInfo() && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
                  <div>
                    <label className="text-sm text-gray-500">License Number</label>
                    <p className="font-medium">{getLicenseInfo()?.licenseNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">TIN ID</label>
                    <p className="font-medium">{getLicenseInfo()?.tinId || 'N/A'}</p>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end pt-4">
                <button 
                  onClick={() => router.push('/profile/edit')}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>
      

      
      {/* Account Settings using the new ProfileActions component */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Account Settings</h2>
        <ProfileActions />
      </div>
      

    </div>
  );
}

// Simple SVG Icon Component
const UserIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);