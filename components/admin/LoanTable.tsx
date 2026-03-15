'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { firestore } from '@/lib/firebase';

// Define the loan request type
interface LoanRequest {
  id: string;
  userId: string;
  memberId?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email: string;
  role?: string;
  phone?: string;
  planId?: string;
  planName?: string;
  amount: number;
  term: number;
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  rejectionReason?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  approvedAt?: string;
  approvedBy?: string;
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
  const handleApprove = async (requestId: string, userId: string) => {
    setProcessing(requestId);
    try {
      // Update the loan request status to approved
      const result = await firestore.updateDocument('loanRequests', requestId, {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: 'current_user_id' // This should be replaced with actual user ID
      });
      
      if (!result.success) {
        console.error('Error updating loan request status:', result.error);
        toast.error(result.error || 'Failed to approve loan request');
        return;
      }
      
      // Fetch the loan request data to get all necessary information
      const requestResult = await firestore.getDocument('loanRequests', requestId);
      if (!requestResult.success || !requestResult.data) {
        throw new Error('Failed to fetch loan request data');
      }
      
      const requestData = requestResult.data as any;
      
      // Use member information from the loan request
      const fullName = requestData.fullName || `${requestData.firstName || ''} ${requestData.lastName || ''}`.trim() || 'User Not Found';
      const role = requestData.role || 'N/A';
      let interestRate = 3; // Default interest rate
      
      // Get interest rate from loan plan if available
      if (requestData.planId) {
        const planResult = await firestore.getDocument('loanPlans', requestData.planId);
        if (planResult.success && planResult.data) {
          const planData = planResult.data as any;
          interestRate = planData.interestRate || 3;
        }
      }
      
      // Calculate amortization schedule
      // Logic: Total Amount = Principal + (Principal × Interest Rate × Term), then divide by days
      // Example: 5000 + (5000 × 2% × 3) = 5300, then 5300 / 90 = 58.89 per day
      const totalDays = requestData.term * 30;
      
      // Calculate interest amount: Principal × Interest Rate × Term
      const interestAmount = requestData.amount * (interestRate / 100) * requestData.term;
      
      // Calculate total amount: Principal + Interest
      const totalAmount = requestData.amount + interestAmount;
      
      // Daily payment: Total Amount / Number of days
      const dailyPayment = totalAmount / totalDays;
      
      // Daily principal portion: Principal / Number of days
      const dailyPrincipal = requestData.amount / totalDays;
      
      // Generate payment schedule
      let remainingBalance = totalAmount;
      let currentDate = new Date();
      const paymentSchedule = [];
      
      for (let day = 1; day <= totalDays; day++) {
        // Add one day for each payment date
        currentDate.setDate(currentDate.getDate() + 1);
        
        remainingBalance -= dailyPayment;
        
        // Ensure remaining balance doesn't go below 0
        if (remainingBalance < 0) {
          remainingBalance = 0;
        }
        
        paymentSchedule.push({
          day,
          paymentDate: currentDate.toISOString().split('T')[0],
          principal: dailyPrincipal,
          interest: interestAmount,
          totalPayment: dailyPayment,
          remainingBalance,
          status: 'pending' // Initial status for payments
        });
      }
      
      // Use the existing loanId from the loan request (generated when user submitted)
      const loanId = requestId;
      
      // Create approved loan document in the loans collection with member details
      const now = new Date();
      const loanData = {
        userId: userId,
        fullName: fullName,
        role: role,
        amount: requestData.amount,
        term: requestData.term,
        planName: requestData.planName || 'General Loan',
        startDate: now.toISOString(),
        interest: interestRate, // Interest rate from loan plan
        status: 'active',
        paymentSchedule: paymentSchedule,
        loanId: loanId // Preserve the original Loan ID
      };

      const loanResult = await firestore.setDocument(
        'loans',
        loanId,
        loanData
      );

      if (loanResult.success) {
        toast.success('Loan request approved successfully!');
        
        // Create approval notification for the user
        try {
          const notificationId = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          await firestore.setDocument('notifications', notificationId, {
            userId: userId,
            userRole: requestData.role || 'member',
            title: 'Loan Approved',
            message: `Your loan application for ${requestData.planName || 'General Loan'} amounting to ${formatCurrency(requestData.amount)} has been approved. The loan is now active with a ${requestData.term}-month term.`,
            type: 'loan_approval',
            status: 'unread',
            createdAt: new Date().toISOString(),
            metadata: {
              loanId: loanId,
              amount: requestData.amount,
              planName: requestData.planName || 'General Loan',
              term: requestData.term
            }
          });
        } catch (notifError) {
          console.error('Error creating approval notification:', notifError);
        }
      } else {
        toast.error('Failed to create loan. Please try again.');
      }
      
      onAction(); // Refresh the data
    } catch (error) {
      console.error('Error approving loan:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  // Handle loan rejection
  const handleReject = async (requestId: string) => {
    setProcessing(requestId);
    
    // Prompt for rejection reason
    const rejectionReason = prompt('Enter rejection reason:');
    if (!rejectionReason || !rejectionReason.trim()) {
      toast.error('Rejection reason is required');
      setProcessing(null);
      return;
    }
    
    try {
      // Update the loan request status to rejected
      const result = await firestore.updateDocument('loanRequests', requestId, {
        status: 'rejected',
        rejectionReason: rejectionReason.trim(),
        rejectedAt: new Date().toISOString(),
        rejectedBy: 'current_user_id' // This should be replaced with actual user ID
      });
      
      if (!result.success) {
        console.error('Error updating loan request status:', result.error);
        toast.error(result.error || 'Failed to reject loan request');
        return;
      }
      
      toast.success('Loan request rejected');
      
      // Create rejection notification for the user
      try {
        const notificationId = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const requestResult = await firestore.getDocument('loanRequests', requestId);
        const requestData = requestResult.success && requestResult.data ? requestResult.data as any : {};
        await firestore.setDocument('notifications', notificationId, {
          userId: requestData.userId,
          userRole: requestData.role || 'member',
          title: 'Loan Rejected',
          message: `Your loan application has been rejected. Reason: ${rejectionReason}`,
          type: 'loan_rejection',
          status: 'unread',
          createdAt: new Date().toISOString(),
          metadata: {
            loanId: requestId,
            reason: rejectionReason,
            planName: requestData.planName || 'General Loan',
            amount: requestData.amount || 0
          }
        });
      } catch (notifError) {
        console.error('Error creating rejection notification:', notifError);
      }
      
      onAction(); // Refresh the data
    } catch (error) {
      console.error('Error rejecting loan:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
                  <div className="text-sm font-medium text-gray-900">{request.fullName || `${request.firstName || ''} ${request.lastName || ''}`.trim() || 'User Not Found'}</div>
                  <div className="text-sm text-gray-500">{request.email}</div>
                  <div className="text-xs text-gray-400">{request.role || 'N/A'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(request.amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {request.term} month{request.term !== 1 ? 's' : ''}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(request.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={request.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {request.status === 'pending' ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleApprove(request.id, request.userId)}
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