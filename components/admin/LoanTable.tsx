'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { firestore } from '@/lib/firebase';

// Define the loan request type
interface LoanRequest {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  termDuration: string;
  dateRequested: string;
  status: 'pending' | 'approved' | 'rejected';
}

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const statusClasses = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };
  
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusClasses[status as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

/**
 * Loan Table Component
 * 
 * Displays a table of loan requests with approve/reject functionality:
 * - Shows member name, amount, term, date, and status
 * - Provides approve/reject buttons for pending requests
 * - Updates Firestore when actions are taken
 * 
 * Props:
 * - requests: LoanRequest[] - Array of loan requests to display
 * - onAction: () => void - Callback function to refresh data after actions
 */
export default function LoanTable({ 
  requests, 
  onAction 
}: { 
  requests: LoanRequest[]; 
  onAction: () => void; 
}) {
  const [processing, setProcessing] = useState<string | null>(null);

  // Handle loan approval
  const handleApprove = async (requestId: string, memberId: string) => {
    setProcessing(requestId);
    try {
      // Update the loan request status to approved
      const result = await firestore.updateDocument('loanRequests', requestId, {
        status: 'approved',
        dateApproved: new Date().toISOString()
      });
      
      if (!result.success) {
        throw new Error('Failed to approve loan request');
      }
      
      // In a real application, you would also:
      // 1. Create a loan record in the member's loan history
      // 2. Update the member's account with the loan details
      // 3. Send notifications to the member
      
      toast.success('Loan request approved successfully');
      onAction(); // Refresh the data
    } catch (error) {
      console.error('Error approving loan:', error);
      toast.error('Failed to approve loan request');
    } finally {
      setProcessing(null);
    }
  };

  // Handle loan rejection
  const handleReject = async (requestId: string) => {
    setProcessing(requestId);
    try {
      // Update the loan request status to rejected
      const result = await firestore.updateDocument('loanRequests', requestId, {
        status: 'rejected',
        dateRejected: new Date().toISOString()
      });
      
      if (!result.success) {
        throw new Error('Failed to reject loan request');
      }
      
      toast.success('Loan request rejected');
      onAction(); // Refresh the data
    } catch (error) {
      console.error('Error rejecting loan:', error);
      toast.error('Failed to reject loan request');
    } finally {
      setProcessing(null);
    }
  };

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Member
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Amount
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Term
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {requests.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                No loan requests found
              </td>
            </tr>
          ) : (
            requests.map((request) => (
              <tr key={request.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{request.memberName}</div>
                  <div className="text-sm text-gray-500">{request.memberId}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(request.amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {request.termDuration}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(request.dateRequested)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={request.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {request.status === 'pending' ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleApprove(request.id, request.memberId)}
                        disabled={processing === request.id}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                      >
                        {processing === request.id ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Approving...
                          </>
                        ) : (
                          'Approve'
                        )}
                      </button>
                      <button
                        onClick={() => handleReject(request.id)}
                        disabled={processing === request.id}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                      >
                        {processing === request.id ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Rejecting...
                          </>
                        ) : (
                          'Reject'
                        )}
                      </button>
                    </div>
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}