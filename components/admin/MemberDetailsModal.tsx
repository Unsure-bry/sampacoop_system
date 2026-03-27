'use client';

import { useEffect, useState } from 'react';
import { Member } from '@/lib/types/member';
import { firestore } from '@/lib/firebase';

export default function MemberDetailsModal({ 
  member, 
  isOpen, 
  onClose
}: { 
  member: Member | null; 
  isOpen: boolean; 
  onClose: () => void;
}) {
  const [isClient, setIsClient] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isClient || !isOpen || !member) return null;

  // Debug: Log member certificate data
  console.log('MemberDetailsModal - member:', member);
  console.log('MemberDetailsModal - shareCertificate:', member.shareCertificate);
  console.log('MemberDetailsModal - shareCertificateGenerated:', member.shareCertificateGenerated);

  const getFullName = () => {
    return `${member.firstName} ${member.middleName ? member.middleName + ' ' : ''}${member.lastName}${member.suffix ? ' ' + member.suffix : ''}`;
  };

  const getAddress = () => {
    const addressInfo = member.role === 'Driver' ? member.driverInfo : member.operatorInfo;
    if (!addressInfo) return 'N/A';
    
    const parts = [
      addressInfo.houseNumber,
      addressInfo.blockNumber,
      addressInfo.lotNumber,
      addressInfo.street,
      addressInfo.barangay,
      addressInfo.city
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-black">Member Details</h2>
            <button 
              onClick={onClose}
              className="text-black hover:text-gray-700"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-semibold text-black mb-3">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-black">Full Name</p>
                  <p className="font-medium text-black">{getFullName()}</p>
                </div>
                <div>
                  <p className="text-sm text-black">Role</p>
                  <p className="font-medium text-black">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      {member.role}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-black">Email</p>
                  <p className="font-medium text-black">{member.email}</p>
                </div>
                <div>
                  <p className="text-sm text-black">Phone Number</p>
                  <p className="font-medium text-black">{member.phoneNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-black">Birthdate</p>
                  <p className="font-medium text-black">{member.birthdate ? new Date(member.birthdate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-black">Age</p>
                  <p className="font-medium text-black">
                    {member.birthdate ? (() => {
                      const birthDate = new Date(member.birthdate);
                      const today = new Date();
                      let age = today.getFullYear() - birthDate.getFullYear();
                      const monthDiff = today.getMonth() - birthDate.getMonth();
                      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                        age--;
                      }
                      return age > 0 ? `${age} years old` : 'Less than 1 year';
                    })() : (member.age ? `${member.age} years old` : 'N/A')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-black">Status</p>
                  <p className="font-medium text-black">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      member.archived 
                        ? 'bg-gray-100 text-gray-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {member.archived ? 'Archived' : (member.status || 'Active')}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-black">Member Since</p>
                  <p className="font-medium text-black">{new Date(member.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div>
              <h3 className="text-lg font-semibold text-black mb-3">Address Information</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium text-black">{getAddress()}</p>
              </div>
            </div>

            {/* Beneficiary Information */}
            {member.beneficiaries && member.beneficiaries.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-black mb-3">Beneficiary Information</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  {member.beneficiaries.map((beneficiary: any, index: number) => (
                    <div key={index} className="border-b border-gray-200 last:border-0 pb-3 last:pb-0">
                      <p className="text-sm text-black font-medium mb-2">Beneficiary {index + 1}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <p className="text-sm text-black">Full Name</p>
                          <p className="font-medium text-black">
                            {beneficiary.firstName} {beneficiary.middleName ? beneficiary.middleName + ' ' : ''}{beneficiary.lastName}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-black">Relationship</p>
                          <p className="font-medium text-black">{beneficiary.relationship}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Role-specific Information */}
            {member.role === 'Driver' && member.driverInfo && (
              <div>
                <h3 className="text-lg font-semibold text-black mb-3">Driver Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-black">License Number</p>
                    <p className="font-medium text-black">{member.driverInfo.licenseNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-black">TIN ID</p>
                    <p className="font-medium text-black">{member.driverInfo.tinId}</p>
                  </div>
                </div>
              </div>
            )}

            {member.role === 'Operator' && member.operatorInfo && (
              <div>
                <h3 className="text-lg font-semibold text-black mb-3">Operator Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-black">License Number</p>
                    <p className="font-medium text-black">{member.operatorInfo.licenseNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-black">TIN ID</p>
                    <p className="font-medium text-black">{member.operatorInfo.tinId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-black">Number of Jeepneys</p>
                    <p className="font-medium text-black">{member.operatorInfo.numberOfJeepneys}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-black">Jeepney Plate Numbers</p>
                    <div className="mt-2">
                      {(() => {
                        // Safely handle plateNumbers which might not be an array
                        const plateNumbersArray = Array.isArray(member.operatorInfo?.plateNumbers)
                          ? member.operatorInfo.plateNumbers
                          : member.operatorInfo?.plateNumbers
                          ? [member.operatorInfo.plateNumbers]
                          : [];
                        
                        return plateNumbersArray.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {plateNumbersArray.map((plate, index) => (
                              <span key={index} className="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm text-black">
                                {plate}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-black">No plate numbers provided</p>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Certificate Section */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-black">Share Certificate</h3>
              <button
                onClick={async () => {
                  // Toggle the certificate view
                  setShowCertificate(!showCertificate);
                }}
                className={`px-4 py-2 rounded-lg hover:transition-colors ${
                  member.shareCertificateGenerated || member.certificateGenerated
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-400 text-white cursor-not-allowed'
                }`}
                disabled={!member.shareCertificateGenerated && !member.certificateGenerated}
              >
                {showCertificate ? 'Hide Certificate' : 'View Certificate'}
              </button>
            </div>
            
            {showCertificate && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-300">
                {/* Certificate Visual Display */}
                <div className="flex justify-center mb-4">
                  <div 
                    className="relative bg-white shadow-xl"
                    style={{ 
                      width: '100%',
                      maxWidth: '800px',
                      aspectRatio: '800 / 566',
                      backgroundImage: 'url(/SAMPA%20TRANSPORT%20SERVICE%20COOPERATIVE.png)',
                      backgroundSize: 'contain',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                    }}
                  >
                    {/* Text Overlays - Using certificate data from Firestore */}
                    <div className="absolute inset-0">
                      {/* Full Name */}
                      <div
                        className="absolute text-center font-serif font-bold text-gray-900"
                        style={{
                          top: '31%',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '50%',
                          fontSize: 'clamp(14px, 3vw, 22px)',
                        }}
                      >
                        {member.shareCertificate?.fullName || `${member.firstName} ${member.middleName || ''} ${member.lastName} ${member.suffix || ''}`.trim()}
                      </div>

                      {/* Share Capital Amount */}
                      <div
                        className="absolute font-serif font-semibold text-gray-900 text-center"
                        style={{
                          top: '38%',
                          left: '26%',
                          width: '15%',
                          fontSize: 'clamp(12px, 2.5vw, 18px)',
                        }}
                      >
                        {member.shareCertificate?.shares ? `₱${Number(member.shareCertificate.shares).toLocaleString('en-PH')}` : '₱100'}
                      </div>

                      {/* Day */}
                      <div
                        className="absolute font-serif text-gray-900 text-center"
                        style={{
                          top: '60%',
                          left: '19%',
                          width: '5%',
                          fontSize: 'clamp(10px, 2vw, 14px)',
                        }}
                      >
                        {member.shareCertificate?.issueDate 
                          ? new Date(member.shareCertificate.issueDate).getDate()
                          : new Date().getDate()}
                      </div>

                      {/* Month */}
                      <div
                        className="absolute font-serif text-gray-900 text-center"
                        style={{
                          top: '60%',
                          left: '34%',
                          width: '9%',
                          fontSize: 'clamp(10px, 2vw, 14px)',
                        }}
                      >
                        {member.shareCertificate?.issueDate 
                          ? new Date(member.shareCertificate.issueDate).toLocaleString('en-US', { month: 'long' })
                          : new Date().toLocaleString('en-US', { month: 'long' })}
                      </div>

                      {/* Year */}
                      <div
                        className="absolute font-serif text-gray-900 text-center"
                        style={{
                          top: '60%',
                          left: '56%',
                          width: '7%',
                          fontSize: 'clamp(10px, 2vw, 14px)',
                        }}
                      >
                        {member.shareCertificate?.issueDate 
                          ? new Date(member.shareCertificate.issueDate).getFullYear()
                          : new Date().getFullYear()}
                      </div>

                      {/* Secretary Name */}
                      <div
                        className="absolute font-serif text-gray-900 text-center whitespace-nowrap"
                        style={{
                          top: '79%',
                          left: '20%',
                          width: '16%',
                          fontSize: 'clamp(8px, 1.5vw, 11px)',
                        }}
                      >
                        {member.shareCertificate?.secretaryName || ''}
                      </div>

                      {/* Chairman Name */}
                      <div
                        className="absolute font-serif text-gray-900 text-center whitespace-nowrap"
                        style={{
                          top: '79%',
                          left: '65%',
                          width: '16%',
                          fontSize: 'clamp(8px, 1.5vw, 11px)',
                        }}
                      >
                        {member.shareCertificate?.chairmanName || ''}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Certificate Details Summary */}
                <div className="mb-4 bg-white p-4 rounded-lg border border-gray-200">
                  <h4 className="font-semibold text-black mb-2">Certificate Details</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-black">Certificate Number:</span>
                    <span className="font-medium text-black">{member.shareCertificate?.certificateNumber || 'N/A'}</span>
                    
                    <span className="text-black">Shares:</span>
                    <span className="font-medium text-black">{member.shareCertificate?.shares || 'N/A'}</span>
                    
                    <span className="text-black">Issue Date:</span>
                    <span className="font-medium text-black">
                      {member.shareCertificate?.issueDate 
                        ? new Date(member.shareCertificate.issueDate).toLocaleDateString()
                        : 'N/A'}
                    </span>
                    
                    <span className="text-black">Secretary:</span>
                    <span className="font-medium text-black">{member.shareCertificate?.secretaryName || 'N/A'}</span>
                    
                    <span className="text-black">Chairman:</span>
                    <span className="font-medium text-black">{member.shareCertificate?.chairmanName || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
            </div>
          </div>
        </div>
  );
}