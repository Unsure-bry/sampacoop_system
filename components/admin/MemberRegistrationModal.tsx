'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { Member } from '@/lib/types/member';

interface PersonalInfo {
  firstName: string;
  lastName: string;
  middleName?: string;
  suffix?: string;
  birthdate: string;
  age: number;
  role: 'Driver' | 'Operator';
  email: string;
  phoneNumber: string;
}

interface AddressInfo {
  houseNumber?: string;
  blockNumber?: string;
  lotNumber?: string;
  street?: string;
  barangay?: string;
  city?: string;
}

interface DriverInfo extends AddressInfo {
  licenseNumber: string;
  tinId: string;
}

interface OperatorInfo extends AddressInfo {
  licenseNumber: string;
  tinId: string;
  numberOfJeepneys: number;
  plateNumbers: string[];
}

interface PaymentInfo {
  membershipFee: number;
  paymentMethod: string;
  status: string;
  totalFee: number;
  amountPaid: number;
  remainingBalance: number;
}

interface FormData {
  firstName: string;
  lastName: string;
  middleName?: string;
  suffix?: string;
  birthdate: string;
  age: number;
  role: 'Driver' | 'Operator';
  email: string;
  phoneNumber: string;
  driverLicenseNumber?: string;
  driverTinId?: string;
  driverHouseNumber?: string;
  driverBlockNumber?: string;
  driverLotNumber?: string;
  driverStreet?: string;
  driverBarangay?: string;
  driverCity?: string;
  operatorLicenseNumber?: string;
  operatorTinId?: string;
  operatorHouseNumber?: string;
  operatorBlockNumber?: string;
  operatorLotNumber?: string;
  operatorStreet?: string;
  operatorBarangay?: string;
  operatorCity?: string;
  numberOfJeepneys?: number;
  plateNumbers?: string[];
  paymentInfo?: PaymentInfo;
  fullName?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function MemberRegistrationModal({ 
  isOpen, 
  onClose, 
  onMemberAdded 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onMemberAdded: () => void; 
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [role, setRole] = useState<'Driver' | 'Operator' | null>(null);
  const { register, handleSubmit, watch, setValue, formState: { errors }, reset } = useForm<FormData>();
  
  // Watch form values
  const birthdate = watch('birthdate');
  const numberOfJeepneys = watch('numberOfJeepneys');
  const plateNumbers: string[] = watch('plateNumbers') || [];
  
  // Calculate age when birthdate changes
  useEffect(() => {
    if (birthdate) {
      const today = new Date();
      const birthDate = new Date(birthdate);
      
      // Check if birthdate is valid
      if (birthDate.toString() !== 'Invalid Date' && birthDate <= today) {
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        
        // Ensure age is not negative
        if (age >= 0) {
          setValue('age', age);
        }
      }
    }
  }, [birthdate, setValue]);
  
  // Handle dynamic plate number fields
  useEffect(() => {
    if (numberOfJeepneys && numberOfJeepneys > 0) {
      const currentPlateNumbers = plateNumbers || [];
      const newPlateNumbers: string[] = [...currentPlateNumbers];
      
      // Adjust array size based on numberOfJeepneys
      if (newPlateNumbers.length > numberOfJeepneys) {
        newPlateNumbers.splice(numberOfJeepneys);
      } else {
        while (newPlateNumbers.length < numberOfJeepneys) {
          newPlateNumbers.push('');
        }
      }
      
      setValue('plateNumbers', newPlateNumbers);
    }
  }, [numberOfJeepneys, plateNumbers, setValue]);

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      // Add payment information
      const paymentData: PaymentInfo = {
        membershipFee: 1500,
        paymentMethod: 'Cash',
        status: 'PAID',
        totalFee: 1500,
        amountPaid: 1500,
        remainingBalance: 0
      };
      
      // Prepare driver or operator info based on role
      // Ensure both driverInfo and operatorInfo are always defined to prevent Firestore undefined field errors
      let driverInfo: DriverInfo | null = null;
      let operatorInfo: OperatorInfo | null = null;
      
      if (data.role === 'Driver') {
        driverInfo = {
          licenseNumber: data.driverLicenseNumber || '',
          tinId: data.driverTinId || '',
          houseNumber: data.driverHouseNumber || '',
          blockNumber: data.driverBlockNumber || '',
          lotNumber: data.driverLotNumber || '',
          street: data.driverStreet || '',
          barangay: data.driverBarangay || '',
          city: data.driverCity || ''
        };
        // Initialize operatorInfo as empty object for drivers to prevent undefined field errors
        operatorInfo = {
          licenseNumber: '',
          tinId: '',
          numberOfJeepneys: 0,
          plateNumbers: [],
          houseNumber: '',
          blockNumber: '',
          lotNumber: '',
          street: '',
          barangay: '',
          city: ''
        };
      } else {
        operatorInfo = {
          licenseNumber: data.operatorLicenseNumber || '',
          tinId: data.operatorTinId || '',
          numberOfJeepneys: data.numberOfJeepneys || 0,
          plateNumbers: data.plateNumbers || [],
          houseNumber: data.operatorHouseNumber || '',
          blockNumber: data.operatorBlockNumber || '',
          lotNumber: data.operatorLotNumber || '',
          street: data.operatorStreet || '',
          barangay: data.operatorBarangay || '',
          city: data.operatorCity || ''
        };
        // Initialize driverInfo as empty object for operators to prevent undefined field errors
        driverInfo = {
          licenseNumber: '',
          tinId: '',
          houseNumber: '',
          blockNumber: '',
          lotNumber: '',
          street: '',
          barangay: '',
          city: ''
        };
      }
      
      // First, create the user account in the users collection for login
      const userResult = await firestore.setDocument(
        'users',
        encodeURIComponent(data.email.toLowerCase()),
        {
          email: data.email,
          displayName: `${data.firstName} ${data.lastName}`,
          role: data.role.toLowerCase(),
          createdAt: new Date().toISOString(),
          isPasswordSet: false, // Set to false since password will be created by member
        }
      );

      if (!userResult.success) {
        toast.error('Failed to create user account. Please try again.');
        return;
      }

      // Prepare member data for Firestore (members collection)
      const memberData = {
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName,
        suffix: data.suffix,
        birthdate: data.birthdate,
        age: data.age,
        role: data.role,
        email: data.email,
        phoneNumber: data.phoneNumber,
        driverInfo,
        operatorInfo,
        fullName: `${data.firstName} ${data.middleName ? data.middleName + ' ' : ''}${data.lastName}${data.suffix ? ' ' + data.suffix : ''}`,
        status: 'Active', // Add default status
        paymentInfo: paymentData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save to members collection
      const memberResult = await firestore.setDocument(
        'members',
        `${data.firstName}-${data.lastName}-${Date.now()}`.toLowerCase().replace(/\s+/g, '-'),
        memberData
      );

      if (memberResult.success) {
        toast.success('Member registered successfully! Payment confirmed.');
        reset();
        setCurrentStep(1);
        setRole(null);
        onClose();
        onMemberAdded(); // This will trigger the success message in the Membership page
      } else {
        toast.error('Failed to register member. Please try again.');
      }
    } catch (error) {
      console.error('Error registering member:', error);
      toast.error('An error occurred. Please try again.');
    }
  };

  const handleRoleChange = (selectedRole: 'Driver' | 'Operator') => {
    setRole(selectedRole);
    setValue('role', selectedRole);
  };
  
  // Handle plate number changes
  const handlePlateNumberChange = (index: number, value: string) => {
    const newPlateNumbers: string[] = [...(plateNumbers || [])];
    newPlateNumbers[index] = value;
    setValue('plateNumbers', newPlateNumbers);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Add New Member</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex justify-between relative">
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -z-10"></div>
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    currentStep >= step ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step}
                  </div>
                  <span className="mt-2 text-sm font-medium text-gray-600">
                    {step === 1 ? 'Personal Info' : step === 2 ? 'Role Details' : 'Confirmation'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-800">Personal Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      {...register('firstName', { required: 'First name is required' })}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                        errors.firstName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter first name"
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                    )}
                  </div>
                
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      {...register('lastName', { required: 'Last name is required' })}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                        errors.lastName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter last name"
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                    )}
                  </div>
                
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Middle Name
                    </label>
                    <input
                      type="text"
                      {...register('middleName')}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="Enter middle name"
                    />
                  </div>
                
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Suffix
                    </label>
                    <input
                      type="text"
                      {...register('suffix')}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="e.g., Jr., Sr., III"
                    />
                  </div>
                
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      {...register('email', { 
                        required: 'Email address is required',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Invalid email address'
                        }
                      })}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter email address"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>
                
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      {...register('phoneNumber', { 
                        required: 'Phone number is required',
                        pattern: {
                          value: /^[0-9+\-\s()]+$/,
                          message: 'Invalid phone number format'
                        }
                      })}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                        errors.phoneNumber ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter phone number"
                    />
                    {errors.phoneNumber && (
                      <p className="mt-1 text-sm text-red-600">{errors.phoneNumber.message}</p>
                    )}
                  </div>
                
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Birthdate <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        {...register('birthdate', { required: 'Birthdate is required' })}
                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                          errors.birthdate ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                    {errors.birthdate && (
                      <p className="mt-1 text-sm text-red-600">{errors.birthdate.message}</p>
                    )}
                  </div>
                
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Age
                    </label>
                    <input
                      type="number"
                      {...register('age', { 
                        valueAsNumber: true,
                        min: { value: 0, message: 'Age must be 0 or greater' },
                        max: { value: 120, message: 'Age must be realistic' }
                      })}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                        errors.age ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Age will be calculated automatically"
                      readOnly
                    />
                    {errors.age && (
                      <p className="mt-1 text-sm text-red-600">{errors.age.message}</p>
                    )}
                  </div>
                
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => handleRoleChange('Driver')}
                        className={`p-4 border rounded-lg text-center transition-colors ${
                          role === 'Driver' 
                            ? 'border-red-500 bg-red-50 ring-2 ring-red-200' 
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="font-medium">Driver</div>
                        <div className="text-sm text-gray-500 mt-1">For jeepney drivers</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRoleChange('Operator')}
                        className={`p-4 border rounded-lg text-center transition-colors ${
                          role === 'Operator' 
                            ? 'border-red-500 bg-red-50 ring-2 ring-red-200' 
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="font-medium">Operator</div>
                        <div className="text-sm text-gray-500 mt-1">For jeepney operators</div>
                      </button>
                    </div>
                    {role === null && (
                      <p className="mt-1 text-sm text-red-600">Please select a role</p>
                    )}
                  </div>
                  
                  {/* Address fields for both roles in Step 1 */}
                  <div className="md:col-span-2">
                    <h4 className="text-md font-semibold text-gray-800 mb-3">Address Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          House No.
                        </label>
                        <input
                          type="text"
                          {...register(role === 'Driver' ? 'driverHouseNumber' : 'operatorHouseNumber')}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          placeholder="Enter house number"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Block No.
                        </label>
                        <input
                          type="text"
                          {...register(role === 'Driver' ? 'driverBlockNumber' : 'operatorBlockNumber')}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          placeholder="Enter block number"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Lot No.
                        </label>
                        <input
                          type="text"
                          {...register(role === 'Driver' ? 'driverLotNumber' : 'operatorLotNumber')}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          placeholder="Enter lot number"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Street
                        </label>
                        <input
                          type="text"
                          {...register(role === 'Driver' ? 'driverStreet' : 'operatorStreet')}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          placeholder="Enter street"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Barangay
                        </label>
                        <input
                          type="text"
                          {...register(role === 'Driver' ? 'driverBarangay' : 'operatorBarangay')}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          placeholder="Enter barangay"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          {...register(role === 'Driver' ? 'driverCity' : 'operatorCity')}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          placeholder="Enter city"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={nextStep}
                    disabled={!role}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    Next: Role Details
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Role-specific Information */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-800">
                  {role} Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      License Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      {...register(role === 'Driver' ? 'driverLicenseNumber' : 'operatorLicenseNumber', { required: 'License number is required' })}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                        role === 'Driver' 
                          ? (errors.driverLicenseNumber ? 'border-red-500' : 'border-gray-300')
                          : (errors.operatorLicenseNumber ? 'border-red-500' : 'border-gray-300')
                      }`}
                      placeholder="Enter license number"
                    />
                    {role === 'Driver' && errors.driverLicenseNumber && (
                      <p className="mt-1 text-sm text-red-600">{errors.driverLicenseNumber.message}</p>
                    )}
                    {role === 'Operator' && errors.operatorLicenseNumber && (
                      <p className="mt-1 text-sm text-red-600">{errors.operatorLicenseNumber.message}</p>
                    )}
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      TIN ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      {...register(role === 'Driver' ? 'driverTinId' : 'operatorTinId', { required: 'TIN ID is required' })}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                        role === 'Driver' 
                          ? (errors.driverTinId ? 'border-red-500' : 'border-gray-300')
                          : (errors.operatorTinId ? 'border-red-500' : 'border-gray-300')
                      }`}
                      placeholder="Enter TIN ID"
                    />
                    {role === 'Driver' && errors.driverTinId && (
                      <p className="mt-1 text-sm text-red-600">{errors.driverTinId.message}</p>
                    )}
                    {role === 'Operator' && errors.operatorTinId && (
                      <p className="mt-1 text-sm text-red-600">{errors.operatorTinId.message}</p>
                    )}
                  </div>
                  
                  {/* Show additional fields only for Operator */}
                  {role === 'Operator' && (
                    <>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Number of Jeepneys <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          {...register('numberOfJeepneys', { 
                            required: 'Number of jeepneys is required',
                            valueAsNumber: true,
                            min: 1
                          })}
                          className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                            errors.numberOfJeepneys ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Enter number of jeepneys"
                          min="1"
                        />
                        {errors.numberOfJeepneys && (
                          <p className="mt-1 text-sm text-red-600">{errors.numberOfJeepneys.message}</p>
                        )}
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Jeepney Plate Number(s) <span className="text-red-500">*</span>
                        </label>
                        {numberOfJeepneys && numberOfJeepneys > 0 ? (
                          <div className="space-y-3">
                            {Array.from({ length: numberOfJeepneys }).map((_, index) => (
                              <div key={index}>
                                <label className="block text-sm text-gray-600 mb-1">Jeepney {index + 1} Plate Number</label>
                                <input
                                  type="text"
                                  value={plateNumbers[index] || ''}
                                  onChange={(e) => handlePlateNumberChange(index, e.target.value)}
                                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                  placeholder={`Enter plate number for jeepney ${index + 1}`}
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-gray-50 p-4 rounded-lg text-center text-gray-500">
                            Please enter the number of jeepneys first
                          </div>
                        )}
                        {errors.plateNumbers && (
                          <p className="mt-1 text-sm text-red-600">{errors.plateNumbers.message}</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
                
                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Next: Confirmation
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Confirmation & Payment Details */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-800">Confirm Member Information & Payment</h3>
                
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-700">Personal Information</h4>
                      <div className="mt-2 space-y-1 text-sm">
                        <p><span className="text-gray-600">Name:</span> {watch('firstName')} {watch('middleName')} {watch('lastName')} {watch('suffix')}</p>
                        <p><span className="text-gray-600">Email:</span> {watch('email')}</p>
                        <p><span className="text-gray-600">Phone:</span> {watch('phoneNumber')}</p>
                        <p><span className="text-gray-600">Birthdate:</span> {watch('birthdate')}</p>
                        <p><span className="text-gray-600">Age:</span> {watch('age')}</p>
                        <p><span className="text-gray-600">Role:</span> {watch('role')}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-700">Address Information</h4>
                      <div className="mt-2 space-y-1 text-sm">
                        <p><span className="text-gray-600">House No.:</span> {role === 'Driver' ? watch('driverHouseNumber') : watch('operatorHouseNumber')}</p>
                        <p><span className="text-gray-600">Block No.:</span> {role === 'Driver' ? watch('driverBlockNumber') : watch('operatorBlockNumber')}</p>
                        <p><span className="text-gray-600">Lot No.:</span> {role === 'Driver' ? watch('driverLotNumber') : watch('operatorLotNumber')}</p>
                        <p><span className="text-gray-600">Street:</span> {role === 'Driver' ? watch('driverStreet') : watch('operatorStreet')}</p>
                        <p><span className="text-gray-600">Barangay:</span> {role === 'Driver' ? watch('driverBarangay') : watch('operatorBarangay')}</p>
                        <p><span className="text-gray-600">City:</span> {role === 'Driver' ? watch('driverCity') : watch('operatorCity')}</p>
                      </div>
                    </div>
                    
                    {role === 'Driver' && (
                      <div>
                        <h4 className="font-medium text-gray-700">Driver Information</h4>
                        <div className="mt-2 space-y-1 text-sm">
                          <p><span className="text-gray-600">License:</span> {watch('driverLicenseNumber')}</p>
                          <p><span className="text-gray-600">TIN ID:</span> {watch('driverTinId')}</p>
                        </div>
                      </div>
                    )}
                    
                    {role === 'Operator' && (
                      <div>
                        <h4 className="font-medium text-gray-700">Operator Information</h4>
                        <div className="mt-2 space-y-1 text-sm">
                          <p><span className="text-gray-600">License:</span> {watch('operatorLicenseNumber')}</p>
                          <p><span className="text-gray-600">TIN ID:</span> {watch('operatorTinId')}</p>
                          <p><span className="text-gray-600">Jeepneys:</span> {watch('numberOfJeepneys')}</p>
                          <div>
                            <span className="text-gray-600">Plate Numbers:</span>
                            <div className="ml-2">
                              {Array.isArray(watch('plateNumbers')) && 
                                watch('plateNumbers')?.map((plate: string, index: number) => (
                                  <p key={index}>Jeepney {index + 1}: {plate}</p>
                                ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <h4 className="font-medium text-gray-700 mb-3">Payment Details</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Selected Role:</span>
                      <span className="font-medium">{watch('role')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Membership Fee:</span>
                      <span className="font-medium">₱1500</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Method:</span>
                      <span className="font-medium">Cash only</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Fee:</span>
                        <span className="font-medium">₱1500</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Amount Paid:</span>
                        <span className="font-medium">₱1500</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Remaining Balance:</span>
                        <span className="font-medium">₱0</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Confirm & Submit
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}