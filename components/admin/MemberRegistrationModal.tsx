'use client';

import { useState, useEffect } from 'react';
import { useForm, FieldErrors } from 'react-hook-form';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { Member } from '@/lib/types/member';
import { sendMemberRegistrationEmail } from '@/lib/emailService';
import { createLinkedUserMember, checkEmailExists } from '@/lib/userMemberService';
import { logActivity } from '@/lib/activityLogger';
import { useAuth } from '@/lib/auth';
import { getSystemSettings, formatCurrency, SystemSettings } from '@/lib/settingsService';
import CertificatePreviewModal from './CertificatePreviewModal';
import { generateShareCertificate } from '@/lib/certificateService';

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
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [role, setRole] = useState<'Driver' | 'Operator' | null>(null);
  const [licenseNumberValid, setLicenseNumberValid] = useState<boolean | null>(null); // null = not validated yet, true = valid, false = invalid
  const [isSubmitting, setIsSubmitting] = useState(false); // New state for loading
  const [isPaid, setIsPaid] = useState(false); // Payment confirmation checkbox
  const [controlNumber, setControlNumber] = useState(''); // Receipt control number
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [showCertificatePreview, setShowCertificatePreview] = useState(false);
  const [isGeneratingCertificate, setIsGeneratingCertificate] = useState(false);
  const [registeredMemberData, setRegisteredMemberData] = useState<any>(null);
  const { register, handleSubmit, watch, setValue, formState: { errors }, reset, trigger } = useForm<FormData>();

  // Fetch system settings when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchSystemSettings();
    }
  }, [isOpen]);

  const fetchSystemSettings = async () => {
    const settings = await getSystemSettings();
    setSystemSettings(settings);
  };
  
  // Function to validate all required fields for current step
  const validateCurrentStep = async () => {
    if (currentStep === 1) {
      const personalInfoFields = [
        'firstName', 'middleName', 'lastName', 'email', 'phoneNumber', 'birthdate', 'role'
      ];
      
      // Add address fields validation - only required fields (street, barangay, city)
      if (role === 'Driver') {
        personalInfoFields.push(
          'driverStreet', 'driverBarangay', 'driverCity'
        );
      } else if (role === 'Operator') {
        personalInfoFields.push(
          'operatorStreet', 'operatorBarangay', 'operatorCity'
        );
      }
      
      return await trigger(personalInfoFields as (keyof FormData)[]);
    } else if (currentStep === 2) {
      if (role === 'Driver') {
        return await trigger(['driverLicenseNumber', 'driverTinId']);
      } else if (role === 'Operator') {
        // Validate plate numbers individually if number of jeepneys is specified
        const operatorFields = ['operatorLicenseNumber', 'operatorTinId', 'numberOfJeepneys'];
        
        if (numberOfJeepneys && numberOfJeepneys > 0) {
          // Add individual plate number validations
          for (let i = 0; i < numberOfJeepneys; i++) {
            operatorFields.push(`plateNumbers.${i}` as keyof FormData);
          }
        }
        
        return await trigger(operatorFields as (keyof FormData)[]);
      }
    } else if (currentStep === 3) {
      // For step 3, we'll validate everything before submission
      return Object.keys(errors).length === 0;
    }
    
    return true;
  };
  
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
  if (!numberOfJeepneys || numberOfJeepneys <= 0) return;

  const currentPlateNumbers = plateNumbers || [];

  if (currentPlateNumbers.length !== numberOfJeepneys) {
    const newPlateNumbers = [...currentPlateNumbers];

    if (newPlateNumbers.length > numberOfJeepneys) {
      newPlateNumbers.splice(numberOfJeepneys);
    } else {
      while (newPlateNumbers.length < numberOfJeepneys) {
        newPlateNumbers.push('');
      }
    }

    setValue('plateNumbers', newPlateNumbers);
  }

}, [numberOfJeepneys]);

  const nextStep = async () => {
    if (currentStep < 3) {
      const isValid = await validateCurrentStep();
      if (isValid) {
        setCurrentStep(currentStep + 1);
      } else {
        toast.error('Please complete all required fields to proceed.');
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: FormData) => {
    // Set submitting state
    setIsSubmitting(true);
    
    try {
      // Final validation before submission
      const personalInfoFields = [
        'firstName', 'middleName', 'lastName', 'email', 'phoneNumber', 'birthdate', 'role'
      ];
      
      // Add address fields based on role - only required fields (street, barangay, city)
      if (data.role === 'Driver') {
        personalInfoFields.push(
          'driverStreet', 'driverBarangay', 'driverCity'
        );
      } else if (data.role === 'Operator') {
        personalInfoFields.push(
          'operatorStreet', 'operatorBarangay', 'operatorCity'
        );
      }
      
      // Add role-specific fields
      if (data.role === 'Driver') {
        personalInfoFields.push('driverLicenseNumber', 'driverTinId');
      } else if (data.role === 'Operator' && data.numberOfJeepneys && data.numberOfJeepneys > 0) {
        personalInfoFields.push('operatorLicenseNumber', 'operatorTinId', 'numberOfJeepneys');
        
        // Add validation for each plate number
        for (let i = 0; i < data.numberOfJeepneys; i++) {
          personalInfoFields.push(`plateNumbers.${i}` as keyof FormData);
        }
      }
      
      const allValid = await trigger(personalInfoFields as (keyof FormData)[]);
      
      if (!allValid || Object.keys(errors).length > 0) {
        toast.error('Please complete all required fields to proceed.');
        setIsSubmitting(false);
        return;
      }
      
      // Additional check for email uniqueness before proceeding
      const normalizedEmail = data.email.toLowerCase();
      const emailExists = await checkEmailExists(normalizedEmail);
      if (emailExists) {
        toast.error('This email address is already registered. Please use a different email.');
        setIsSubmitting(false);
        return;
      }
      
      // Add payment information using system settings
      const membershipFee = systemSettings?.membershipPayment || 1500;
      const paymentData: PaymentInfo = {
        membershipFee: membershipFee,
        paymentMethod: 'Cash',
        status: 'PAID',
        totalFee: membershipFee,
        amountPaid: membershipFee,
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
      
      // Use the new user-member service to create linked records
      const { success, userId, memberId, error } = await createLinkedUserMember({
        email: normalizedEmail, // Use normalized email
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName,
        suffix: data.suffix,
        role: data.role,
        phoneNumber: data.phoneNumber,
        birthdate: data.birthdate,
        driverInfo,
        operatorInfo,
        paymentInfo: paymentData
      });

      if (success && memberId) {
        // Store registered member data for certificate generation
        const memberData = {
          id: memberId, // Use the actual Firestore document ID
          firstName: data.firstName,
          lastName: data.lastName,
          middleName: data.middleName,
          suffix: data.suffix,
          role: data.role,
          email: normalizedEmail,
          phoneNumber: data.phoneNumber,
          createdAt: new Date().toISOString(),
          driverInfo: driverInfo || undefined,
          operatorInfo: operatorInfo || undefined
        };
        setRegisteredMemberData(memberData);
        
        // Send welcome email
        const emailSent = await sendMemberRegistrationEmail(normalizedEmail, `${data.firstName} ${data.lastName}`); // Use normalized email
        
        if (emailSent) {
          toast.success('Registration successful! A confirmation email has been sent.');
        } else {
          toast.success('Registration successful! A confirmation email has been sent.');
        }
        
        // Log activity
        await logActivity({
          userId: user?.uid || 'unknown',
          userEmail: user?.email || 'unknown',
          userName: user?.displayName || 'Admin',
          action: 'Member Added',
          role: user?.role || 'admin',
        });
        
        // Show certificate preview modal
        setShowCertificatePreview(true);
      } else {
        toast.error('Failed to register member. Please try again.');
      }
    } catch (error) {
      console.error('Error registering member:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      // Always clear submitting state
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = (selectedRole: 'Driver' | 'Operator') => {
    setRole(selectedRole);
    setValue('role', selectedRole, { shouldValidate: true });
    // Reset license number validation when role changes
    setLicenseNumberValid(null);
  };

  // Handle certificate generation
  const handleGenerateCertificate = async (certificateData: any) => {
    if (!registeredMemberData) return;
    
    setIsGeneratingCertificate(true);
    try {
      const result = await generateShareCertificate(registeredMemberData, {
        certificateNumber: certificateData.certificateNumber,
        shares: certificateData.shares,
        shareCapital: certificateData.shareCapital,
        cooperativeName: certificateData.cooperativeName,
        day: certificateData.day,
        month: certificateData.month,
        year: certificateData.year,
        secretaryName: certificateData.secretaryName,
        chairmanName: certificateData.chairmanName
      });
      
      if (result.success) {
        toast.success('Certificate generated and sent successfully!');
        setShowCertificatePreview(false);
        
        // Reset form and close modal
        reset();
        setCurrentStep(1);
        setRole(null);
        setLicenseNumberValid(null);
        setControlNumber('');
        setRegisteredMemberData(null);
        onClose();
        onMemberAdded();
      } else {
        toast.error('Failed to generate certificate. Please try again.');
      }
    } catch (error) {
      console.error('Error generating certificate:', error);
      toast.error('An error occurred while generating the certificate');
    } finally {
      setIsGeneratingCertificate(false);
    }
  };

  // Handle closing certificate preview without generating
  const handleCloseCertificatePreview = () => {
    setShowCertificatePreview(false);
    
    // Reset form and close modal
    reset();
    setCurrentStep(1);
    setRole(null);
    setLicenseNumberValid(null);
    setControlNumber('');
    setRegisteredMemberData(null);
    onClose();
    onMemberAdded();
  };
  
  // We no longer need handlePlateNumberChange since we're using register for plate numbers
  // The register hook handles the changes automatically

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-black">Add New Member</h2>
            <button 
              onClick={onClose}
              className="text-black hover:text-gray-700"
              disabled={isSubmitting}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Steps */}
          <div className="mb-6 sm:mb-8">
            <div className="flex justify-between relative px-2 sm:px-0">
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -z-10"></div>
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    currentStep >= step ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step}
                  </div>
                  <span className="mt-2 text-xs sm:text-sm font-medium text-black text-center">
                    {step === 1 ? 'Personal' : step === 2 ? 'Role' : 'Confirm'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-black">Personal Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                    )}
                  </div>
                
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
                      disabled={isSubmitting}
                    />
                    {errors.middleName && (
                      <p className="mt-1 text-sm text-red-600">{errors.middleName.message}</p>
                    )}
                  </div>
                
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
                      disabled={isSubmitting}
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                    )}
                  </div>
                
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
                    />
                    {errors.suffix && (
                      <p className="mt-1 text-sm text-red-600">{errors.suffix.message}</p>
                    )}
                  </div>
                
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
                        },
                        validate: async (value) => {
                          const normalizedEmail = value.toLowerCase();
                          const exists = await checkEmailExists(normalizedEmail);
                          if (exists) {
                            return 'This email address is already registered. Please use a different email.';
                          }
                          return true;
                        }
                      })}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter email address"
                      disabled={isSubmitting}
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>
                
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      {...register('phoneNumber', { 
                        required: 'Phone number is required',
                        pattern: {
                          value: /^(09|\+639)\d{9}$/, // Philippine mobile format
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
                      disabled={isSubmitting}
                      maxLength={11}
                      onChange={(e) => {
                        // Only allow numbers
                        const value = e.target.value.replace(/\D/g, '');
                        setValue('phoneNumber', value);
                      }}
                    />
                    {errors.phoneNumber && (
                      <p className="mt-1 text-sm text-red-600">{errors.phoneNumber.message}</p>
                    )}
                  </div>
                
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
                      />
                      {errors.birthdate && (
                        <p className="mt-1 text-sm text-red-500">{errors.birthdate.message}</p>
                      )}
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
                
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-black mb-1">
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
                        <div className="font-medium text-black">Driver</div>
                        <div className="text-sm text-black mt-1">For jeepney drivers</div>
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
                        <div className="font-medium text-black">Operator</div>
                        <div className="text-sm text-black mt-1">For jeepney operators</div>
                      </button>
                    </div>
                    {!role && (
                      <p className="mt-1 text-sm text-red-600">{errors.role?.message || 'Please select a role'}</p>
                    )}
                  </div>
                  
                  {/* Address fields for both roles in Step 1 */}
                  <div className="md:col-span-2">
                    <h4 className="text-md font-semibold text-black mb-3">Address Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-black mb-1">
                          House No.
                        </label>
                        <input
                          type="text"
                          {...register(role === 'Driver' ? 'driverHouseNumber' : 'operatorHouseNumber', {
                            pattern: {
                              value: /^\d+$/,
                              message: 'House number must contain only numbers'
                            }
                          })}
                          className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black ${
                            (role === 'Driver' ? errors.driverHouseNumber : errors.operatorHouseNumber) ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Enter house number"
                          disabled={isSubmitting}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            setValue(role === 'Driver' ? 'driverHouseNumber' : 'operatorHouseNumber', value);
                          }}
                        />
                        {(role === 'Driver' ? errors.driverHouseNumber : errors.operatorHouseNumber) && (
                          <p className="mt-1 text-sm text-red-600">{(role === 'Driver' ? errors.driverHouseNumber : errors.operatorHouseNumber)?.message}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-black mb-1">
                          Block No.
                        </label>
                        <input
                          type="text"
                          {...register(role === 'Driver' ? 'driverBlockNumber' : 'operatorBlockNumber', {
                            pattern: {
                              value: /^\d+$/,
                              message: 'Block number must contain only numbers'
                            }
                          })}
                          className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black ${
                            (role === 'Driver' ? errors.driverBlockNumber : errors.operatorBlockNumber) ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Enter block number"
                          disabled={isSubmitting}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            setValue(role === 'Driver' ? 'driverBlockNumber' : 'operatorBlockNumber', value);
                          }}
                        />
                        {(role === 'Driver' ? errors.driverBlockNumber : errors.operatorBlockNumber) && (
                          <p className="mt-1 text-sm text-red-600">{(role === 'Driver' ? errors.driverBlockNumber : errors.operatorBlockNumber)?.message}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-black mb-1">
                          Lot No.
                        </label>
                        <input
                          type="text"
                          {...register(role === 'Driver' ? 'driverLotNumber' : 'operatorLotNumber', {
                            pattern: {
                              value: /^\d+$/,
                              message: 'Lot number must contain only numbers'
                            }
                          })}
                          className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black ${
                            (role === 'Driver' ? errors.driverLotNumber : errors.operatorLotNumber) ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Enter lot number"
                          disabled={isSubmitting}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            setValue(role === 'Driver' ? 'driverLotNumber' : 'operatorLotNumber', value);
                          }}
                        />
                        {(role === 'Driver' ? errors.driverLotNumber : errors.operatorLotNumber) && (
                          <p className="mt-1 text-sm text-red-600">{(role === 'Driver' ? errors.driverLotNumber : errors.operatorLotNumber)?.message}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-black mb-1">
                          Street <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          {...register(role === 'Driver' ? 'driverStreet' : 'operatorStreet', { 
                            required: 'Street is required',
                            pattern: {
                              value: /^[A-Za-z0-9\s\-\.\,\'\(\)\/]+$/,
                              message: 'Street can contain letters, numbers, spaces, hyphens, periods, commas, apostrophes, parentheses, and slashes'
                            }
                          })}
                          className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black ${
                            (role === 'Driver' ? errors.driverStreet : errors.operatorStreet) ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Enter street"
                          disabled={isSubmitting}
                        />
                        {(role === 'Driver' ? errors.driverStreet : errors.operatorStreet) && (
                          <p className="mt-1 text-sm text-red-600">{(role === 'Driver' ? errors.driverStreet : errors.operatorStreet)?.message}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-black mb-1">
                          Barangay <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          {...register(role === 'Driver' ? 'driverBarangay' : 'operatorBarangay', { 
                            required: 'Barangay is required',
                            pattern: {
                              value: /^[A-Za-z0-9\s\-\.\,\'\(\)\/]+$/,
                              message: 'Barangay can contain letters, numbers, spaces, hyphens, periods, commas, apostrophes, parentheses, and slashes'
                            }
                          })}
                          className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black ${
                            (role === 'Driver' ? errors.driverBarangay : errors.operatorBarangay) ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Enter barangay"
                          disabled={isSubmitting}
                        />
                        {(role === 'Driver' ? errors.driverBarangay : errors.operatorBarangay) && (
                          <p className="mt-1 text-sm text-red-600">{(role === 'Driver' ? errors.driverBarangay : errors.operatorBarangay)?.message}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-black mb-1">
                          City <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          {...register(role === 'Driver' ? 'driverCity' : 'operatorCity', { 
                            required: 'City is required',
                            pattern: {
                              value: /^[A-Za-z0-9\s\-\.\,\'\(\)\/]+$/,
                              message: 'City can contain letters, numbers, spaces, hyphens, periods, commas, apostrophes, parentheses, and slashes'
                            }
                          })}
                          className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black ${
                            (role === 'Driver' ? errors.driverCity : errors.operatorCity) ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Enter city"
                          disabled={isSubmitting}
                        />
                        {(role === 'Driver' ? errors.driverCity : errors.operatorCity) && (
                          <p className="mt-1 text-sm text-red-600">{(role === 'Driver' ? errors.driverCity : errors.operatorCity)?.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-end pt-4 gap-3">
                  <button
                    type="button"
                    onClick={nextStep}
                    disabled={!role || isSubmitting}
                    className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    Next: Role Details
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Role-specific Information */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-black">
                  {role} Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-black mb-1">
                      License Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      {...register(role === 'Driver' ? 'driverLicenseNumber' : 'operatorLicenseNumber', { 
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
                        role === 'Driver' 
                          ? (errors.driverLicenseNumber ? 'border-red-500' : (licenseNumberValid === false ? 'border-red-500' : 'border-gray-300'))
                          : (errors.operatorLicenseNumber ? 'border-red-500' : (licenseNumberValid === false ? 'border-red-500' : 'border-gray-300'))
                      }`}
                      placeholder="Enter license number"
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow user to type freely but convert to uppercase
                        let processedValue = value.toUpperCase();
                                              
                        // Only allow valid characters: uppercase letters, digits, and hyphens
                        processedValue = processedValue.replace(/[^A-Z0-9-]/g, '');
                                              
                        // Auto-format by adding hyphens at appropriate positions
                        // Format: A12-34-567890 (13 characters)
                        if (processedValue.length >= 3 && processedValue.charAt(3) !== '-' && processedValue.charAt(1) && processedValue.charAt(2)) {
                          // Add first hyphen after 3rd character if positions 1 and 2 are digits
                          if (/^\d$/.test(processedValue.charAt(1)) && /^\d$/.test(processedValue.charAt(2))) {
                            processedValue = processedValue.substring(0, 3) + '-' + processedValue.substring(3);
                          }
                        }
                        if (processedValue.length >= 7 && processedValue.charAt(6) !== '-' && processedValue.charAt(4) && processedValue.charAt(5)) {
                          // Add second hyphen after 6th character if positions 4 and 5 are digits
                          if (/^\d$/.test(processedValue.charAt(4)) && /^\d$/.test(processedValue.charAt(5))) {
                            processedValue = processedValue.substring(0, 6) + '-' + processedValue.substring(6);
                          }
                        }
                                              
                        // Clean up any extra characters beyond 13
                        processedValue = processedValue.substring(0, 13);
                                              
                        // Update the form value
                        setValue(role === 'Driver' ? 'driverLicenseNumber' : 'operatorLicenseNumber', processedValue);
                                              
                        // Real-time validation
                        const isValid = /^[A-Z]\d{2}-\d{2}-\d{6}$/.test(processedValue);
                        // Only set validation status to true/false when we have exactly 13 characters
                        // Otherwise set to null (not yet validated or too short)
                        if (processedValue.length === 13) {
                          setLicenseNumberValid(isValid);
                        } else {
                          setLicenseNumberValid(null);
                        }
                      }}
                      disabled={isSubmitting}
                      maxLength={13}
                    />
                    {role === 'Driver' && errors.driverLicenseNumber && (
                      <p className="mt-1 text-sm text-red-600">{errors.driverLicenseNumber.message}</p>
                    )}
                    {role === 'Operator' && errors.operatorLicenseNumber && (
                      <p className="mt-1 text-sm text-red-600">{errors.operatorLicenseNumber.message}</p>
                    )}
                    {/* Show real-time validation error if the format is invalid */}
                    {((role === 'Driver' && !errors.driverLicenseNumber && licenseNumberValid === false) || 
                      (role === 'Operator' && !errors.operatorLicenseNumber && licenseNumberValid === false)) && (
                      <p className="mt-1 text-sm text-red-600">Invalid license number format. Use A12-34-567890.</p>
                    )}
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-black mb-1">
                      TIN ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      {...register(role === 'Driver' ? 'driverTinId' : 'operatorTinId', { 
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
                        role === 'Driver' 
                          ? (errors.driverTinId ? 'border-red-500' : 'border-gray-300')
                          : (errors.operatorTinId ? 'border-red-500' : 'border-gray-300')
                      }`}
                      placeholder="Enter TIN ID"
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow only digits and hyphens
                        let processedValue = value.replace(/[^0-9-]/g, '');
                                              
                        // Auto-format with hyphens: XXX-XXX-XXX-XXXXX
                        if (processedValue.length >= 3 && processedValue.charAt(3) !== '-') {
                          processedValue = processedValue.substring(0, 3) + '-' + processedValue.substring(3);
                        }
                        if (processedValue.length >= 7 && processedValue.charAt(7) !== '-') {
                          processedValue = processedValue.substring(0, 7) + '-' + processedValue.substring(7);
                        }
                        if (processedValue.length >= 11 && processedValue.charAt(11) !== '-') {
                          processedValue = processedValue.substring(0, 11) + '-' + processedValue.substring(11);
                        }
                                              
                        // Prevent overflow beyond maximum length (17 characters)
                        processedValue = processedValue.substring(0, 17);
                                              
                        // Update the form value
                        setValue(role === 'Driver' ? 'driverTinId' : 'operatorTinId', processedValue);
                      }}
                      disabled={isSubmitting}
                      maxLength={17}
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
                        <label className="block text-sm font-medium text-black mb-1">
                          Number of Jeepneys <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          {...register('numberOfJeepneys', { 
                            required: 'Number of jeepneys is required',
                            valueAsNumber: true,
                            min: {
                              value: 1,
                              message: 'At least 1 jeepney is required'
                            },
                            max: {
                              value: 50,
                              message: 'Maximum number of jeepneys exceeded (50 max)'
                            }
                          })}
                          className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black ${
                            errors.numberOfJeepneys ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Enter number of jeepneys"
                          min="1"
                          max="50"
                        />
                        {errors.numberOfJeepneys && (
                          <p className="mt-1 text-sm text-red-600">{errors.numberOfJeepneys.message}</p>
                        )}
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-black mb-1">
                          Jeepney Plate Number(s) <span className="text-red-500">*</span>
                        </label>
                        {numberOfJeepneys && numberOfJeepneys > 0 ? (
                          <div className="space-y-3">
                            {Array.from({ length: numberOfJeepneys }).map((_, index) => (
                              <div key={index}>
                                <label className="block text-sm text-black mb-1">Jeepney {index + 1} Plate Number</label>
                                <input
                                  type="text"
                                  {...register(`plateNumbers.${index}` as keyof FormData, {
                                    required: 'Plate number is required',
                                    pattern: {
                                      value: /^[A-Z0-9\-\s]+$/i,
                                      message: 'Plate number can only contain letters, numbers, hyphens, and spaces'
                                    },
                                    minLength: {
                                      value: 3,
                                      message: 'Plate number is too short'
                                    },
                                    maxLength: {
                                      value: 10,
                                      message: 'Plate number is too long'
                                    }
                                  })}
                                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black ${
                                    errors.plateNumbers && errors.plateNumbers[index] ? 'border-red-500' : 'border-gray-300'
                                  }`}
                                  placeholder={`Enter plate number for jeepney ${index + 1}`}
                                />
                                {errors.plateNumbers && errors.plateNumbers[index] && (
                                  <p className="mt-1 text-sm text-red-600">{errors.plateNumbers[index]?.message}</p>
                                )}
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
                
                <div className="flex flex-col sm:flex-row justify-between pt-4 gap-3">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="w-full sm:w-auto px-6 py-3 border border-gray-300 text-black rounded-lg hover:bg-gray-50 transition-colors order-2 sm:order-1"
                    disabled={isSubmitting}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={nextStep}
                    className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors order-1 sm:order-2"
                    disabled={isSubmitting}
                  >
                    Next: Confirmation
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Confirmation & Payment Details */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-black">Confirm Member Information & Payment</h3>
                
                {/* Validate all fields before allowing submission */}
                {Object.keys(errors).length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-700 font-medium">Please complete all required fields to proceed.</p>
                    <ul className="mt-2 text-red-600 text-sm list-disc pl-5 space-y-1">
                      {Object.entries(errors).map(([field, error]) => (
                        <li key={field}>{field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: {error.message}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-black">Personal Information</h4>
                      <div className="mt-2 space-y-1 text-sm">
                        <p className="text-black"><span className="font-medium">Name:</span> {watch('firstName')} {watch('middleName')} {watch('lastName')} {watch('suffix')}</p>
                        <p className="text-black"><span className="font-medium">Email:</span> {watch('email')}</p>
                        <p className="text-black"><span className="font-medium">Phone:</span> {watch('phoneNumber')}</p>
                        <p className="text-black"><span className="font-medium">Birthdate:</span> {watch('birthdate')}</p>
                        <p className="text-black"><span className="font-medium">Age:</span> {watch('age')}</p>
                        <p className="text-black"><span className="font-medium">Role:</span> {watch('role')}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-black">Address Information</h4>
                      <div className="mt-2 space-y-1 text-sm">
                        <p className="text-black"><span className="font-medium">House No.:</span> {role === 'Driver' ? watch('driverHouseNumber') : watch('operatorHouseNumber')}</p>
                        <p className="text-black"><span className="font-medium">Block No.:</span> {role === 'Driver' ? watch('driverBlockNumber') : watch('operatorBlockNumber')}</p>
                        <p className="text-black"><span className="font-medium">Lot No.:</span> {role === 'Driver' ? watch('driverLotNumber') : watch('operatorLotNumber')}</p>
                        <p className="text-black"><span className="font-medium">Street:</span> {role === 'Driver' ? watch('driverStreet') : watch('operatorStreet')}</p>
                        <p className="text-black"><span className="font-medium">Barangay:</span> {role === 'Driver' ? watch('driverBarangay') : watch('operatorBarangay')}</p>
                        <p className="text-black"><span className="font-medium">City:</span> {role === 'Driver' ? watch('driverCity') : watch('operatorCity')}</p>
                      </div>
                    </div>
                    
                    {role === 'Driver' && (
                      <div>
                        <h4 className="font-medium text-black">Driver Information</h4>
                        <div className="mt-2 space-y-1 text-sm">
                          <p className="text-black"><span className="font-medium">License:</span> {watch('driverLicenseNumber')}</p>
                          <p className="text-black"><span className="font-medium">TIN ID:</span> {watch('driverTinId')}</p>
                        </div>
                      </div>
                    )}
                    
                    {role === 'Operator' && (
                      <div>
                        <h4 className="font-medium text-black">Operator Information</h4>
                        <div className="mt-2 space-y-1 text-sm">
                          <p className="text-black"><span className="font-medium">License:</span> {watch('operatorLicenseNumber')}</p>
                          <p className="text-black"><span className="font-medium">TIN ID:</span> {watch('operatorTinId')}</p>
                          <p className="text-black"><span className="font-medium">Jeepneys:</span> {watch('numberOfJeepneys')}</p>
                          <div>
                            <span className="font-medium text-black">Plate Numbers:</span>
                            <div className="ml-2">
                              {Array.isArray(watch('plateNumbers')) && 
                                watch('plateNumbers')?.map((plate: string, index: number) => (
                                  <p key={index} className="text-black">Jeepney {index + 1}: {plate}</p>
                                ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <h4 className="font-medium text-black mb-3">Payment Details & Certificate</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    After confirming, you will be able to preview and generate the member&apos;s share certificate.
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-black">Selected Role:</span>
                      <span className="font-medium text-black">{watch('role')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black">Membership Fee:</span>
                      <span className="font-medium text-black">
                        {systemSettings ? formatCurrency(systemSettings.membershipPayment) : '₱1,500.00'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black">Payment Method:</span>
                      <span className="font-medium text-black">Cash only</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="text-black">Total Fee:</span>
                        <span className="font-medium text-black">
                          {systemSettings ? formatCurrency(systemSettings.membershipPayment) : '₱1,500.00'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Control Number Input */}
                    <div className="pt-3 mt-3 border-t border-gray-200">
                      <label className="block text-sm font-medium text-black mb-1">
                        Receipt Control Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={controlNumber}
                        onChange={(e) => setControlNumber(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black"
                        placeholder="Enter receipt control number"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-between pt-4 gap-3">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="w-full sm:w-auto px-6 py-3 border border-gray-300 text-black rounded-lg hover:bg-gray-50 transition-colors order-2 sm:order-1"
                    disabled={isSubmitting}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className={`w-full sm:w-auto px-6 py-3 rounded-lg transition-colors flex items-center justify-center order-1 sm:order-2 ${
                      Object.keys(errors).length === 0 && !isSubmitting && controlNumber.trim() !== ''
                        ? 'bg-red-600 text-white hover:bg-red-700' 
                        : 'bg-gray-400 text-white cursor-not-allowed'
                    }`}
                    disabled={Object.keys(errors).length > 0 || isSubmitting || controlNumber.trim() === ''}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : 'Confirm & Submit'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Certificate Preview Modal */}
      <CertificatePreviewModal
        isOpen={showCertificatePreview}
        onClose={handleCloseCertificatePreview}
        onConfirm={handleGenerateCertificate}
        memberData={registeredMemberData}
        isGenerating={isGeneratingCertificate}
      />
    </div>
  );
}