'use client';

import { useEffect, useState } from 'react';
import { Member } from '@/lib/types/member';
import { getMemberCertificate } from '@/lib/certificateService';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/lib/auth';

export default function MemberDetailsModal({ 
  member, 
  isOpen, 
  onClose,
  onMarkInactive
}: { 
  member: Member | null; 
  isOpen: boolean; 
  onClose: () => void;
  onMarkInactive?: (member: Member) => void;
}) {
  const [isClient, setIsClient] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [showInactiveConfirm, setShowInactiveConfirm] = useState(false);
  const [isMarkingInactive, setIsMarkingInactive] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setShowInactiveConfirm(false);
      setIsMarkingInactive(false);
    }
  }, [isOpen]);

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
              <h3 className="text-lg font-semibold text-black">Membership Certificate</h3>
              <button
                onClick={async () => {
                  // Toggle the certificate view
                  setShowCertificate(!showCertificate);
                }}
                className={`px-4 py-2 rounded-lg hover:transition-colors ${
                  member.certificateGenerated 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-400 text-white cursor-not-allowed'
                }`}
                disabled={!member.certificateGenerated}
              >
                {showCertificate ? 'Hide Certificate' : 'View Certificate'}
              </button>
            </div>
            
            {showCertificate && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-300">
                <div className="flex justify-center mb-4">
                  <iframe
                    src={`/api/certificate/${encodeURIComponent(member.id)}`}
                    width="100%"
                    height="500px"
                    title="Membership Certificate"
                    className="border border-gray-300 rounded bg-white"
                  ></iframe>
                </div>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = `/api/certificate/${encodeURIComponent(member.id)}`;
                      link.download = `membership-certificate-${member.id}.pdf`;
                      link.click();
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Download Certificate
                  </button>
                  <button
                    onClick={() => {
                      const win = window.open(`/api/certificate/${encodeURIComponent(member.id)}`, '_blank');
                      if (win) win.focus();
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Open in New Tab
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200">
            {/* Mark as Inactive Button - Only show for active members */}
            {member && !member.archived && member.status !== 'archived' && (
              <button
                onClick={() => setShowInactiveConfirm(true)}
                disabled={isMarkingInactive}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center disabled:opacity-50"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Mark as Inactive
              </button>
            )}
            
            <div className="flex space-x-3 ml-auto">
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

      {/* Mark as Inactive Confirmation Modal */}
      {showInactiveConfirm && member && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="bg-red-100 p-2 rounded-full mr-3">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-black">Mark as Inactive?</h3>
              </div>
              
              <p className="text-black mb-4">
                Are you sure you want to mark <strong>{member.firstName} {member.lastName}</strong> as inactive? 
                This will archive the account and require a ₱1,500 reactivation fee to restore.
              </p>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-black">
                  <strong>Note:</strong> The member will be moved to the Archived Members list and will not be able to access their account until restored.
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowInactiveConfirm(false)}
                  disabled={isMarkingInactive}
                  className="px-4 py-2 border border-gray-300 text-black rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setIsMarkingInactive(true);
                    try {
                      const result = await firestore.updateDocument('members', member.id, {
                        status: 'archived',
                        archived: true,
                        archivedAt: new Date().toISOString(),
                        archiveReason: 'Marked manually by admin',
                        previousStatus: member.status || 'active',
                        updatedAt: new Date().toISOString()
                      });
                      
                      if (result.success) {
                        toast.success(`${member.firstName} ${member.lastName} has been marked as inactive and archived.`);
                        setShowInactiveConfirm(false);
                        onClose();
                        if (onMarkInactive) onMarkInactive(member);
                      } else {
                        toast.error('Failed to mark member as inactive.');
                      }
                    } catch (error) {
                      console.error('Error marking member as inactive:', error);
                      toast.error('An error occurred. Please try again.');
                    } finally {
                      setIsMarkingInactive(false);
                    }
                  }}
                  disabled={isMarkingInactive}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center disabled:opacity-50"
                >
                  {isMarkingInactive ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    'Yes, Mark as Inactive'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}