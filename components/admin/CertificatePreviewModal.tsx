'use client';

import { useState, useEffect } from 'react';
import { X, FileText, Send, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface CertificateData {
  memberId: string;
  fullName: string;
  certificateNumber: string;
  shares: string;
  shareCapital: string;
  cooperativeName: string;
  registrationDate: string;
  issueDate: string;
  day: string;
  month: string;
  year: string;
  secretaryName: string;
  chairmanName: string;
}

interface CertificatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (certificateData: CertificateData) => Promise<void>;
  memberData: {
    id: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    suffix?: string;
    role: string;
    email: string;
    phoneNumber: string;
    createdAt: string;
    driverInfo?: {
      street?: string;
      barangay?: string;
      city?: string;
    };
    operatorInfo?: {
      street?: string;
      barangay?: string;
      city?: string;
    };
  } | null;
  isGenerating: boolean;
}

export default function CertificatePreviewModal({
  isOpen,
  onClose,
  onConfirm,
  memberData,
  isGenerating
}: CertificatePreviewModalProps) {
  const [certificateData, setCertificateData] = useState<CertificateData>({
    memberId: '',
    fullName: '',
    certificateNumber: '',
    shares: '100',
    shareCapital: 'Common Share Capital',
    cooperativeName: 'SAMPA COOPERATIVE',
    registrationDate: '',
    issueDate: new Date().toISOString().split('T')[0],
    day: new Date().getDate().toString(),
    month: new Date().toLocaleString('en-US', { month: 'long' }),
    year: new Date().getFullYear().toString(),
    secretaryName: '',
    chairmanName: ''
  });
  
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    if (memberData && isOpen) {
      const fullName = `${memberData.firstName} ${memberData.middleName || ''} ${memberData.lastName} ${memberData.suffix || ''}`.trim();
      const now = new Date();
      
      setCertificateData({
        memberId: memberData.id,
        fullName: fullName,
        certificateNumber: `SC-${Date.now().toString().slice(-8)}`,
        shares: '100',
        shareCapital: 'Common Share Capital',
        cooperativeName: 'SAMPA COOPERATIVE',
        registrationDate: new Date(memberData.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        issueDate: now.toISOString().split('T')[0],
        day: now.getDate().toString(),
        month: now.toLocaleString('en-US', { month: 'long' }),
        year: now.getFullYear().toString(),
        secretaryName: certificateData.secretaryName,
        chairmanName: certificateData.chairmanName
      });
    }
  }, [memberData, isOpen]);

  const handleInputChange = (field: keyof CertificateData, value: string) => {
    setCertificateData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerateClick = () => {
    setShowConfirmation(true);
  };

  const handleConfirmGenerate = async () => {
    try {
      await onConfirm(certificateData);
      setShowConfirmation(false);
    } catch (error) {
      console.error('Error generating certificate:', error);
      toast.error('Failed to generate certificate');
    }
  };

  if (!isOpen || !memberData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[98vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-green-200 flex justify-between items-center bg-green-800">
          <div className="flex items-center">
            <FileText className="h-5 w-5 text-white mr-3" />
            <div>
              <h2 className="text-lg font-medium text-white">Share Certificate Preview</h2>
              <p className="text-green-100 text-sm">Review and edit certificate details before generation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-green-100 hover:text-white transition-colors"
            disabled={isGenerating}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          {/* Share Certificate Preview - Traditional Formal Design */}
          <div className="bg-white border-4 border-green-700 rounded-sm p-6 mb-6 shadow-lg relative" style={{ aspectRatio: '1.4/1' }}>
            {/* Inner Border */}
            <div className="absolute inset-2 border-2 border-green-600 pointer-events-none"></div>
            
            {/* Certificate Content */}
            <div className="relative z-10 h-full flex flex-col py-4 px-6">
              
              {/* Top Section - Number, Header, Shares */}
              <div className="flex justify-between items-start mb-4">
                {/* Number Box */}
                <div className="border-2 border-green-800 bg-white px-3 py-2 min-w-[100px]">
                  <p className="text-xs text-green-900 font-bold uppercase text-center border-b border-green-800 pb-1 mb-1">Number</p>
                  <input
                    type="text"
                    value={certificateData.certificateNumber}
                    onChange={(e) => handleInputChange('certificateNumber', e.target.value)}
                    className="w-full text-center text-sm font-bold text-green-900 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-green-500 rounded"
                  />
                </div>
                
                {/* Center Header */}
                <div className="text-center flex-1 mx-4">
                  <div className="border-2 border-green-800 rounded-full px-6 py-2 bg-green-50 inline-block">
                    <p className="text-xs text-green-900 font-bold uppercase tracking-wide">
                      Incorporated under the Laws of the Philippines
                    </p>
                    <p className="text-xs text-green-800">
                      The Philippine Cooperative Code - RA 9520
                    </p>
                    <p className="text-xs text-green-900 font-bold uppercase">Authorized Capital</p>
                  </div>
                </div>
                
                {/* Shares Box */}
                <div className="border-2 border-green-800 bg-white px-3 py-2 min-w-[100px]">
                  <p className="text-xs text-green-900 font-bold uppercase text-center border-b border-green-800 pb-1 mb-1">Shares</p>
                  <input
                    type="text"
                    value={certificateData.shares}
                    onChange={(e) => handleInputChange('shares', e.target.value)}
                    className="w-full text-center text-sm font-bold text-green-900 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-green-500 rounded"
                  />
                </div>
              </div>

              {/* Main Title Section */}
              <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-green-900" style={{ fontFamily: 'serif' }}>
                  This Certifies that
                </h1>
              </div>
              
              {/* Member Name - Large Underlined */}
              <div className="mb-4">
                <input
                  type="text"
                  value={certificateData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className="w-full text-center text-2xl font-bold text-green-900 bg-transparent border-b-2 border-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 rounded px-4 py-2"
                  placeholder="Member Full Name"
                  style={{ fontFamily: 'serif' }}
                />
              </div>
              
              {/* is the owner of */}
              <div className="text-center mb-3">
                <span className="text-lg text-green-800 italic" style={{ fontFamily: 'serif' }}>
                  is the owner of
                </span>
              </div>
              
              {/* Shares Input */}
              <div className="flex justify-center mb-3">
                <input
                  type="text"
                  value={certificateData.shares}
                  onChange={(e) => handleInputChange('shares', e.target.value)}
                  className="w-24 text-center text-xl font-bold text-green-900 bg-green-50 border-2 border-green-700 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              {/* Common Share Capital of */}
              <div className="text-center mb-3">
                <span className="text-xl text-green-800 italic" style={{ fontFamily: 'serif' }}>
                  Common Share Capital of
                </span>
              </div>
              
              {/* Cooperative Name */}
              <div className="mb-6">
                <input
                  type="text"
                  value={certificateData.cooperativeName}
                  onChange={(e) => handleInputChange('cooperativeName', e.target.value)}
                  className="w-full max-w-lg mx-auto block text-center text-2xl font-bold text-green-900 bg-transparent border-b-2 border-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 rounded px-4 py-1"
                  style={{ fontFamily: 'serif' }}
                />
              </div>

              {/* Legal Text */}
              <div className="text-center mb-4 px-4">
                <p className="text-sm text-green-800 italic leading-relaxed" style={{ fontFamily: 'serif' }}>
                  transferable only on the books of the Cooperative by the holder hereof in person or by 
                  <span className="font-bold not-italic"> Attorney </span> 
                  upon surrender of this Certificate properly endorsed.
                </p>
              </div>

              {/* Witness Clause */}
              <div className="text-center mb-4 px-4">
                <p className="text-sm text-green-800 italic leading-relaxed" style={{ fontFamily: 'serif' }}>
                  In Witness Whereof, the said Cooperative has caused this Certificate to be signed by its duly authorized officers and so be sealed with the Seal of the Cooperative this
                </p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <input
                    type="text"
                    value={certificateData.day}
                    onChange={(e) => handleInputChange('day', e.target.value)}
                    className="w-16 text-center text-base text-green-900 bg-green-50 border-2 border-green-700 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Day"
                  />
                  <span className="text-green-800 text-base" style={{ fontFamily: 'serif' }}>day of</span>
                  <input
                    type="text"
                    value={certificateData.month}
                    onChange={(e) => handleInputChange('month', e.target.value)}
                    className="w-28 text-center text-base text-green-900 bg-green-50 border-2 border-green-700 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Month"
                  />
                  <span className="text-green-800 text-base" style={{ fontFamily: 'serif' }}>A.D. 20</span>
                  <input
                    type="text"
                    value={certificateData.year.slice(-2)}
                    onChange={(e) => handleInputChange('year', '20' + e.target.value)}
                    className="w-12 text-center text-base text-green-900 bg-green-50 border-2 border-green-700 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="YY"
                  />
                </div>
              </div>

              {/* Signatures and Seal Section */}
              <div className="flex justify-between items-end px-4 mt-auto">
                {/* Green Starburst Seal */}
                <div className="flex-shrink-0">
                  <div className="w-28 h-28 relative">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <polygon 
                        points="50,0 58,35 95,25 68,50 95,75 58,65 50,100 42,65 5,75 32,50 5,25 42,35" 
                        fill="#22c55e"
                        stroke="#15803d"
                        strokeWidth="1"
                      />
                      <circle cx="50" cy="50" r="30" fill="#16a34a" />
                      <text x="50" y="45" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">OFFICIAL</text>
                      <text x="50" y="58" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">SEAL</text>
                    </svg>
                  </div>
                </div>
                
                {/* Signatures */}
                <div className="flex-1 flex justify-between items-end ml-8">
                  {/* Secretary */}
                  <div className="text-center flex-1">
                    <input
                      type="text"
                      value={certificateData.secretaryName}
                      onChange={(e) => handleInputChange('secretaryName', e.target.value)}
                      className="w-full max-w-[180px] mx-auto block text-center text-sm font-bold text-green-900 bg-transparent border-b-2 border-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 rounded px-2 py-1 mb-1"
                      placeholder="Secretary Name"
                      style={{ fontFamily: 'serif' }}
                    />
                    <p className="text-xs font-bold text-green-900 uppercase tracking-wider">Secretary</p>
                  </div>
                  
                  {/* Chairman */}
                  <div className="text-center flex-1">
                    <input
                      type="text"
                      value={certificateData.chairmanName}
                      onChange={(e) => handleInputChange('chairmanName', e.target.value)}
                      className="w-full max-w-[180px] mx-auto block text-center text-sm font-bold text-green-900 bg-transparent border-b-2 border-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 rounded px-2 py-1 mb-1"
                      placeholder="Chairman Name"
                      style={{ fontFamily: 'serif' }}
                    />
                    <p className="text-xs font-bold text-green-900 uppercase tracking-wider">Chairman</p>
                  </div>
                </div>
              </div>

              {/* Footer - Shares and Each */}
              <div className="mt-4 pt-3 border-t-2 border-green-800">
                <div className="flex justify-center items-center gap-16">
                  <div className="text-center border-2 border-green-800 px-4 py-2">
                    <p className="text-xs text-green-900 font-bold uppercase">Shares</p>
                    <input
                      type="text"
                      value={certificateData.shares}
                      onChange={(e) => handleInputChange('shares', e.target.value)}
                      className="w-16 text-center text-base font-bold text-green-900 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-green-500 rounded"
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-green-900 font-bold uppercase">Each</p>
                    <p className="text-green-900 font-bold text-base">PHP 100.00</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Editable Fields Section */}
          <div className="bg-green-50 rounded-lg p-5 mb-6 border border-green-200">
            <h3 className="text-sm font-bold text-green-800 mb-4 uppercase tracking-wider">
              Edit Certificate Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-green-700 mb-1">
                  Certificate Number
                </label>
                <input
                  type="text"
                  value={certificateData.certificateNumber}
                  onChange={(e) => handleInputChange('certificateNumber', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-green-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-xs text-green-700 mb-1">
                  Number of Shares
                </label>
                <input
                  type="text"
                  value={certificateData.shares}
                  onChange={(e) => handleInputChange('shares', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-green-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-xs text-green-700 mb-1">
                  Cooperative Name
                </label>
                <input
                  type="text"
                  value={certificateData.cooperativeName}
                  onChange={(e) => handleInputChange('cooperativeName', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-green-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-xs text-green-700 mb-1">
                  Secretary Name
                </label>
                <input
                  type="text"
                  value={certificateData.secretaryName}
                  onChange={(e) => handleInputChange('secretaryName', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-green-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  placeholder="Enter Secretary name"
                />
              </div>
              
              <div>
                <label className="block text-xs text-green-700 mb-1">
                  Chairman Name
                </label>
                <input
                  type="text"
                  value={certificateData.chairmanName}
                  onChange={(e) => handleInputChange('chairmanName', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-green-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  placeholder="Enter Chairman name"
                />
              </div>
              
              <div>
                <label className="block text-xs text-green-700 mb-1">
                  Issue Date
                </label>
                <input
                  type="date"
                  value={certificateData.issueDate}
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    handleInputChange('issueDate', e.target.value);
                    handleInputChange('day', date.getDate().toString());
                    handleInputChange('month', date.toLocaleString('en-US', { month: 'long' }));
                    handleInputChange('year', date.getFullYear().toString());
                  }}
                  className="w-full px-3 py-2 text-sm border border-green-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={isGenerating}
              className="px-5 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
            >
              Skip for now
            </button>
            <button
              onClick={handleGenerateClick}
              disabled={isGenerating || !certificateData.secretaryName || !certificateData.chairmanName}
              className="px-5 py-2 text-sm bg-green-700 text-white rounded hover:bg-green-800 transition-colors disabled:opacity-50 flex items-center"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Generate Certificate
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 border-2 border-green-700">
            <h3 className="text-lg font-bold text-green-800 mb-2">Generate Certificate?</h3>
            
            <p className="text-gray-600 text-sm mb-4">
              This will generate and save the share certificate for <strong className="text-green-800">{certificateData.fullName}</strong>.
            </p>
            
            <div className="bg-green-50 rounded p-3 mb-4 text-sm border border-green-200">
              <div className="grid grid-cols-2 gap-2 text-green-700">
                <span>Certificate #:</span> <span className="text-green-900 font-medium">{certificateData.certificateNumber}</span>
                <span>Shares:</span> <span className="text-green-900 font-medium">{certificateData.shares}</span>
                <span>Secretary:</span> <span className="text-green-900 font-medium">{certificateData.secretaryName || '-'}</span>
                <span>Chairman:</span> <span className="text-green-900 font-medium">{certificateData.chairmanName || '-'}</span>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmation(false)}
                disabled={isGenerating}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleConfirmGenerate}
                disabled={isGenerating}
                className="px-4 py-2 text-sm bg-green-700 text-white rounded hover:bg-green-800 transition-colors disabled:opacity-50 flex items-center"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Confirm
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
