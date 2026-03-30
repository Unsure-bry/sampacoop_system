'use client';

import { useState, useEffect } from 'react';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import ContractPreview from './ContractPreview';


interface LoanRequest {
  id: string;
  userId: string;
  memberId?: string;
  userName?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  suffix?: string;
  fullName?: string;
  email: string;
  role?: string;
  phone?: string;
  planId?: string;
  planName?: string;
  amount: number;
  term: number;
  interestRate?: number; // Interest rate at time of application (snapshot)
  status: string;
  description?: string;
  createdAt: string;
  rejectionReason?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  approvedAt?: string;
  approvedBy?: string;
}

interface LoanRequestDetailsModalProps {
  request: LoanRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (requestId: string, userId: string, planName: string, amount: number, term: number) => void;
  onReject: (requestId: string, rejectionReason: string) => void;
}

interface ContractData {
  date: string;
  borrowerName: string;
  amount: string;
  purpose: string;
  role: string;
  interestRate: string;
  dateReceived: string;
  paymentStartDate: string;
  operatorName: string;
  driverName: string;
  coMakerName: string;
  managerName: string;
}

export default function LoanRequestDetailsModal({ 
  request, 
  isOpen, 
  onClose, 
  onApprove, 
  onReject 
}: LoanRequestDetailsModalProps) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [showContract, setShowContract] = useState(false);
  const [contractData, setContractData] = useState<ContractData | null>(null);
  const [fieldPositions, setFieldPositions] = useState<any>(null);

  // Fetch contract data and field positions when viewing an approved loan
  useEffect(() => {
    if (isOpen && request && request.status === 'approved') {
      fetchContractData();
      fetchFieldPositions();
    } else {
      setShowContract(false);
      setContractData(null);
    }
  }, [isOpen, request]);

  // Helper function to format dates for contract display (mm/dd/yyyy format)
  const formatContractDate = (dateValue: any): string => {
    if (!dateValue) return '';
    
    try {
      let date: Date;
      
      // Handle Firestore Timestamp object { seconds: number, nanoseconds: number }
      if (typeof dateValue === 'object' && 'seconds' in dateValue) {
        date = new Date(dateValue.seconds * 1000);
      } else {
        // Handle ISO string or other date formats
        date = new Date(dateValue);
      }
      
      if (!isNaN(date.getTime())) {
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
      }
      
      return dateValue;
    } catch (e) {
      return dateValue;
    }
  };

  const fetchContractData = async () => {
    try {
      // Try to fetch contract data from the loan document
      const loanResult = await firestore.getDocument('loans', request!.id);
      if (loanResult.success && loanResult.data) {
        const loanData = loanResult.data as any;
        setContractData({
          date: formatContractDate(loanData.contractDate) || formatContractDate(loanData.startDate) || formatContractDate(new Date()),
          borrowerName: loanData.fullName || request!.fullName || '',
          amount: loanData.amount?.toString() || '',
          purpose: loanData.purpose || '',
          role: loanData.role || request!.role || '',
          interestRate: loanData.interest ? `${loanData.interest}%` : '',
          dateReceived: formatContractDate(loanData.dateReceived) || formatContractDate(loanData.startDate) || '',
          paymentStartDate: formatContractDate(loanData.paymentStartDate) || formatContractDate(loanData.startDate) || '',
          operatorName: loanData.operatorName || '',
          driverName: loanData.driverName || '',
          coMakerName: loanData.coMakerName || '',
          managerName: loanData.managerName || ''
        });
      } else {
        // Fallback to basic data from request
        // Use interestRate from loan request (stored at time of application)
        setContractData({
          date: formatContractDate(new Date()),
          borrowerName: request!.fullName || '',
          amount: request!.amount?.toString() || '',
          purpose: request!.description || '',
          role: request!.role || '',
          interestRate: request!.interestRate ? `${request!.interestRate}%` : '',
          dateReceived: '',
          paymentStartDate: '',
          operatorName: '',
          driverName: '',
          coMakerName: '',
          managerName: ''
        });
      }
    } catch (error) {
      console.error('Error fetching contract data:', error);
    }
  };

  const fetchFieldPositions = async () => {
    try {
      const result = await firestore.getDocument('settings', 'contractFieldPositions');
      if (result.success && result.data) {
        setFieldPositions(result.data.positions || null);
      }
    } catch (error) {
      console.error('Error fetching field positions:', error);
    }
  };

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return '';
    return `₱${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (!isOpen || !request) return null;

  const handleApprove = () => {
    if (!request) return;
    
    onApprove(
      request.id,
      request.userId,
      request.planName || 'General Loan',
      request.amount,
      request.term
    );
    onClose();
  };

  const handleReject = () => {
    if (!request || !rejectionReason.trim()) {
      toast.error('Please enter a rejection reason');
      return;
    }
    
    onReject(request.id, rejectionReason);
    onClose();
  };

  const formatCurrencyDisplay = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Determine the full name from the request
  const fullName = request.fullName || 
    `${request.firstName || ''} ${request.lastName || ''}`.trim() || 
    'User Not Found';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          <div className="flex justify-between items-start mb-4 sm:mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-black">Loan Request Details</h2>
              <p className="text-sm sm:text-base text-black">ID: {request.id}</p>
            </div>
            <button 
              onClick={onClose}
              className="text-black hover:text-gray-700"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Request Information Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-black font-medium">Full Name</p>
              <p className="text-black">{fullName}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-black font-medium">Email</p>
              <p className="text-black">{request.email}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-black font-medium">Role</p>
              <p className="text-black">{request.role || 'N/A'}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-black font-medium">Phone</p>
              <p className="text-black">{request.phone || 'N/A'}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-black font-medium">Loan Plan</p>
              <p className="text-black">{request.planName || 'General Loan'}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-black font-medium">Amount</p>
              <p className="text-black">{formatCurrencyDisplay(request.amount)}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-black font-medium">Term</p>
              <p className="text-black">{request.term} month{request.term !== 1 ? 's' : ''}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-black font-medium">Status</p>
              <p className="text-black">
                <span className={`px-2 py-1 rounded-full text-xs ${
                  request.status === 'pending' 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : request.status === 'approved' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                }`}>
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </span>
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
              <p className="text-sm text-black font-medium">Description</p>
              <p className="text-black">{request.description || 'N/A'}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
              <p className="text-sm text-black font-medium">Created At</p>
              <p className="text-black">{formatDate(request.createdAt)}</p>
            </div>
            {request.status === 'rejected' && (
              <>
                <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                  <p className="text-sm text-black font-medium">Rejection Reason</p>
                  <p className="text-black">{request.rejectionReason || 'No reason provided'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                  <p className="text-sm text-black font-medium">Rejected At</p>
                  <p className="text-black">{request.rejectedAt ? formatDate(request.rejectedAt) : 'N/A'}</p>
                </div>
              </>
            )}
            {request.status === 'approved' && (
              <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                <p className="text-sm text-black font-medium">Approved At</p>
                <p className="text-black">{request.approvedAt ? formatDate(request.approvedAt) : 'N/A'}</p>
              </div>
            )}
          </div>

          {/* Action Buttons - Only show for pending requests */}
          {request.status === 'pending' && (
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors order-2 sm:order-1"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors order-1 sm:order-2"
              >
                Reject
              </button>
              <button
                onClick={handleApprove}
                className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors order-0 sm:order-3"
              >
                Approve
              </button>
            </div>
          )}

          {/* Rejection Reason Input for Pending Requests */}
          {request.status === 'pending' && (
            <div className="mt-4">
              <label htmlFor="rejection-reason" className="block text-sm font-medium text-black mb-1">
                Rejection Reason (required for rejection)
              </label>
              <textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter the reason for rejecting this loan request"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 text-black"
                rows={3}
              />
            </div>
          )}

          {/* View Contract Button for approved requests */}
          {request.status === 'approved' && (
            <div className="mb-4">
              <button
                onClick={() => setShowContract(!showContract)}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {showContract ? 'Hide Contract' : 'View Contract'}
              </button>
            </div>
          )}

          {/* Contract Preview Section */}
          {showContract && request.status === 'approved' && contractData && (
            <div className="mb-6 border-t border-gray-200 pt-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Loan Contract</h3>
              <div className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-[500px] border border-gray-200">
                <ContractPreview
                  contractData={contractData}
                  fieldPositions={fieldPositions}
                  formatCurrency={formatCurrency}
                />
              </div>
            </div>
          )}

          {/* Close Button for non-pending requests */}
          {request.status !== 'pending' && (
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}