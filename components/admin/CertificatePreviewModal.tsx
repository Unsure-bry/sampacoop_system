'use client';

import { useState, useEffect, useRef } from 'react';
import { X, FileText, Send, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { firestore } from '@/lib/firebase';

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
  const certificateRef = useRef<HTMLDivElement>(null);
  const [certificateData, setCertificateData] = useState<CertificateData>({
    memberId: '',
    fullName: '',
    certificateNumber: '',
    shares: '10000',
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
  const [officers, setOfficers] = useState<{secretary: string; chairman: string}>({ secretary: '', chairman: '' });

  // Fetch officers from Officer Management
  useEffect(() => {
    const fetchOfficers = async () => {
      try {
        const result = await firestore.getCollection('users');
        if (result.success && result.data) {
          const users = result.data;
          
          // Find secretary
          const secretary = users.find((u: any) => 
            u.role?.toLowerCase() === 'secretary' && u.status === 'active'
          );
          
          // Find chairman
          const chairman = users.find((u: any) => 
            u.role?.toLowerCase() === 'chairman' && u.status === 'active'
          );
          
          setOfficers({
            secretary: secretary ? `${(secretary as any).firstName || ''} ${(secretary as any).lastName || ''}`.trim() : '',
            chairman: chairman ? `${(chairman as any).firstName || ''} ${(chairman as any).lastName || ''}`.trim() : ''
          });
        }
      } catch (error) {
        console.error('Error fetching officers:', error);
      }
    };

    if (isOpen) {
      fetchOfficers();
    }
  }, [isOpen]);

  // Update certificate data when memberData or officers change
  useEffect(() => {
    if (memberData && isOpen) {
      const fullName = `${memberData.firstName} ${memberData.middleName || ''} ${memberData.lastName} ${memberData.suffix || ''}`.trim();
      const now = new Date();
      
      setCertificateData(prev => ({
        ...prev,
        memberId: memberData.id,
        fullName: fullName,
        certificateNumber: `SC-${Date.now().toString().slice(-8)}`,
        shares: '10000',
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
      }));
    }
  }, [memberData, isOpen]);

  // Update officer names when officers data changes
  useEffect(() => {
    if (officers.secretary || officers.chairman) {
      setCertificateData(prev => ({
        ...prev,
        secretaryName: officers.secretary || prev.secretaryName,
        chairmanName: officers.chairman || prev.chairmanName
      }));
    }
  }, [officers]);

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

  const handlePrint = async () => {
    if (!certificateRef.current) return;

    try {
      // Use html2canvas to capture the certificate as an image
      const canvas = await html2canvas(certificateRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: 1123,
        height: 794,
        imageTimeout: 0,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById('certificate-preview');
          if (clonedElement) {
            clonedElement.style.colorScheme = 'light';
            const allElements = clonedElement.querySelectorAll('*');
            allElements.forEach((el) => {
              const htmlEl = el as HTMLElement;
              htmlEl.style.color = '#171717';
            });
          }
        },
      });

      const imgData = canvas.toDataURL('image/png');
      
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Please allow popups to print the certificate');
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Share Certificate - ${certificateData.fullName}</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              @page {
                size: A4 landscape;
                margin: 0;
              }
              html, body {
                width: 100%;
                height: 100%;
                overflow: hidden;
              }
              body {
                display: flex;
                justify-content: center;
                align-items: center;
                background: white;
              }
              img {
                width: 297mm;
                height: 210mm;
                object-fit: contain;
              }
              @media print {
                body {
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
              }
            </style>
          </head>
          <body>
            <img src="${imgData}" alt="Certificate" />
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  window.close();
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      toast.success('Opening print dialog...');
    } catch (error) {
      console.error('Error printing certificate:', error);
      toast.error('Failed to print certificate');
    }
  };

  const downloadPDF = async () => {
    if (!certificateRef.current) return;

    try {
      // Get the actual displayed dimensions of the certificate
      const rect = certificateRef.current.getBoundingClientRect();
      const displayWidth = rect.width;
      const displayHeight = rect.height;
      
      // Use scale 6 for maximum quality capture
      const scale = 6;
      
      const canvas = await html2canvas(certificateRef.current, {
        scale: scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: 1123,
        height: 794,
        imageTimeout: 0,
        removeContainer: true,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById('certificate-preview');
          if (clonedElement) {
            clonedElement.style.colorScheme = 'light';
            // Force all text to use hex colors instead of lab()
            const allElements = clonedElement.querySelectorAll('*');
            allElements.forEach((el) => {
              const htmlEl = el as HTMLElement;
              htmlEl.style.color = '#171717';
            });
          }
        },
      });

      const imgData = canvas.toDataURL('image/png');
      
      // Convert pixel dimensions to mm (96 DPI: 1px = 0.264583mm)
      const pxToMm = 0.264583;
      const certWidthMm = 1123 * pxToMm; // ~297mm (A4 width)
      const certHeightMm = 794 * pxToMm; // ~210mm (A4 height)
      
      // Create PDF with exact certificate dimensions
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [certWidthMm, certHeightMm],
      });
      
      // Add image to fill entire PDF page exactly
      pdf.addImage(imgData, 'PNG', 0, 0, certWidthMm, certHeightMm, undefined, 'NONE');
      pdf.save(`certificate-${certificateData.fullName.replace(/\s+/g, '_')}.pdf`);
      toast.success('Certificate downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  if (!isOpen || !memberData) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-green-800 to-green-700">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Share Certificate</h2>
              <p className="text-green-100 text-sm">Preview and customize certificate details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors"
            disabled={isGenerating}
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Certificate Preview Section */}
          <div className="flex-shrink-0 flex justify-center p-2 bg-gray-50 overflow-x-auto">
            {/* Certificate - A4 Landscape (297mm x 210mm at 96 DPI = 1123px x 794px) */}
            <div 
              ref={certificateRef}
              id="certificate-preview"
              className="relative bg-white shadow-xl flex-shrink-0"
              style={{ 
                width: '1123px',
                height: '794px',
                minWidth: '1123px',
                minHeight: '794px',
                backgroundImage: 'url(/SAMPA%20TRANSPORT%20SERVICE%20COOPERATIVE.png)',
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                color: '#171717',
              }}
            >
                {/* Text Overlays Container - Above Image */}
                <div className="absolute inset-0 z-10">
                  {/* Full Name - Positioned under "This certifies that" */}
                  <div
                    className="absolute text-center font-serif font-bold text-gray-900"
                    style={{
                      top: '245px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '500px',
                      fontSize: '28px',
                    }}
                  >
                    {certificateData.fullName}
                  </div>

                  {/* Share Capital Amount - Positioned after "the owner of" */}
                  <div
                    className="absolute font-serif font-semibold text-gray-900 text-center"
                    style={{
                      top: '305px',
                      left: '300px',
                      width: '140px',
                      fontSize: '22px',
                    }}
                  >
                    {certificateData.shares ? `₱${Number(certificateData.shares).toLocaleString('en-PH')}` : ''}
                  </div>

                  {/* Day */}
                  <div
                    className="absolute font-serif text-gray-900 text-center"
                    style={{
                      top: '475px',
                      left: '215px',
                      width: '50px',
                      fontSize: '18px',
                    }}
                  >
                    {certificateData.day}
                  </div>

                  {/* Month */}
                  <div
                    className="absolute font-serif text-gray-900 text-center"
                    style={{
                      top: '475px',
                      left: '390px',
                      width: '90px',
                      fontSize: '18px',
                    }}
                  >
                    {certificateData.month}
                  </div>

                  {/* Year */}
                  <div
                    className="absolute font-serif text-gray-900 text-center"
                    style={{
                      top: '475px',
                      left: '615px',
                      width: '70px',
                      fontSize: '18px',
                    }}
                  >
                    {certificateData.year}
                  </div>

                  {/* Secretary Name */}
                  <div
                    className="absolute font-serif text-gray-900 text-center whitespace-nowrap"
                    style={{
                      top: '630px',
                      left: '230px',
                      width: '160px',
                      fontSize: '15px',
                    }}
                  >
                    {certificateData.secretaryName}
                  </div>

                  {/* Chairman Name */}
                  <div
                    className="absolute font-serif text-gray-900 text-center whitespace-nowrap"
                    style={{
                      top: '630px',
                      left: '730px',
                      width: '160px',
                      fontSize: '15px',
                    }}
                  >
                    {certificateData.chairmanName}
                  </div>
                </div>
              </div>
            </div>

          {/* Certificate Details Form - Horizontal Layout */}
          <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4">
            <div className="max-w-6xl mx-auto">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">
                Certificate Details
              </h3>
              
              <div className="grid grid-cols-6 gap-4">
                {/* Full Name */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={certificateData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm text-gray-900"
                  />
                </div>
                
                {/* Number of Shares */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Shares
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">₱</span>
                    <input
                      type="text"
                      value={certificateData.shares ? Number(certificateData.shares).toLocaleString('en-PH') : ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        handleInputChange('shares', value);
                      }}
                      className="w-full pl-7 pr-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm text-gray-900"
                    />
                  </div>
                </div>
                
                {/* Issue Date */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
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
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm text-gray-900"
                  />
                </div>
                
                {/* Secretary Name */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Secretary
                  </label>
                  <input
                    type="text"
                    value={certificateData.secretaryName}
                    onChange={(e) => handleInputChange('secretaryName', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm text-gray-900"
                    placeholder="Name"
                  />
                </div>

                {/* Chairman Name */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Chairman
                  </label>
                  <input
                    type="text"
                    value={certificateData.chairmanName}
                    onChange={(e) => handleInputChange('chairmanName', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm text-gray-900"
                    placeholder="Name"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex gap-3 justify-end">
                <button
                  onClick={onClose}
                  disabled={isGenerating}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 text-sm font-medium bg-white border-2 border-gray-200 text-gray-700 rounded-lg hover:border-blue-500 hover:text-blue-700 transition-all flex items-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print
                </button>
                
                <button
                  onClick={downloadPDF}
                  className="px-4 py-2 text-sm font-medium bg-white border-2 border-gray-200 text-gray-700 rounded-lg hover:border-green-500 hover:text-green-700 transition-all flex items-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PDF
                </button>
                
                <button
                  onClick={handleGenerateClick}
                  disabled={isGenerating || !certificateData.secretaryName || !certificateData.chairmanName}
                  className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-green-700 to-green-600 text-white rounded-lg hover:from-green-800 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-green-200"
                >
                  {isGenerating ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Save Certificate
                    </>
                  )}
                </button>
              </div>
            </div>
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
