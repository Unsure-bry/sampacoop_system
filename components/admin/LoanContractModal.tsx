'use client';

import { useState, useEffect } from 'react';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import ContractPositioningTool from './ContractPositioningTool';
import ContractPreview, { LETTER_WIDTH, LETTER_HEIGHT } from './ContractPreview';

interface LoanContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  loanData: {
    requestId: string;
    userId: string;
    planName: string;
    amount: number;
    term: number;
    interestRate: number;
    borrowerName: string;
    borrowerRole: string;
    email: string;
  } | null;
  onContractComplete: () => void;
}

export default function LoanContractModal({
  isOpen,
  onClose,
  loanData,
  onContractComplete
}: LoanContractModalProps) {
  // Helper function to format date as mm/dd/yyyy
  const formatDateMMDDYYYY = (date: Date): string => {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const [contractData, setContractData] = useState({
    date: formatDateMMDDYYYY(new Date()),
    borrowerName: '',
    amount: '',
    purpose: '',
    role: '',
    interestRate: '',
    dateReceived: formatDateMMDDYYYY(new Date()),
    paymentStartDate: formatDateMMDDYYYY(new Date()),
    operatorName: '',
    driverName: '',
    coMakerName: '',
    managerName: ''
  });
  const [loading, setLoading] = useState(false);
  const [officers, setOfficers] = useState<{ manager: string }>({ manager: '' });
  const [showPositioningTool, setShowPositioningTool] = useState(false);
  const [fieldPositions, setFieldPositions] = useState<any>(null);

  useEffect(() => {
    if (loanData && isOpen) {
      setContractData(prev => ({
        ...prev,
        borrowerName: loanData.borrowerName || '',
        amount: loanData.amount ? loanData.amount.toString() : '',
        role: loanData.borrowerRole || '',
        interestRate: loanData.interestRate ? `${loanData.interestRate}%` : ''
      }));
      fetchManager();
      fetchSavedFieldPositions();
    }
  }, [loanData, isOpen]);

  const fetchSavedFieldPositions = async () => {
    try {
      const result = await firestore.getDocument('settings', 'contractFieldPositions');
      if (result.success && result.data) {
        setFieldPositions(result.data.positions || null);
      }
    } catch (error) {
      console.error('Error fetching field positions:', error);
    }
  };

  const fetchManager = async () => {
    try {
      const result = await firestore.getCollection('users');
      if (result.success && result.data) {
        const users = result.data;
        const manager = users.find((u: any) => 
          u.role?.toLowerCase() === 'manager' && u.status === 'active'
        );
        setOfficers({
          manager: manager ? `${(manager as any).firstName || ''} ${(manager as any).lastName || ''}`.trim() : ''
        });
        setContractData(prev => ({
          ...prev,
          managerName: manager ? `${(manager as any).firstName || ''} ${(manager as any).lastName || ''}`.trim() : ''
        }));
      }
    } catch (error) {
      console.error('Error fetching manager:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setContractData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return '';
    return `₱${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const generatePDF = async () => {
    setLoading(true);
    try {
      const contractElement = document.getElementById('loan-contract');
      if (!contractElement) {
        toast.error('Contract element not found');
        return;
      }

      // Use higher scale for better quality, but maintain aspect ratio
      const SCALE = 2;
      
      const canvas = await html2canvas(contractElement, {
        scale: SCALE,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: LETTER_WIDTH,
        height: LETTER_HEIGHT,
        windowWidth: LETTER_WIDTH,
        windowHeight: LETTER_HEIGHT
      });

      const imgData = canvas.toDataURL('image/png');
      
      // Letter size in mm
      const PDF_WIDTH_MM = 216;
      const PDF_HEIGHT_MM = 279;
      
      // Create PDF with Letter size in mm
      const pdf = new jsPDF('p', 'mm', [PDF_WIDTH_MM, PDF_HEIGHT_MM]);
      
      // Add image to fill entire PDF page
      pdf.addImage(imgData, 'PNG', 0, 0, PDF_WIDTH_MM, PDF_HEIGHT_MM);
      
      pdf.save(`Loan_Contract_${contractData.borrowerName.replace(/\s+/g, '_')}_${contractData.date}.pdf`);
      
      toast.success('Contract PDF generated successfully!');
      onContractComplete();
      onClose();
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !loanData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Loan Contract Form</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Contract Preview - Full Width on Top */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-gray-800 mb-4">Contract Preview</h3>
            <div className="overflow-auto max-h-[500px] border border-gray-200 rounded-lg flex justify-center">
              <ContractPreview 
                contractData={contractData}
                fieldPositions={fieldPositions}
                formatCurrency={formatCurrency}
              />
            </div>
          </div>

          {/* Contract Details Form - Below Preview */}
          <div className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-sm">
            <h3 className="font-bold text-gray-900 border-b-2 border-gray-200 pb-3 mb-6 text-lg">Contract Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Date (Petsa)</label>
                <input
                  type="date"
                  value={contractData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base text-gray-900 placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Borrower Name</label>
                <input
                  type="text"
                  value={contractData.borrowerName}
                  onChange={(e) => handleInputChange('borrowerName', e.target.value)}
                  placeholder="Enter borrower name"
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base text-gray-900 placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Amount (Halaga)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-600 text-lg font-semibold">₱</span>
                  <input
                    type="text"
                    value={contractData.amount ? parseFloat(contractData.amount).toLocaleString('en-PH') : ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9.]/g, '');
                      handleInputChange('amount', value);
                    }}
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base text-gray-900 placeholder-gray-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Role (Bilang)</label>
                <select
                  value={contractData.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base text-gray-900"
                >
                  <option value="">Select Role</option>
                  <option value="Operator">Operator</option>
                  <option value="Driver">Driver</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Interest Rate</label>
                <input
                  type="text"
                  value={contractData.interestRate}
                  onChange={(e) => handleInputChange('interestRate', e.target.value)}
                  placeholder="e.g., 5%"
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base text-gray-900 placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Date Received</label>
                <input
                  type="date"
                  value={contractData.dateReceived}
                  onChange={(e) => handleInputChange('dateReceived', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Payment Start Date</label>
                <input
                  type="date"
                  value={contractData.paymentStartDate}
                  onChange={(e) => handleInputChange('paymentStartDate', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base text-gray-900"
                />
              </div>
              <div className="md:col-span-2 lg:col-span-1">
                <label className="block text-sm font-semibold text-gray-900 mb-2">Purpose (Paggagamitan)</label>
                <input
                  type="text"
                  value={contractData.purpose}
                  onChange={(e) => handleInputChange('purpose', e.target.value)}
                  placeholder="Enter purpose of the loan..."
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>

            <h3 className="font-bold text-gray-900 border-b-2 border-gray-200 pb-3 mt-8 mb-6 text-lg">Signatories</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Operator Name</label>
                <input
                  type="text"
                  value={contractData.operatorName}
                  onChange={(e) => handleInputChange('operatorName', e.target.value)}
                  placeholder="Enter operator name"
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base text-gray-900 placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Driver Name</label>
                <input
                  type="text"
                  value={contractData.driverName}
                  onChange={(e) => handleInputChange('driverName', e.target.value)}
                  placeholder="Enter driver name"
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base text-gray-900 placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Co-Maker Name</label>
                <input
                  type="text"
                  value={contractData.coMakerName}
                  onChange={(e) => handleInputChange('coMakerName', e.target.value)}
                  placeholder="Enter co-maker name"
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base text-gray-900 placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Manager Name</label>
                <input
                  type="text"
                  value={contractData.managerName}
                  onChange={(e) => handleInputChange('managerName', e.target.value)}
                  placeholder="Enter manager name"
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mt-6 pt-4 border-t">
            <button
              onClick={() => setShowPositioningTool(true)}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
            >
              Adjust Field Positions
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={generatePDF}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Approve
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Positioning Tool Modal */}
      {showPositioningTool && (
        <ContractPositioningTool
          imageSrc="/Contract.png"
          initialPositions={fieldPositions}
          onPositionsSave={async (positions) => {
            setFieldPositions(positions);
            setShowPositioningTool(false);
            
            // Save to Firestore for persistence
            try {
              await firestore.setDocument('settings', 'contractFieldPositions', {
                positions: positions,
                updatedAt: new Date().toISOString()
              });
              toast.success('Field positions saved and will apply to all contracts!');
            } catch (error) {
              console.error('Error saving field positions:', error);
              toast.error('Positions saved locally but failed to persist to database');
            }
          }}
          onCancel={() => setShowPositioningTool(false)}
        />
      )}
    </div>
  );
}
