'use client';

import { useAuth } from '@/lib/auth';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/shared/Card';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';

export default function EditProfilePage() {
  const { user, loading, updateProfile } = useAuth();
  const router = useRouter();
  const [memberData, setMemberData] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    suffix: '',
    email: '',
    phoneNumber: '',
    birthdate: '',
    licenseNumber: '',
    tinId: '',
    houseNumber: '',
    blockNumber: '',
    lotNumber: '',
    street: '',
    barangay: '',
    city: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && user.uid) {
      fetchMemberData();
    }
  }, [user]);

  const fetchMemberData = async () => {
    try {
      setLoadingData(true);
      
      // First try to fetch from 'members' collection
      let result = await firestore.getDocument('members', user?.uid || '');
      
      if (result.success && result.data) {
        const data = result.data;
        setMemberData(data);
        
        // Extract name parts
        const firstName = data.firstName || '';
        const lastName = data.lastName || '';
        const middleName = data.middleName || '';
        const suffix = data.suffix || '';
        
        // Initialize form data
        setFormData({
          firstName,
          lastName,
          middleName,
          suffix,
          email: data.email || user?.email || '',
          phoneNumber: data.phoneNumber || '',
          birthdate: data.birthdate || '',
          licenseNumber: data.role?.toLowerCase() === 'driver' && data.driverInfo 
            ? data.driverInfo.licenseNumber || '' 
            : data.role?.toLowerCase() === 'operator' && data.operatorInfo 
              ? data.operatorInfo.licenseNumber || '' 
              : '',
          tinId: data.role?.toLowerCase() === 'driver' && data.driverInfo 
            ? data.driverInfo.tinId || '' 
            : data.role?.toLowerCase() === 'operator' && data.operatorInfo 
              ? data.operatorInfo.tinId || '' 
              : '',
          houseNumber: data.role?.toLowerCase() === 'driver' && data.driverInfo 
            ? data.driverInfo.houseNumber || '' 
            : data.role?.toLowerCase() === 'operator' && data.operatorInfo 
              ? data.operatorInfo.houseNumber || '' 
              : data.houseNumber || '',
          blockNumber: data.role?.toLowerCase() === 'driver' && data.driverInfo 
            ? data.driverInfo.blockNumber || '' 
            : data.role?.toLowerCase() === 'operator' && data.operatorInfo 
              ? data.operatorInfo.blockNumber || '' 
              : data.blockNumber || '',
          lotNumber: data.role?.toLowerCase() === 'driver' && data.driverInfo 
            ? data.driverInfo.lotNumber || '' 
            : data.role?.toLowerCase() === 'operator' && data.operatorInfo 
              ? data.operatorInfo.lotNumber || '' 
              : data.lotNumber || '',
          street: data.role?.toLowerCase() === 'driver' && data.driverInfo 
            ? data.driverInfo.street || '' 
            : data.role?.toLowerCase() === 'operator' && data.operatorInfo 
              ? data.operatorInfo.street || '' 
              : data.street || '',
          barangay: data.role?.toLowerCase() === 'driver' && data.driverInfo 
            ? data.driverInfo.barangay || '' 
            : data.role?.toLowerCase() === 'operator' && data.operatorInfo 
              ? data.operatorInfo.barangay || '' 
              : data.barangay || '',
          city: data.role?.toLowerCase() === 'driver' && data.driverInfo 
            ? data.driverInfo.city || '' 
            : data.role?.toLowerCase() === 'operator' && data.operatorInfo 
              ? data.operatorInfo.city || '' 
              : data.city || '',
        });
      } else {
        // If not found in members, try users collection
        console.log('Member not found in members collection, trying users collection');
        const userResult = await firestore.getDocument('users', user?.uid || '');
        
        if (userResult.success && userResult.data) {
          const data = userResult.data;
          
          // Extract name parts from fullName if available
          let firstName = data.firstName || '';
          let lastName = data.lastName || '';
          let middleName = data.middleName || '';
          let suffix = data.suffix || '';
          
          if (!firstName && !lastName && data.fullName) {
            const nameParts = data.fullName.split(' ');
            if (nameParts.length >= 2) {
              firstName = nameParts[0];
              lastName = nameParts[nameParts.length - 1];
              if (nameParts.length > 2) {
                middleName = nameParts.slice(1, nameParts.length - 1).join(' ');
              }
            }
          }
          
          setMemberData(data);
          
          setFormData({
            firstName,
            lastName,
            middleName,
            suffix,
            email: data.email || user?.email || '',
            phoneNumber: data.contactNumber || data.phoneNumber || '',
            birthdate: data.birthdate || '',
            licenseNumber: data.role?.toLowerCase() === 'driver' && data.driverInfo 
              ? data.driverInfo.licenseNumber || '' 
              : data.role?.toLowerCase() === 'operator' && data.operatorInfo 
                ? data.operatorInfo.licenseNumber || '' 
                : '',
            tinId: data.role?.toLowerCase() === 'driver' && data.driverInfo 
              ? data.driverInfo.tinId || '' 
              : data.role?.toLowerCase() === 'operator' && data.operatorInfo 
                ? data.operatorInfo.tinId || '' 
                : '',
            houseNumber: data.role?.toLowerCase() === 'driver' && data.driverInfo 
              ? data.driverInfo.houseNumber || '' 
              : data.role?.toLowerCase() === 'operator' && data.operatorInfo 
                ? data.operatorInfo.houseNumber || '' 
                : data.houseNumber || '',
            blockNumber: data.role?.toLowerCase() === 'driver' && data.driverInfo 
              ? data.driverInfo.blockNumber || '' 
              : data.role?.toLowerCase() === 'operator' && data.operatorInfo 
                ? data.operatorInfo.blockNumber || '' 
                : data.blockNumber || '',
            lotNumber: data.role?.toLowerCase() === 'driver' && data.driverInfo 
              ? data.driverInfo.lotNumber || '' 
              : data.role?.toLowerCase() === 'operator' && data.operatorInfo 
                ? data.operatorInfo.lotNumber || '' 
                : data.lotNumber || '',
            street: data.role?.toLowerCase() === 'driver' && data.driverInfo 
              ? data.driverInfo.street || '' 
              : data.role?.toLowerCase() === 'operator' && data.operatorInfo 
                ? data.operatorInfo.street || '' 
                : data.street || '',
            barangay: data.role?.toLowerCase() === 'driver' && data.driverInfo 
              ? data.driverInfo.barangay || '' 
              : data.role?.toLowerCase() === 'operator' && data.operatorInfo 
                ? data.operatorInfo.barangay || '' 
                : data.barangay || '',
            city: data.role?.toLowerCase() === 'driver' && data.driverInfo 
              ? data.driverInfo.city || '' 
              : data.role?.toLowerCase() === 'operator' && data.operatorInfo 
                ? data.operatorInfo.city || '' 
                : data.city || '',
          });
        } else {
          toast.error('Member data not found');
          console.error('Member not found in both members and users collections');
        }
      }
    } catch (error) {
      console.error('Error fetching member data:', error);
      toast.error('Failed to load member data');
    } finally {
      setLoadingData(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Prepare the updated data
      const updatedData: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        middleName: formData.middleName,
        suffix: formData.suffix,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        birthdate: formData.birthdate,
        updatedAt: new Date().toISOString(),
      };

      // Update driver or operator specific info if applicable
      if (memberData?.role?.toLowerCase() === 'driver') {
        updatedData.driverInfo = {
          ...memberData.driverInfo,
          licenseNumber: formData.licenseNumber,
          tinId: formData.tinId,
          houseNumber: formData.houseNumber,
          blockNumber: formData.blockNumber,
          lotNumber: formData.lotNumber,
          street: formData.street,
          barangay: formData.barangay,
          city: formData.city,
        };
      } else if (memberData?.role?.toLowerCase() === 'operator') {
        updatedData.operatorInfo = {
          ...memberData.operatorInfo,
          licenseNumber: formData.licenseNumber,
          tinId: formData.tinId,
          houseNumber: formData.houseNumber,
          blockNumber: formData.blockNumber,
          lotNumber: formData.lotNumber,
          street: formData.street,
          barangay: formData.barangay,
          city: formData.city,
        };
      } else {
        // For members, add address info directly to the document
        updatedData.houseNumber = formData.houseNumber;
        updatedData.blockNumber = formData.blockNumber;
        updatedData.lotNumber = formData.lotNumber;
        updatedData.street = formData.street;
        updatedData.barangay = formData.barangay;
        updatedData.city = formData.city;
      }

      // Update in members collection - if document doesn't exist, create it
      let membersResult = await firestore.updateDocument('members', user?.uid || '', updatedData);
      
      // If the document doesn't exist in members collection, create it
      if (!membersResult.success && membersResult.error?.includes('No document to update')) {
        console.log('Member document does not exist, creating new document in members collection');
        
        // Add role information to the updated data if it's available in memberData
        if (memberData?.role) {
          updatedData.role = memberData.role;
        }
        
        membersResult = await firestore.setDocument('members', user?.uid || '', updatedData);
      }

      // Also update in users collection if needed
      if (formData.email !== (memberData?.email || user?.email)) {
        // If email changed, update in users collection as well
        const usersUpdateData = {
          email: formData.email,
          displayName: `${formData.firstName} ${formData.middleName ? formData.middleName + ' ' : ''}${formData.lastName}`.trim(),
          updatedAt: new Date().toISOString()
        };
        
        const usersResult = await firestore.updateDocument('users', user?.uid || '', usersUpdateData);
        
        if (!usersResult.success) {
          console.error('Failed to update email in users collection');
          // Continue with members update even if users update fails
        }
      }

      if (membersResult.success) {
        // Update the user profile in auth context if needed
        if (formData.email !== (memberData?.email || user?.email) || 
            formData.firstName !== (memberData?.firstName || '') || 
            formData.lastName !== (memberData?.lastName || '')) {
          
          await updateProfile({
            email: formData.email,
            displayName: `${formData.firstName} ${formData.middleName ? formData.middleName + ' ' : ''}${formData.lastName}`.trim(),
          });
        }
        
        toast.success('Profile updated successfully!');
        router.push('/profile');
      } else {
        throw new Error('Failed to update profile in members collection');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Edit Profile</h1>
      
      <Card title="Personal Information">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
              <input
                type="text"
                name="middleName"
                value={formData.middleName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Suffix</label>
              <input
                type="text"
                name="suffix"
                value={formData.suffix}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Birthdate</label>
              <input
                type="date"
                name="birthdate"
                value={formData.birthdate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            
            {/* Driver/Operator specific fields */}
            {(memberData?.role?.toLowerCase() === 'driver' || memberData?.role?.toLowerCase() === 'operator') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                  <input
                    type="text"
                    name="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TIN ID</label>
                  <input
                    type="text"
                    name="tinId"
                    value={formData.tinId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </>
            )}
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-2">
                <div className="lg:col-span-2">
                  <input
                    type="text"
                    name="houseNumber"
                    placeholder="House No."
                    value={formData.houseNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="lg:col-span-2">
                  <input
                    type="text"
                    name="street"
                    placeholder="Street"
                    value={formData.street}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <input
                  type="text"
                  name="barangay"
                  placeholder="Barangay"
                  value={formData.barangay}
                  onChange={handleInputChange}
                  className="lg:col-span-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
                <input
                  type="text"
                  name="city"
                  placeholder="City/Municipality"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="lg:col-span-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={() => router.push('/profile')}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}