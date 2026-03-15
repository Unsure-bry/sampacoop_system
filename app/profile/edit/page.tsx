'use client';

import { useAuth } from '@/lib/auth';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';

interface FormData {
  firstName: string;
  lastName: string;
  middleName?: string;
  suffix?: string;
  email: string;
  phoneNumber: string;
  birthdate: string;
  age: number;
  licenseNumber: string;
  tinId: string;
  houseNumber: string;
  blockNumber: string;
  lotNumber: string;
  street: string;
  barangay: string;
  city: string;
}

export default function EditProfilePage() {
  const { user, loading, updateProfile } = useAuth();
  const router = useRouter();
  const [memberData, setMemberData] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [licenseNumberValid, setLicenseNumberValid] = useState<boolean | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset
  } = useForm<FormData>();

  const birthdate = watch('birthdate');
  const role = memberData?.role || '';

  // Calculate age when birthdate changes
  useEffect(() => {
    if (birthdate) {
      const today = new Date();
      const birthDate = new Date(birthdate);

      if (birthDate.toString() !== 'Invalid Date' && birthDate <= today) {
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }

        if (age >= 0) {
          setValue('age', age);
        }
      }
    }
  }, [birthdate, setValue]);

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

        // Reset form with member data
        reset({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          middleName: data.middleName || '',
          suffix: data.suffix || '',
          email: data.email || user?.email || '',
          phoneNumber: data.phoneNumber || '',
          birthdate: data.birthdate || '',
          age: data.age || 0,
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
          setMemberData(data);

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

          reset({
            firstName,
            lastName,
            middleName,
            suffix,
            email: data.email || user?.email || '',
            phoneNumber: data.contactNumber || data.phoneNumber || '',
            birthdate: data.birthdate || '',
            age: data.age || 0,
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

  const onSubmit = async (data: FormData) => {
    setSaving(true);

    try {
      // Prepare the updated data
      const updatedData: any = {
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName,
        suffix: data.suffix,
        email: data.email,
        phoneNumber: data.phoneNumber,
        birthdate: data.birthdate,
        age: data.age,
        updatedAt: new Date().toISOString(),
      };

      // Update driver or operator specific info if applicable
      if (memberData?.role?.toLowerCase() === 'driver') {
        updatedData.driverInfo = {
          ...memberData.driverInfo,
          licenseNumber: data.licenseNumber,
          tinId: data.tinId,
          houseNumber: data.houseNumber,
          blockNumber: data.blockNumber,
          lotNumber: data.lotNumber,
          street: data.street,
          barangay: data.barangay,
          city: data.city,
        };
      } else if (memberData?.role?.toLowerCase() === 'operator') {
        updatedData.operatorInfo = {
          ...memberData.operatorInfo,
          licenseNumber: data.licenseNumber,
          tinId: data.tinId,
          houseNumber: data.houseNumber,
          blockNumber: data.blockNumber,
          lotNumber: data.lotNumber,
          street: data.street,
          barangay: data.barangay,
          city: data.city,
        };
      } else {
        // For members, add address info directly to the document
        updatedData.houseNumber = data.houseNumber;
        updatedData.blockNumber = data.blockNumber;
        updatedData.lotNumber = data.lotNumber;
        updatedData.street = data.street;
        updatedData.barangay = data.barangay;
        updatedData.city = data.city;
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
      if (data.email !== (memberData?.email || user?.email)) {
        // If email changed, update in users collection as well
        const usersUpdateData = {
          email: data.email,
          displayName: `${data.firstName} ${data.middleName ? data.middleName + ' ' : ''}${data.lastName}`.trim(),
          updatedAt: new Date().toISOString()
        };

        const usersResult = await firestore.updateDocument('users', user?.uid || '', usersUpdateData);

        if (!usersResult.success) {
          console.error('Failed to update email in users collection');
        }
      }

      if (membersResult.success) {
        // Update the user profile in auth context if needed
        if (data.email !== (memberData?.email || user?.email) ||
            data.firstName !== (memberData?.firstName || '') ||
            data.lastName !== (memberData?.lastName || '')) {

          await updateProfile({
            email: data.email,
            displayName: `${data.firstName} ${data.middleName ? data.middleName + ' ' : ''}${data.lastName}`.trim(),
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
    <div className="max-w-4xl mx-auto px-4 sm:px-0">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-black">Edit Profile</h1>

      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <h3 className="text-lg font-semibold text-black">Personal Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('firstName', {
                  required: 'First name is required',
                  minLength: {
                    value: 2,
                    message: 'First name must be at least 2 characters long'
                  },
                  pattern: {
                    value: /^[A-Za-z\s]+$/,
                    message: 'First name can only contain letters and spaces'
                  }
                })}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black ${
                  errors.firstName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter first name"
                disabled={saving}
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
              )}
            </div>

            {/* Middle Name */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Middle Name
              </label>
              <input
                type="text"
                {...register('middleName', {
                  minLength: {
                    value: 2,
                    message: 'Middle name must be at least 2 characters long'
                  },
                  pattern: {
                    value: /^[A-Za-z\s]+$/,
                    message: 'Middle name can only contain letters and spaces'
                  }
                })}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black ${
                  errors.middleName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter middle name"
                disabled={saving}
              />
              {errors.middleName && (
                <p className="mt-1 text-sm text-red-600">{errors.middleName.message}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('lastName', {
                  required: 'Last name is required',
                  minLength: {
                    value: 2,
                    message: 'Last name must be at least 2 characters long'
                  },
                  pattern: {
                    value: /^[A-Za-z\s]+$/,
                    message: 'Last name can only contain letters and spaces'
                  }
                })}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black ${
                  errors.lastName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter last name"
                disabled={saving}
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
              )}
            </div>

            {/* Suffix */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Suffix
              </label>
              <input
                type="text"
                {...register('suffix', {
                  pattern: {
                    value: /^[A-Za-z\.\s]+$/,
                    message: 'Suffix can only contain letters, periods, and spaces'
                  }
                })}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black ${
                  errors.suffix ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Jr., Sr., III"
                disabled={saving}
              />
              {errors.suffix && (
                <p className="mt-1 text-sm text-red-600">{errors.suffix.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                {...register('email', {
                  required: 'Email address is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  },
                  minLength: {
                    value: 5,
                    message: 'Email address is too short'
                  }
                })}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter email address"
                disabled={saving}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                {...register('phoneNumber', {
                  required: 'Phone number is required',
                  pattern: {
                    value: /^(09|\+639)\d{9}$/,
                    message: 'Please enter a valid Philippine mobile number (e.g., 09123456789)'
                  },
                  minLength: {
                    value: 10,
                    message: 'Phone number is too short'
                  },
                  maxLength: {
                    value: 11,
                    message: 'Phone number is too long'
                  }
                })}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black ${
                  errors.phoneNumber ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter phone number"
                disabled={saving}
                maxLength={11}
              />
              {errors.phoneNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.phoneNumber.message}</p>
              )}
            </div>

            {/* Birthdate */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Birthdate <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  {...register('birthdate', {
                    required: 'Birthdate is required',
                    validate: (value) => {
                      if (!value) return 'Birthdate is required';
                      const birthDate = new Date(value);
                      const today = new Date();
                      const age = today.getFullYear() - birthDate.getFullYear();

                      if (age < 18) {
                        return 'Member must be at least 18 years old';
                      }

                      if (age > 100) {
                        return 'Please enter a valid birthdate';
                      }

                      if (birthDate > today) {
                        return 'Birthdate cannot be in the future';
                      }

                      return true;
                    }
                  })}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black ${
                    errors.birthdate ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={saving}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              {errors.birthdate && (
                <p className="mt-1 text-sm text-red-600">{errors.birthdate.message}</p>
              )}
            </div>

            {/* Age */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Age
              </label>
              <input
                type="number"
                {...register('age', {
                  valueAsNumber: true,
                  min: { value: 18, message: 'Member must be at least 18 years old' },
                  max: { value: 100, message: 'Please enter a valid age' }
                })}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black ${
                  errors.age ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Age will be calculated automatically"
                readOnly
              />
              {errors.age && (
                <p className="mt-1 text-sm text-red-600">{errors.age.message}</p>
              )}
            </div>

            {/* Role Display (Read-only) */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-black mb-1">
                Role
              </label>
              <input
                type="text"
                value={role}
                readOnly
                className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 text-black"
              />
              <p className="mt-1 text-sm text-gray-500">Role cannot be changed. Contact admin for assistance.</p>
            </div>
          </div>

          {/* Driver/Operator specific fields */}
          {(role.toLowerCase() === 'driver' || role.toLowerCase() === 'operator') && (
            <>
              <h3 className="text-lg font-semibold text-black pt-4">{role} Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* License Number */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-black mb-1">
                    License Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('licenseNumber', {
                      required: 'License number is required',
                      minLength: {
                        value: 13,
                        message: 'License number must be exactly 13 characters long (format: A12-34-567890)'
                      },
                      maxLength: {
                        value: 13,
                        message: 'License number must be exactly 13 characters long (format: A12-34-567890)'
                      },
                      pattern: {
                        value: /^[A-Z]\d{2}-\d{2}-\d{6}$/,
                        message: 'Invalid license number format. Use A12-34-567890.'
                      }
                    })}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black ${
                      errors.licenseNumber ? 'border-red-500' : licenseNumberValid === false ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter license number"
                    disabled={saving}
                    maxLength={13}
                    onChange={(e) => {
                      const value = e.target.value;
                      let processedValue = value.toUpperCase();
                      processedValue = processedValue.replace(/[^A-Z0-9-]/g, '');

                      if (processedValue.length >= 3 && processedValue.charAt(3) !== '-' && processedValue.charAt(1) && processedValue.charAt(2)) {
                        if (/^\d$/.test(processedValue.charAt(1)) && /^\d$/.test(processedValue.charAt(2))) {
                          processedValue = processedValue.substring(0, 3) + '-' + processedValue.substring(3);
                        }
                      }
                      if (processedValue.length >= 7 && processedValue.charAt(6) !== '-' && processedValue.charAt(4) && processedValue.charAt(5)) {
                        if (/^\d$/.test(processedValue.charAt(4)) && /^\d$/.test(processedValue.charAt(5))) {
                          processedValue = processedValue.substring(0, 6) + '-' + processedValue.substring(6);
                        }
                      }

                      processedValue = processedValue.substring(0, 13);
                      setValue('licenseNumber', processedValue);

                      const isValid = /^[A-Z]\d{2}-\d{2}-\d{6}$/.test(processedValue);
                      if (processedValue.length === 13) {
                        setLicenseNumberValid(isValid);
                      } else {
                        setLicenseNumberValid(null);
                      }
                    }}
                  />
                  {errors.licenseNumber && (
                    <p className="mt-1 text-sm text-red-600">{errors.licenseNumber.message}</p>
                  )}
                  {!errors.licenseNumber && licenseNumberValid === false && (
                    <p className="mt-1 text-sm text-red-600">Invalid license number format. Use A12-34-567890.</p>
                  )}
                </div>

                {/* TIN ID */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-black mb-1">
                    TIN ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('tinId', {
                      required: 'TIN ID is required',
                      minLength: {
                        value: 13,
                        message: 'TIN ID must be at least 13 characters long (format: XXX-XXX-XXX-XXXXX)'
                      },
                      maxLength: {
                        value: 17,
                        message: 'TIN ID is too long (format: XXX-XXX-XXX-XXXXX)'
                      },
                      pattern: {
                        value: /^\d{3}-\d{3}-\d{3}-\d{5}$/,
                        message: 'TIN ID must be in the format XXX-XXX-XXX-XXXXX (e.g., 123-456-789-12345)'
                      }
                    })}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black ${
                      errors.tinId ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter TIN ID"
                    disabled={saving}
                    maxLength={17}
                    onChange={(e) => {
                      const value = e.target.value;
                      let processedValue = value.replace(/[^0-9-]/g, '');

                      if (processedValue.length >= 3 && processedValue.charAt(3) !== '-') {
                        processedValue = processedValue.substring(0, 3) + '-' + processedValue.substring(3);
                      }
                      if (processedValue.length >= 7 && processedValue.charAt(7) !== '-') {
                        processedValue = processedValue.substring(0, 7) + '-' + processedValue.substring(7);
                      }
                      if (processedValue.length >= 11 && processedValue.charAt(11) !== '-') {
                        processedValue = processedValue.substring(0, 11) + '-' + processedValue.substring(11);
                      }

                      processedValue = processedValue.substring(0, 17);
                      setValue('tinId', processedValue);
                    }}
                  />
                  {errors.tinId && (
                    <p className="mt-1 text-sm text-red-600">{errors.tinId.message}</p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Address Information */}
          <h3 className="text-lg font-semibold text-black pt-4">Address Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* House No. */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                House No.
              </label>
              <input
                type="text"
                {...register('houseNumber')}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black"
                placeholder="Enter house number"
                disabled={saving}
              />
            </div>

            {/* Block No. */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Block No.
              </label>
              <input
                type="text"
                {...register('blockNumber')}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black"
                placeholder="Enter block number"
                disabled={saving}
              />
            </div>

            {/* Lot No. */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Lot No.
              </label>
              <input
                type="text"
                {...register('lotNumber')}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black"
                placeholder="Enter lot number"
                disabled={saving}
              />
            </div>

            {/* Street */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Street <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('street', {
                  required: 'Street is required',
                  pattern: {
                    value: /^[A-Za-z0-9\s\-\.,]+$/,
                    message: 'Street can only contain letters, numbers, spaces, hyphens, periods, and commas'
                  }
                })}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black ${
                  errors.street ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter street"
                disabled={saving}
              />
              {errors.street && (
                <p className="mt-1 text-sm text-red-600">{errors.street.message}</p>
              )}
            </div>

            {/* Barangay */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Barangay <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('barangay', {
                  required: 'Barangay is required',
                  pattern: {
                    value: /^[A-Za-z\s\-]+$/,
                    message: 'Barangay can only contain letters, spaces, and hyphens'
                  }
                })}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black ${
                  errors.barangay ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter barangay"
                disabled={saving}
              />
              {errors.barangay && (
                <p className="mt-1 text-sm text-red-600">{errors.barangay.message}</p>
              )}
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('city', {
                  required: 'City is required',
                  pattern: {
                    value: /^[A-Za-z\s\-]+$/,
                    message: 'City can only contain letters, spaces, and hyphens'
                  }
                })}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black ${
                  errors.city ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter city"
                disabled={saving}
              />
              {errors.city && (
                <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.push('/profile')}
              disabled={saving}
              className="w-full sm:w-auto px-6 py-3 border border-gray-300 text-black rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 order-2 sm:order-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center order-1 sm:order-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
