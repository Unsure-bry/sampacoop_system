'use client';

import { useEffect, useState } from 'react';
import { Member } from '@/lib/types/member';

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
            <h2 className="text-2xl font-bold text-gray-800">Member Details</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Full Name</p>
                  <p className="font-medium">{getFullName()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Role</p>
                  <p className="font-medium">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      {member.role}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{member.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone Number</p>
                  <p className="font-medium">{member.phoneNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Birthdate</p>
                  <p className="font-medium">{member.birthdate}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Age</p>
                  <p className="font-medium">{member.age}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="font-medium">
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
                  <p className="text-sm text-gray-600">Member Since</p>
                  <p className="font-medium">{new Date(member.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Address Information</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium">{getAddress()}</p>
              </div>
            </div>

            {/* Role-specific Information */}
            {member.role === 'Driver' && member.driverInfo && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Driver Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">License Number</p>
                    <p className="font-medium">{member.driverInfo.licenseNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">TIN ID</p>
                    <p className="font-medium">{member.driverInfo.tinId}</p>
                  </div>
                </div>
              </div>
            )}

            {member.role === 'Operator' && member.operatorInfo && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Operator Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">License Number</p>
                    <p className="font-medium">{member.operatorInfo.licenseNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">TIN ID</p>
                    <p className="font-medium">{member.operatorInfo.tinId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Number of Jeepneys</p>
                    <p className="font-medium">{member.operatorInfo.numberOfJeepneys}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600">Jeepney Plate Numbers</p>
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
                              <span key={index} className="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm">
                                {plate}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500">No plate numbers provided</p>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}