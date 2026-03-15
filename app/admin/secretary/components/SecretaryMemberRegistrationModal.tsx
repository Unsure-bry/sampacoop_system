'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { sendMemberRegistrationEmail } from '@/lib/emailService';
import { createLinkedUserMember, checkEmailExists } from '@/lib/userMemberService';
import { generateAndSendCertificate } from '@/lib/certificateService';
import CertificatePreviewModal from '@/components/admin/CertificatePreviewModal';
import { FileText, CheckCircle } from 'lucide-react';

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
  driverStreet?: string;
  driverBarangay?: string;
  driverCity?: string;
  operatorLicenseNumber?: string;
  operatorTinId?: string;
  operatorStreet?: string;
  operatorBarangay?: string;
  operatorCity?: string;
  numberOfJeepneys?: number;
  plateNumbers?: string[];
}

interface SecretaryMemberRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMemberAdded: () => void;
}

export default function SecretaryMemberRegistrationModal({
  isOpen,
  onClose,
  onMemberAdded
}: SecretaryMemberRegistrationModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [role, setRole] = useState<'Driver' | 'Operator' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredMember, setRegisteredMember] = useState<any>(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [isGeneratingCertificate, setIsGeneratingCertificate] = useState(false);
  
  const { register, handleSubmit, watch, setValue, formState: { errors }, reset, trigger } = useForm<FormData>();

  const totalSteps = 3;

  useEffect(() => {
    if (!isOpen) {
      reset();
      setCurrentStep(1);
      setRole(null);
      setRegisteredMember(null);
      setShowCertificateModal(false);
    }
  }, [isOpen, reset]);

  const handleRoleChange = (selectedRole: 'Driver' | 'Operator') => {
    setRole(selectedRole);
    setValue('role', selectedRole, { shouldValidate: true });
  };

  const validateStep = async () => {
    let fieldsToValidate: (keyof FormData)[] = [];
    
    if (currentStep === 1) {
      fieldsToValidate = ['firstName', 'lastName', 'email', 'phoneNumber', 'birthdate', 'role'];
      if (role === 'Driver') {
        fieldsToValidate.push('driverStreet', 'driverBarangay', 'driverCity');
      } else if (role === 'Operator') {
        fieldsToValidate.push('operatorStreet', 'operatorBarangay', 'operatorCity');
      }
    } else if (currentStep === 2) {
      if (role === 'Driver') {
        fieldsToValidate = ['driverLicenseNumber', 'driverTinId'];
      } else if (role === 'Operator') {
        fieldsToValidate = ['operatorLicenseNumber', 'operatorTinId'];
      }
    }
    
    return await trigger(fieldsToValidate);
  };

  const handleNext = async () => {
    const isValid = await validateStep();
    if (isValid && currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    
    try {
      // Check email uniqueness
      const normalizedEmail = data.email.toLowerCase();
      const emailExists = await checkEmailExists(normalizedEmail);
      if (emailExists) {
        toast.error('This email address is already registered.');
        setIsSubmitting(false);
        return;
      }

      // Prepare driver/operator info
      const driverInfo = data.role === 'Driver' ? {
        licenseNumber: data.driverLicenseNumber || '',
        tinId: data.driverTinId || '',
        street: data.driverStreet || '',
        barangay: data.driverBarangay || '',
        city: data.driverCity || ''
      } : null;

      const operatorInfo = data.role === 'Operator' ? {
        licenseNumber: data.operatorLicenseNumber || '',
        tinId: data.operatorTinId || '',
        street: data.operatorStreet || '',
        barangay: data.operatorBarangay || '',
        city: data.operatorCity || '',
        numberOfJeepneys: data.numberOfJeepneys || 0,
        plateNumbers: data.plateNumbers || []
      } : null;

      // Create linked user-member records
      const { success, userId, error } = await createLinkedUserMember({
        email: normalizedEmail,
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName,
        suffix: data.suffix,
        role: data.role,
        phoneNumber: data.phoneNumber,
        birthdate: data.birthdate,
        driverInfo,
        operatorInfo,
        paymentInfo: {
          membershipFee: 1500,
          paymentMethod: 'Cash',
          status: 'PAID',
          totalFee: 1500,
          amountPaid: 1500,
          remainingBalance: 0
        }
      });

      if (success && userId) {
        // Fetch the created member data
        const memberResult = await firestore.getDocument('members', userId);
        if (memberResult.success && memberResult.data) {
          const memberData = {
            ...memberResult.data,
            id: userId,
            firstName: data.firstName,
            lastName: data.lastName,
            middleName: data.middleName,
            suffix: data.suffix,
            role: data.role,
            email: normalizedEmail,
            phoneNumber: data.phoneNumber,
            createdAt: new Date().toISOString(),
            driverInfo,
            operatorInfo
          };
          
          setRegisteredMember(memberData);
          
          // Send welcome email
          await sendMemberRegistrationEmail(normalizedEmail, `${data.firstName} ${data.lastName}`);
          
          toast.success('Member registered successfully! Proceed to certificate generation.');
          
          // Move to certificate step
          setCurrentStep(3);
        }
      } else {
        toast.error(error || 'Failed to register member.');
      }
    } catch (error) {
      console.error('Error registering member:', error);
      toast.error('An error occurred during registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateCertificate = async (certificateData: any) => {
    if (!registeredMember) return;
    
    setIsGeneratingCertificate(true);
    
    try {
      const result = await generateAndSendCertificate(registeredMember, {
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
        toast.success('Certificate generated and sent successfully!', {
          duration: 5000,
          icon: '✅'
        });
        setShowCertificateModal(false);
        onMemberAdded();
        onClose();
      } else {
        toast.error(result.error || 'Failed to generate certificate');
      }
    } catch (error) {
      console.error('Error generating certificate:', error);
      toast.error('An error occurred while generating certificate');
    } finally {
      setIsGeneratingCertificate(false);
    }
  };

  const handleSkipCertificate = () => {
    toast('Certificate generation skipped. You can generate it later from member records.', {
      duration: 4000,
      icon: 'ℹ️'
    });
    onMemberAdded();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Add New Member</h2>
              <button 
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
                disabled={isSubmitting || isGeneratingCertificate}
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
                  
                  {/* Role Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Membership Type <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => handleRoleChange('Driver')}
                        className={`p-4 border-2 rounded-lg text-center transition-colors ${
                          role === 'Driver'
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-gray-200 hover:border-red-300'
                        }`}
                      >
                        <div className="font-semibold">Driver</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRoleChange('Operator')}
                        className={`p-4 border-2 rounded-lg text-center transition-colors ${
                          role === 'Operator'
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-gray-200 hover:border-red-300'
                        }`}
                      >
                        <div className="font-semibold">Operator</div>
                      </button>
                    </div>
                    {errors.role && (
                      <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
                    )}
                  </div>

                  {/* Name Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                          errors.firstName ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter first name"
                        disabled={isSubmitting}
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
                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                          errors.lastName ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter last name"
                        disabled={isSubmitting}
                      />
                      {errors.lastName && (
                        <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                          errors.suffix ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="e.g., Jr., Sr., III"
                        disabled={isSubmitting}
                      />
                      {errors.suffix && (
                        <p className="mt-1 text-sm text-red-600">{errors.suffix.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
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
                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                          errors.phoneNumber ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter phone number"
                        disabled={isSubmitting}
                        maxLength={11}
                      />
                      {errors.phoneNumber && (
                        <p className="mt-1 text-sm text-red-600">{errors.phoneNumber.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Birthdate */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                          errors.birthdate ? 'border-red-500' : 'border-gray-300'
                        }`}
                        disabled={isSubmitting}
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

                  {/* Address Fields based on Role */}
                  {role === 'Driver' && (
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-700">Driver Address</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Street <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            {...register('driverStreet', { 
                              required: 'Street is required',
                              pattern: {
                                value: /^[A-Za-z0-9\s\-\.,]+$/,
                                message: 'Street can only contain letters, numbers, spaces, hyphens, periods, and commas'
                              }
                            })}
                            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                              errors.driverStreet ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="Street"
                            disabled={isSubmitting}
                          />
                          {errors.driverStreet && (
                            <p className="mt-1 text-sm text-red-600">{errors.driverStreet.message}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Barangay <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            {...register('driverBarangay', { 
                              required: 'Barangay is required',
                              pattern: {
                                value: /^[A-Za-z\s\-]+$/,
                                message: 'Barangay can only contain letters, spaces, and hyphens'
                              }
                            })}
                            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                              errors.driverBarangay ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="Barangay"
                            disabled={isSubmitting}
                          />
                          {errors.driverBarangay && (
                            <p className="mt-1 text-sm text-red-600">{errors.driverBarangay.message}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            City <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            {...register('driverCity', { 
                              required: 'City is required',
                              pattern: {
                                value: /^[A-Za-z\s\-]+$/,
                                message: 'City can only contain letters, spaces, and hyphens'
                              }
                            })}
                            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                              errors.driverCity ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="City"
                            disabled={isSubmitting}
                          />
                          {errors.driverCity && (
                            <p className="mt-1 text-sm text-red-600">{errors.driverCity.message}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {role === 'Operator' && (
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-700">Operator Address</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Street <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            {...register('operatorStreet', { 
                              required: 'Street is required',
                              pattern: {
                                value: /^[A-Za-z0-9\s\-\.,]+$/,
                                message: 'Street can only contain letters, numbers, spaces, hyphens, periods, and commas'
                              }
                            })}
                            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                              errors.operatorStreet ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="Street"
                            disabled={isSubmitting}
                          />
                          {errors.operatorStreet && (
                            <p className="mt-1 text-sm text-red-600">{errors.operatorStreet.message}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Barangay <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            {...register('operatorBarangay', { 
                              required: 'Barangay is required',
                              pattern: {
                                value: /^[A-Za-z\s\-]+$/,
                                message: 'Barangay can only contain letters, spaces, and hyphens'
                              }
                            })}
                            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                              errors.operatorBarangay ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="Barangay"
                            disabled={isSubmitting}
                          />
                          {errors.operatorBarangay && (
                            <p className="mt-1 text-sm text-red-600">{errors.operatorBarangay.message}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            City <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            {...register('operatorCity', { 
                              required: 'City is required',
                              pattern: {
                                value: /^[A-Za-z\s\-]+$/,
                                message: 'City can only contain letters, spaces, and hyphens'
                              }
                            })}
                            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                              errors.operatorCity ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="City"
                            disabled={isSubmitting}
                          />
                          {errors.operatorCity && (
                            <p className="mt-1 text-sm text-red-600">{errors.operatorCity.message}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Footer Navigation */}
                  <div className="flex justify-end pt-4">
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={!role}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      Next: Role Details
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Additional Information */}
              {currentStep === 2 && role === 'Driver' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-800">Driver Information</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        License Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        {...register('driverLicenseNumber', { 
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
                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                          errors.driverLicenseNumber ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter license number (A12-34-567890)"
                        disabled={isSubmitting}
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
                          if (processedValue.length >= 6 && processedValue.charAt(6) !== '-') {
                            processedValue = processedValue.substring(0, 6) + '-' + processedValue.substring(6);
                          }
                          if (processedValue.length > 13) {
                            processedValue = processedValue.substring(0, 13);
                          }
                          e.target.value = processedValue;
                        }}
                      />
                      {errors.driverLicenseNumber && (
                        <p className="mt-1 text-sm text-red-600">{errors.driverLicenseNumber.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        TIN ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        {...register('driverTinId', { 
                          required: 'TIN ID is required',
                          pattern: {
                            value: /^\d{3}-\d{3}-\d{3}-\d{3}$/,
                            message: 'Invalid TIN format. Use 123-456-789-000'
                          }
                        })}
                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                          errors.driverTinId ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter TIN ID (123-456-789-000)"
                        disabled={isSubmitting}
                        maxLength={15}
                        onChange={(e) => {
                          const value = e.target.value;
                          let processedValue = value.replace(/[^0-9-]/g, '');
                          if (processedValue.length > 3 && processedValue.charAt(3) !== '-') {
                            processedValue = processedValue.substring(0, 3) + '-' + processedValue.substring(3);
                          }
                          if (processedValue.length > 7 && processedValue.charAt(7) !== '-') {
                            processedValue = processedValue.substring(0, 7) + '-' + processedValue.substring(7);
                          }
                          if (processedValue.length > 11 && processedValue.charAt(11) !== '-') {
                            processedValue = processedValue.substring(0, 11) + '-' + processedValue.substring(11);
                          }
                          if (processedValue.length > 15) {
                            processedValue = processedValue.substring(0, 15);
                          }
                          e.target.value = processedValue;
                        }}
                      />
                      {errors.driverTinId && (
                        <p className="mt-1 text-sm text-red-600">{errors.driverTinId.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Footer Navigation */}
                  <div className="flex justify-between pt-4">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        'Confirm & Submit'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {currentStep === 2 && role === 'Operator' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-800">Operator Information</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        License Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        {...register('operatorLicenseNumber', { 
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
                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                          errors.operatorLicenseNumber ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter license number (A12-34-567890)"
                        disabled={isSubmitting}
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
                          if (processedValue.length >= 6 && processedValue.charAt(6) !== '-') {
                            processedValue = processedValue.substring(0, 6) + '-' + processedValue.substring(6);
                          }
                          if (processedValue.length > 13) {
                            processedValue = processedValue.substring(0, 13);
                          }
                          e.target.value = processedValue;
                        }}
                      />
                      {errors.operatorLicenseNumber && (
                        <p className="mt-1 text-sm text-red-600">{errors.operatorLicenseNumber.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        TIN ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        {...register('operatorTinId', { 
                          required: 'TIN ID is required',
                          pattern: {
                            value: /^\d{3}-\d{3}-\d{3}-\d{3}$/,
                            message: 'Invalid TIN format. Use 123-456-789-000'
                          }
                        })}
                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                          errors.operatorTinId ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter TIN ID (123-456-789-000)"
                        disabled={isSubmitting}
                        maxLength={15}
                        onChange={(e) => {
                          const value = e.target.value;
                          let processedValue = value.replace(/[^0-9-]/g, '');
                          if (processedValue.length > 3 && processedValue.charAt(3) !== '-') {
                            processedValue = processedValue.substring(0, 3) + '-' + processedValue.substring(3);
                          }
                          if (processedValue.length > 7 && processedValue.charAt(7) !== '-') {
                            processedValue = processedValue.substring(0, 7) + '-' + processedValue.substring(7);
                          }
                          if (processedValue.length > 11 && processedValue.charAt(11) !== '-') {
                            processedValue = processedValue.substring(0, 11) + '-' + processedValue.substring(11);
                          }
                          if (processedValue.length > 15) {
                            processedValue = processedValue.substring(0, 15);
                          }
                          e.target.value = processedValue;
                        }}
                      />
                      {errors.operatorTinId && (
                        <p className="mt-1 text-sm text-red-600">{errors.operatorTinId.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Number of Jeepneys
                    </label>
                    <input
                      type="number"
                      {...register('numberOfJeepneys', { valueAsNumber: true })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="Enter number of jeepneys"
                    />
                  </div>

                  {/* Footer Navigation */}
                  <div className="flex justify-between pt-4">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        'Confirm & Submit'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Certificate Generation */}
              {currentStep === 3 && registeredMember && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">
                      Member Registered Successfully!
                    </h3>
                    <p className="text-gray-600">
                      {registeredMember.firstName} {registeredMember.lastName} has been registered.
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      Membership Certificate
                    </h4>
                    <p className="text-gray-600 mb-4">
                      Generate an official membership certificate for the newly registered member. 
                      The certificate will be sent to their email address.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        onClick={() => setShowCertificateModal(true)}
                        className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                      >
                        <FileText className="h-5 w-5 mr-2" />
                        Generate Certificate
                      </button>
                      <button
                        type="button"
                        onClick={handleSkipCertificate}
                        className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Skip for Now
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Certificate Preview Modal */}
      <CertificatePreviewModal
        isOpen={showCertificateModal}
        onClose={() => setShowCertificateModal(false)}
        onConfirm={handleGenerateCertificate}
        memberData={registeredMember}
        isGenerating={isGeneratingCertificate}
      />
    </>
  );
}
