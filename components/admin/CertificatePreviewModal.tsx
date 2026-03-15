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
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-green-700 to-green-800">
          <div className="flex items-center">
            <FileText className="h-6 w-6 text-white mr-3" />
            <div>
              <h2 className="text-xl font-bold text-white">Share Certificate Preview</h2>
              <p className="text-green-100 text-sm">Review and edit certificate details before generation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-green-100 transition-colors"
            disabled={isGenerating}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4">
          {/* Share Certificate Preview - Landscape Layout Matching Physical Certificate */}
          <div className="bg-white border-8 border-green-800 rounded-lg p-4 mb-6 shadow-lg relative overflow-hidden" style={{ aspectRatio: '1.5/1' }}>
            {/* Roman-style Ornate Border Pattern */}
            <div className="absolute inset-0 border-4 border-green-700 m-1 rounded-lg pointer-events-none"></div>
            <div className="absolute inset-0 border-2 border-green-500 m-3 rounded-lg pointer-events-none"></div>
            
            {/* Ornate Corner Decorations - Roman Style */}
            <div className="absolute top-2 left-2 w-12 h-12 border-t-4 border-l-4 border-green-800 rounded-tl-lg pointer-events-none"></div>
            <div className="absolute top-2 right-2 w-12 h-12 border-t-4 border-r-4 border-green-800 rounded-tr-lg pointer-events-none"></div>
            <div className="absolute bottom-2 left-2 w-12 h-12 border-b-4 border-l-4 border-green-800 rounded-bl-lg pointer-events-none"></div>
            <div className="absolute bottom-2 right-2 w-12 h-12 border-b-4 border-r-4 border-green-800 rounded-br-lg pointer-events-none"></div>
            
            {/* Inner Decorative Border - Roman Ornate Pattern */}
            <div className="absolute inset-0 m-6 border border-green-600 rounded pointer-events-none opacity-50"></div>
            
            {/* Corner Flourishes */}
            <svg className="absolute top-6 left-6 w-8 h-8 text-green-700 pointer-events-none" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 12l10 10 10-10L12 2zm0 16L4 12l8-8 8 8-8 8z"/>
            </svg>
            <svg className="absolute top-6 right-6 w-8 h-8 text-green-700 pointer-events-none" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 12l10 10 10-10L12 2zm0 16L4 12l8-8 8 8-8 8z"/>
            </svg>
            <svg className="absolute bottom-6 left-6 w-8 h-8 text-green-700 pointer-events-none" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 12l10 10 10-10L12 2zm0 16L4 12l8-8 8 8-8 8z"/>
            </svg>
            <svg className="absolute bottom-6 right-6 w-8 h-8 text-green-700 pointer-events-none" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 12l10 10 10-10L12 2zm0 16L4 12l8-8 8 8-8 8z"/>
            </svg>
            
            {/* Certificate Content */}
            <div className="relative z-10 h-full flex flex-col justify-between py-2 px-4">
              {/* Header Section */}
              <div className="text-center">
                {/* Incorporation Info Box */}
                <div className="inline-block border-2 border-green-800 rounded-lg px-4 py-1 mb-2 bg-green-50">
                  <p className="text-xs text-green-900 font-bold uppercase tracking-wide">
                    Incorporated under the Laws of the Philippines
                  </p>
                  <p className="text-xs text-green-800">
                    The Philippine Cooperative Code - RA 9520
                  </p>
                  <p className="text-xs text-green-800 font-semibold">Authorized Capital</p>
                </div>
              </div>

              {/* Certificate Number and Shares Boxes - Top Section */}
              <div className="flex justify-between items-start px-4 mb-2">
                <div className="border-2 border-green-800 rounded bg-white px-3 py-1 min-w-[100px]">
                  <p className="text-xs text-green-900 font-bold uppercase">Number</p>
                  <input
                    type="text"
                    value={certificateData.certificateNumber}
                    onChange={(e) => handleInputChange('certificateNumber', e.target.value)}
                    className="w-full text-center text-sm font-bold text-green-900 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-green-500 rounded"
                  />
                </div>
                <div className="border-2 border-green-800 rounded bg-white px-3 py-1 min-w-[100px]">
                  <p className="text-xs text-green-900 font-bold uppercase">Shares</p>
                  <input
                    type="text"
                    value={certificateData.shares}
                    onChange={(e) => handleInputChange('shares', e.target.value)}
                    className="w-full text-center text-sm font-bold text-green-900 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-green-500 rounded"
                  />
                </div>
              </div>

              {/* Main Certificate Text */}
              <div className="text-center flex-1 flex flex-col justify-center">
                <div className="flex items-baseline justify-center gap-2 mb-1">
                  <span className="text-2xl font-bold text-green-900" style={{ fontFamily: 'serif' }}>
                    This Certifies that
                  </span>
                </div>
                
                {/* Member Name - Editable Field with underline */}
                <div className="mx-12 mb-1">
                  <input
                    type="text"
                    value={certificateData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    className="w-full text-center text-xl font-bold text-green-900 bg-transparent border-b-2 border-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 rounded px-2"
                    placeholder="Member Full Name"
                  />
                </div>
                
                {/* is the owner of text */}
                <p className="text-base text-green-800 italic mb-1" style={{ fontFamily: 'serif' }}>
                  is the owner of
                </p>
                
                {/* Shares and Capital */}
                <div className="flex items-center justify-center gap-2 mb-1">
                  <input
                    type="text"
                    value={certificateData.shares}
                    onChange={(e) => handleInputChange('shares', e.target.value)}
                    className="w-20 text-center text-lg font-bold text-green-900 bg-green-50 border-2 border-green-700 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <span className="text-lg font-bold text-green-900" style={{ fontFamily: 'serif' }}>
                    Common Share Capital of
                  </span>
                </div>
                
                {/* Cooperative Name */}
                <input
                  type="text"
                  value={certificateData.cooperativeName}
                  onChange={(e) => handleInputChange('cooperativeName', e.target.value)}
                  className="w-full max-w-sm mx-auto block text-center text-lg font-bold text-green-900 bg-transparent border-b-2 border-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 rounded px-2 mb-2"
                />
              </div>

              {/* Legal Text */}
              <div className="text-center px-8 mb-2">
                <p className="text-sm text-green-800 italic leading-snug" style={{ fontFamily: 'serif' }}>
                  transferable only on the books of the Cooperative by the holder hereof in person or by 
                  <span className="font-bold not-italic"> Attorney </span> 
                  upon surrender of this Certificate properly endorsed.
                </p>
              </div>

              {/* Witness Clause */}
              <div className="text-center px-8 mb-2">
                <p className="text-sm text-green-800 italic leading-snug" style={{ fontFamily: 'serif' }}>
                  In Witness Whereof, the said Cooperative has caused this Certificate to be signed by its duly authorized officers and so be sealed with the Seal of the Cooperative this
                </p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <input
                    type="text"
                    value={certificateData.day}
                    onChange={(e) => handleInputChange('day', e.target.value)}
                    className="w-12 text-center text-sm text-green-900 bg-green-50 border-2 border-green-700 rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Day"
                  />
                  <span className="text-green-800 text-sm">day of</span>
                  <input
                    type="text"
                    value={certificateData.month}
                    onChange={(e) => handleInputChange('month', e.target.value)}
                    className="w-24 text-center text-sm text-green-900 bg-green-50 border-2 border-green-700 rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Month"
                  />
                  <span className="text-green-800 text-sm">A.D. 20</span>
                  <input
                    type="text"
                    value={certificateData.year.slice(-2)}
                    onChange={(e) => handleInputChange('year', '20' + e.target.value)}
                    className="w-10 text-center text-sm text-green-900 bg-green-50 border-2 border-green-700 rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="YY"
                  />
                </div>
              </div>

              {/* Signatures Section */}
              <div className="flex justify-between items-end px-4 mt-2">
                {/* Secretary */}
                <div className="text-center flex-1">
                  <input
                    type="text"
                    value={certificateData.secretaryName}
                    onChange={(e) => handleInputChange('secretaryName', e.target.value)}
                    className="w-full max-w-[150px] mx-auto block text-center text-sm font-bold text-green-900 bg-transparent border-b-2 border-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 rounded px-1 mb-0.5"
                    placeholder="Secretary Name"
                  />
                  <p className="text-xs font-bold text-green-900 uppercase tracking-wider">Secretary</p>
                </div>
                
                {/* Official Seal - Starburst shape */}
                <div className="mx-4">
                  <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center shadow-lg" style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }}>
                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold text-center leading-tight">
                        OFFICIAL<br/>SEAL
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Chairman */}
                <div className="text-center flex-1">
                  <input
                    type="text"
                    value={certificateData.chairmanName}
                    onChange={(e) => handleInputChange('chairmanName', e.target.value)}
                    className="w-full max-w-[150px] mx-auto block text-center text-sm font-bold text-green-900 bg-transparent border-b-2 border-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 rounded px-1 mb-0.5"
                    placeholder="Chairman Name"
                  />
                  <p className="text-xs font-bold text-green-900 uppercase tracking-wider">Chairman</p>
                </div>
              </div>

              {/* Footer Shares Info */}
              <div className="mt-2 pt-2 border-t-2 border-green-800">
                <div className="flex justify-center items-center gap-12">
                  <div className="text-center">
                    <p className="text-xs text-green-900 uppercase font-bold">Shares</p>
                    <input
                      type="text"
                      value={certificateData.shares}
                      onChange={(e) => handleInputChange('shares', e.target.value)}
                      className="w-16 text-center text-sm font-bold text-green-900 bg-green-50 border-2 border-green-700 rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-green-900 uppercase font-bold">Each</p>
                    <p className="text-green-900 font-bold text-sm">PHP 100.00</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Editable Fields Section */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-blue-600" />
              Edit Certificate Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Certificate Number
                </label>
                <input
                  type="text"
                  value={certificateData.certificateNumber}
                  onChange={(e) => handleInputChange('certificateNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Shares
                </label>
                <input
                  type="text"
                  value={certificateData.shares}
                  onChange={(e) => handleInputChange('shares', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cooperative Name
                </label>
                <input
                  type="text"
                  value={certificateData.cooperativeName}
                  onChange={(e) => handleInputChange('cooperativeName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Secretary Name
                </label>
                <input
                  type="text"
                  value={certificateData.secretaryName}
                  onChange={(e) => handleInputChange('secretaryName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter Secretary name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chairman Name
                </label>
                <input
                  type="text"
                  value={certificateData.chairmanName}
                  onChange={(e) => handleInputChange('chairmanName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter Chairman name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={isGenerating}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerateClick}
              disabled={isGenerating || !certificateData.secretaryName || !certificateData.chairmanName}
              className="px-6 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors disabled:opacity-50 flex items-center"
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
                  Confirm & Generate
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-6 w-6 text-yellow-500 mr-3" />
              <h3 className="text-lg font-semibold text-gray-800">Confirm Certificate Generation</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Please confirm that all certificate details are correct before issuing. 
              Once generated, the certificate will be sent to <strong>{memberData.email}</strong>.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Certificate Summary:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li><span className="font-medium">Member:</span> {certificateData.fullName}</li>
                <li><span className="font-medium">Certificate #:</span> {certificateData.certificateNumber}</li>
                <li><span className="font-medium">Shares:</span> {certificateData.shares}</li>
                <li><span className="font-medium">Secretary:</span> {certificateData.secretaryName || 'Not specified'}</li>
                <li><span className="font-medium">Chairman:</span> {certificateData.chairmanName || 'Not specified'}</li>
              </ul>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmation(false)}
                disabled={isGenerating}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmGenerate}
                disabled={isGenerating}
                className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors disabled:opacity-50 flex items-center"
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
                    Confirm & Send
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
