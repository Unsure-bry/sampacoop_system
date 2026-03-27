'use client';

import { useEffect, useState } from 'react';
import { Member } from '@/lib/types/member';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';

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
  
  // Auto-archive test states
  const [testDate, setTestDate] = useState<string>('');
  const [showTestSection, setShowTestSection] = useState<boolean>(false);
  const [testLoading, setTestLoading] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [deductionInput, setDeductionInput] = useState<string>('');
  const [deductionAmount, setDeductionAmount] = useState<number>(0);

  // Format currency input with commas and decimal
  const formatCurrencyInput = (value: string): string => {
    // Remove non-numeric characters except decimal point
    let numericValue = value.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const parts = numericValue.split('.');
    if (parts.length > 2) {
      numericValue = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      numericValue = parts[0] + '.' + parts[1].substring(0, 2);
    }
    
    return numericValue;
  };

  // Format number with commas for display
  const formatWithCommas = (value: string): string => {
    if (!value) return '';
    const parts = value.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  // Handle deduction input change
  const handleDeductionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = formatCurrencyInput(e.target.value);
    setDeductionInput(rawValue);
    setDeductionAmount(parseFloat(rawValue) || 0);
  };

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

          {/* Auto-Archive Test Section */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-black">Auto-Archive Test</h3>
              <button
                onClick={() => setShowTestSection(!showTestSection)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                {showTestSection ? 'Hide Test' : 'Show Test'}
              </button>
            </div>
            
            {showTestSection && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                <div className="text-sm text-gray-600 mb-3">
                  Test if this member would be auto-archived on a specific date due to inactivity (6+ months no transactions).
                  If archived, any remaining loan balance would be auto-deducted from savings.
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Test Reference Date</label>
                    <input
                      type="date"
                      value={testDate}
                      onChange={(e) => setTestDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={async () => {
                        if (!testDate) {
                          toast.error('Please select a test date');
                          return;
                        }
                        setTestLoading(true);
                        setTestResult(null);
                        
                        try {
                          const referenceDate = new Date(testDate);
                          const lastActivity = member.lastTransactionAt || member.lastActivityAt || member.updatedAt;
                          
                          // Calculate days inactive
                          let daysInactive = 0;
                          let wouldBeArchived = false;
                          let reason = '';
                          
                          if (!lastActivity) {
                            if (member.createdAt) {
                              const createdDate = new Date(member.createdAt);
                              daysInactive = Math.floor((referenceDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
                              if (daysInactive >= 180) {
                                wouldBeArchived = true;
                                reason = `No transactions since creation (${daysInactive} days)`;
                              }
                            }
                          } else {
                            const lastActivityDate = new Date(lastActivity);
                            daysInactive = Math.floor((referenceDate.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));
                            if (daysInactive >= 180) {
                              wouldBeArchived = true;
                              reason = `No transactions for ${daysInactive} days`;
                            }
                          }
                          
                          // Calculate loan deduction preview if would be archived
                          let loanPreview = null;
                          if (wouldBeArchived) {
                            const loansResult = await firestore.getCollection('loans');
                            console.log('Loans result:', loansResult);
                            console.log('Member ID:', member.id);
                            
                            let memberLoans: any[] = [];
                            if (loansResult.success && loansResult.data) {
                              // Check all loans and log for debugging
                              console.log('All loans:', loansResult.data);
                              
                              memberLoans = loansResult.data.filter((loan: any) => {
                                const loanData = loan as any;
                                // Check multiple possible ID fields
                                const loanMemberId = loanData.memberId || loanData.userId || loanData.member_id;
                                const loanStatus = (loanData.status || '').toLowerCase();
                                const isActive = loanStatus === 'active' || loanStatus === 'approved' || loanStatus === 'pending';
                                
                                console.log('Checking loan:', loanData.id, 'MemberId:', loanMemberId, 'Status:', loanStatus, 'IsActive:', isActive);
                                
                                return loanMemberId === member.id && isActive;
                              });
                            }
                            
                            console.log('Filtered member loans:', memberLoans);
                            
                            let totalLoan = 0;
                            for (const loan of memberLoans) {
                              const loanData = loan as any;
                              const remainingAmount = loanData.remainingAmount || loanData.remainingBalance || loanData.balance || loanData.amount || 0;
                              console.log('Loan:', loanData.id, 'Remaining:', remainingAmount);
                              totalLoan += remainingAmount;
                            }
                            
                            const savingsResult = await firestore.getCollection(`members/${member.id}/savings`);
                            let totalSavings = 0;
                            if (savingsResult.success && savingsResult.data) {
                              for (const transaction of savingsResult.data) {
                                const txData = transaction as any;
                                const amount = txData.amount || 0;
                                if (txData.type === 'deposit') {
                                  totalSavings += amount;
                                } else if (txData.type === 'withdrawal') {
                                  totalSavings -= amount;
                                }
                              }
                            }
                            
                            const autoDeductionAmount = Math.min(totalLoan, totalSavings);
                            loanPreview = {
                              totalLoan,
                              totalSavings,
                              deductionAmount: autoDeductionAmount,
                              loanCount: memberLoans.length
                            };
                            // Auto-set the deduction input to the loan-based amount
                            setDeductionInput(autoDeductionAmount.toFixed(2));
                            setDeductionAmount(autoDeductionAmount);
                          }
                          
                          setTestResult({
                            wouldBeArchived,
                            daysInactive,
                            reason,
                            loanPreview,
                            testDate: testDate
                          });
                          
                          if (wouldBeArchived) {
                            toast.success(`Test: Member would be archived (${daysInactive} days inactive)`);
                          } else {
                            toast(`Test: Member would NOT be archived (${daysInactive} days inactive)`);
                          }
                        } catch (error) {
                          console.error('Test error:', error);
                          toast.error('Error running test');
                        } finally {
                          setTestLoading(false);
                        }
                      }}
                      disabled={!testDate || testLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {testLoading ? 'Testing...' : 'Run Test'}
                    </button>
                  </div>
                </div>
                
                {testResult && (
                  <div className={`mt-4 p-4 rounded-lg ${testResult.wouldBeArchived ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
                    <h4 className={`font-semibold mb-2 ${testResult.wouldBeArchived ? 'text-amber-800' : 'text-green-800'}`}>
                      Test Result for {new Date(testResult.testDate).toLocaleDateString()}
                    </h4>
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="font-medium">Status:</span>{' '}
                        <span className={testResult.wouldBeArchived ? 'text-amber-700 font-semibold' : 'text-green-700'}>
                          {testResult.wouldBeArchived ? 'Would be ARCHIVED' : 'Would NOT be archived'}
                        </span>
                      </p>
                      <p>
                        <span className="font-medium">Days Inactive:</span> {testResult.daysInactive} days
                      </p>
                      {testResult.reason && (
                        <p>
                          <span className="font-medium">Reason:</span> {testResult.reason}
                        </p>
                      )}
                      
                      {testResult.loanPreview && testResult.wouldBeArchived && (
                        <div className="mt-3 pt-3 border-t border-amber-200">
                          <h5 className="font-semibold text-amber-800 mb-2">Loan Deduction Preview</h5>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <span>Total Loan Balance:</span>
                            <span className="font-medium">₱{testResult.loanPreview.totalLoan.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            
                            <span>Total Savings:</span>
                            <span className="font-medium">₱{testResult.loanPreview.totalSavings.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            
                            <span>Active Loans:</span>
                            <span className="font-medium">{testResult.loanPreview.loanCount}</span>
                          </div>
                          
                          {/* Deduction Amount Display (Auto-calculated from Loan Balance) */}
                          <div className="mt-4 pt-3 border-t border-amber-200">
                            <label className="block text-sm font-medium text-amber-800 mb-2">
                              Amount to Deduct from Savings
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 font-medium">₱</span>
                              </div>
                              <input
                                type="text"
                                value={formatWithCommas(deductionInput)}
                                onChange={handleDeductionChange}
                                placeholder="0.00"
                                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Auto-calculated based on remaining loan balance. Maximum: ₱{Math.min(testResult.loanPreview.totalLoan, testResult.loanPreview.totalSavings).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-amber-600 mt-1">
                              Deduction = Loan Balance (₱{testResult.loanPreview.totalLoan.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) or Savings (₱{testResult.loanPreview.totalSavings.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}), whichever is lower
                            </p>
                          </div>
                          
                          {/* Execute Archive Button */}
                          <div className="mt-4 pt-3 border-t border-amber-300">
                            <button
                              onClick={async () => {
                                if (deductionAmount <= 0) {
                                  toast.error('Please enter a valid deduction amount');
                                  return;
                                }
                                if (deductionAmount > testResult.loanPreview.totalSavings) {
                                  toast.error('Deduction amount cannot exceed total savings');
                                  return;
                                }
                                if (deductionAmount > testResult.loanPreview.totalLoan) {
                                  toast.error('Deduction amount cannot exceed total loan balance');
                                  return;
                                }
                                
                                if (!confirm(`Are you sure you want to archive this member and deduct ₱${deductionAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} from savings for loan repayment?`)) {
                                  return;
                                }
                                
                                setTestLoading(true);
                                try {
                                  // Archive the member
                                  const archiveReason = `No transaction for 6 months (${testResult.daysInactive} days inactive) - Archived via test on ${new Date().toLocaleDateString()}`;
                                  
                                  await firestore.updateDocument('members', member.id, {
                                    status: 'archived',
                                    archived: true,
                                    archivedAt: new Date().toISOString(),
                                    archiveReason: archiveReason,
                                    previousStatus: member.status || 'active',
                                    updatedAt: new Date().toISOString()
                                  });
                                  
                                  // Deduct loan from savings if applicable
                                  if (deductionAmount > 0) {
                                    const deductionTransaction = {
                                      amount: deductionAmount,
                                      type: 'withdrawal',
                                      description: `Loan deduction due to account archival (inactivity) - Auto-deducted from savings`,
                                      date: new Date().toISOString(),
                                      createdAt: new Date().toISOString(),
                                      status: 'completed',
                                      category: 'loan_deduction',
                                      recordedBy: 'system',
                                      isAutoDeduction: true,
                                      deductionReason: 'Account archived due to 6 months inactivity'
                                    };
                                    
                                    await firestore.addDocument(`members/${member.id}/savings`, deductionTransaction);
                                    
                                    // Update loans to paid status
                                    const loansResult = await firestore.getCollection('loans');
                                    if (loansResult.success && loansResult.data) {
                                      const memberLoans = loansResult.data.filter((loan: any) => {
                                        const loanData = loan as any;
                                        const loanMemberId = loanData.memberId || loanData.userId || loanData.member_id;
                                        const loanStatus = (loanData.status || '').toLowerCase();
                                        return loanMemberId === member.id && 
                                               (loanStatus === 'active' || loanStatus === 'approved' || loanStatus === 'pending');
                                      });
                                      
                                      let remainingDeduction = deductionAmount;
                                      
                                      for (const loan of memberLoans) {
                                        const loanData = loan as any;
                                        const remainingAmount = loanData.remainingAmount || loanData.amount || 0;
                                        const loanDeduction = Math.min(remainingAmount, remainingDeduction);
                                        
                                        if (loanDeduction > 0) {
                                          const newRemainingAmount = remainingAmount - loanDeduction;
                                          const loanStatus = newRemainingAmount <= 0 ? 'paid' : 'active';
                                          
                                          await firestore.updateDocument('loans', loanData.id, {
                                            remainingAmount: Math.max(0, newRemainingAmount),
                                            status: loanStatus,
                                            lastPaymentDate: new Date().toISOString(),
                                            lastPaymentAmount: loanDeduction,
                                            paidViaSavingsDeduction: true,
                                            deductionReason: 'Account archived due to inactivity'
                                          });
                                          
                                          remainingDeduction -= loanDeduction;
                                        }
                                        
                                        if (remainingDeduction <= 0) {
                                          break;
                                        }
                                      }
                                    }
                                  }
                                  
                                  toast.success(`Member archived successfully! ₱${deductionAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} deducted from savings for loan repayment.`);
                                  
                                  // Close modal after successful archive
                                  setTimeout(() => {
                                    onClose();
                                    // Refresh the page to show updated member list
                                    window.location.reload();
                                  }, 2000);
                                  
                                } catch (error) {
                                  console.error('Error archiving member:', error);
                                  toast.error('Failed to archive member. Please try again.');
                                } finally {
                                  setTestLoading(false);
                                }
                              }}
                              disabled={testLoading || deductionAmount <= 0}
                              className="w-full px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {testLoading ? 'Processing...' : `Execute Archive & Deduct ₱${deductionAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            </button>
                            <p className="text-xs text-amber-600 mt-2 text-center">
                              This will permanently archive the account and deduct ₱{deductionAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} from savings.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
            </div>
          </div>
        </div>
  );
}