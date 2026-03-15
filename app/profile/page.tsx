'use client';

import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProfileActions } from '@/components';
import ProfilePhotoUpload from '@/components/user/ProfilePhotoUpload';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { User, Mail, Phone, MapPin, Calendar, CreditCard, FileText, Edit3, Shield, Bell } from 'lucide-react';

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
    <div className="max-w-3xl mx-auto px-4 py-4 sm:py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">My Profile</h1>
        <button 
          onClick={() => router.push('/profile/edit')}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium w-full sm:w-auto"
        >
          <Edit3 className="h-4 w-4" />
          Edit Profile
        </button>
      </div>
      
      {/* Profile Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        {/* Profile Header with Photo */}
        <div className="bg-gradient-to-r from-red-50 to-white p-6 flex items-center gap-4">
          <div className="shrink-0">
            <ProfilePhotoUpload />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-800 truncate">{getFullName()}</h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 mt-1">
              {memberData?.role || user?.role || 'Member'}
            </span>
          </div>
        </div>
        
        {/* Profile Information */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-gray-50 rounded-lg shrink-0">
                <Mail className="h-4 w-4 text-gray-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
                <p className="text-sm font-medium text-gray-800 truncate">{memberData?.email || user?.email || 'N/A'}</p>
              </div>
            </div>
            
            {/* Phone */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-gray-50 rounded-lg shrink-0">
                <Phone className="h-4 w-4 text-gray-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Phone</p>
                <p className="text-sm font-medium text-gray-800">{memberData?.phoneNumber || 'Not provided'}</p>
              </div>
            </div>
            
            {/* Member Since */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-gray-50 rounded-lg shrink-0">
                <Calendar className="h-4 w-4 text-gray-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Member Since</p>
                <p className="text-sm font-medium text-gray-800">{getMemberSince()}</p>
              </div>
            </div>
            
            {/* Address */}
            <div className="flex items-start gap-3 md:col-span-2">
              <div className="p-2 bg-gray-50 rounded-lg shrink-0">
                <MapPin className="h-4 w-4 text-gray-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Address</p>
                <p className="text-sm font-medium text-gray-800">{getAddress()}</p>
              </div>
            </div>
          </div>
          
          {/* License Info for Driver/Operator */}
          {getLicenseInfo() && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500" />
                Additional Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gray-50 rounded-lg shrink-0">
                    <CreditCard className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">License Number</p>
                    <p className="text-sm font-medium text-gray-800">{getLicenseInfo()?.licenseNumber || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gray-50 rounded-lg shrink-0">
                    <FileText className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">TIN ID</p>
                    <p className="text-sm font-medium text-gray-800">{getLicenseInfo()?.tinId || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Account Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Shield className="h-5 w-5 text-gray-500" />
            Account Settings
          </h2>
        </div>
        <div className="p-4">
          <ProfileActions />
        </div>
      </div>
    </div>
  );
}