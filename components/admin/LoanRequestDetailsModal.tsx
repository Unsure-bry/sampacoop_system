'use client';

import { useState } from 'react';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';

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

export default function LoanRequestDetailsModal({ 
  request, 
  isOpen, 
  onClose, 
  onApprove, 
  onReject 
}: LoanRequestDetailsModalProps) {
  const [rejectionReason, setRejectionReason] = useState('');

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

  const formatCurrency = (amount: number) => {
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
              <p className="text-black">{formatCurrency(request.amount)}</p>
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