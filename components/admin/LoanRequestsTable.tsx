'use client';

import { useState, useEffect } from 'react';
import { firestore, db } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

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
}

interface User {
  id: string;
  displayName: string;
  role: string;
  email: string;
  [key: string]: any;
}

export default function LoanRequestsTable() {
  const [loanRequests, setLoanRequests] = useState<LoanRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if Firestore is initialized
    if (!db) {
      console.error('Firestore is not initialized');
      toast.error('Database connection error');
      setLoading(false);
      return;
    }

    // Set up real-time listener for pending loan requests
    const q = query(
      collection(db, 'loanRequests'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const requestsData: LoanRequest[] = [];
      querySnapshot.forEach((doc) => {
        requestsData.push({
          id: doc.id,
          ...doc.data() as Omit<LoanRequest, 'id'>
        });
      });
      
      setLoanRequests(requestsData);
      setLoading(false);
    }, (error) => {
      console.error('Error listening to loan requests:', error);
      toast.error('Failed to listen to loan requests');
      setLoading(false);
    });

    // Clean up listener on unmount
    return () => unsubscribe();
  }, []);

  const handleApprove = async (requestId: string, userId: string, planName: string, amount: number, term: number) => {
    try {
      // Update loan request status with approved timestamp
      const updateResult = await firestore.updateDocument('loanRequests', requestId, {
        status: 'approved',
        approvedAt: new Date().toISOString()
      });

      if (updateResult.success) {

        // Fetch loan request data to get member information
        const requestResult = await firestore.getDocument('loanRequests', requestId);
        let memberData = {
          fullName: 'User Not Found',
          role: 'N/A'
        };

        if (requestResult.success && requestResult.data) {
          const requestData = requestResult.data as any;

          // Use member information from the loan request
          const fullName = requestData.fullName || `${requestData.firstName || ''} ${requestData.lastName || ''}`.trim() || 'User Not Found';
          memberData = {
            fullName: fullName,
            role: requestData.role || 'N/A'
          };
        } else {
          // Fallback to fetching from users collection
          const userResult = await firestore.getDocument('users', userId);
          if (userResult.success && userResult.data) {
            const userDoc = userResult.data as any;
            
            const fullName = userDoc.displayName || 'User Not Found';
            memberData = {
              fullName: fullName,
              role: userDoc.role || 'N/A'
            };
          }
        }
        

        // Create approved loan document in the loans collection with member details
        const loanData = {
          userId: userId,
          fullName: memberData.fullName,
          role: memberData.role,
          amount: amount,
          term: term,
          planName: planName,
          startDate: new Date().toISOString(),
          interest: 3, // Fixed interest rate as per requirements
          status: 'active',
          // In a real app, you would generate a proper payment schedule here
          paymentSchedule: []
        };

        const loanResult = await firestore.setDocument(
          'loans',
          `${userId}-${requestId}`,
          loanData
        );

        if (loanResult.success) {
          toast.success('Loan request approved successfully!');
        } else {
          toast.error('Failed to create loan. Please try again.');
        }
      } else {
        toast.error('Failed to approve loan request. Please try again.');
      }
    } catch (error) {
      console.error('Error approving loan request:', error);
      toast.error('An error occurred. Please try again.');
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      const result = await firestore.updateDocument('loanRequests', requestId, {
        status: 'rejected',
        rejectedAt: new Date().toISOString()
      });

      if (result.success) {
        toast.success('Loan request rejected');
      } else {
        toast.error('Failed to reject loan request. Please try again.');
      }
    } catch (error) {
      console.error('Error rejecting loan request:', error);
      toast.error('An error occurred. Please try again.');
    }
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

  const getFullName = (user: User | undefined) => {
    if (!user) return 'User Not Found';
    
    return user.displayName || 'User Not Found';
  };

  const getUserRole = (user: User | undefined) => {
    if (!user) return 'N/A';
    return user.role || 'N/A';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Plan
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Term
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Requested
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loanRequests.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  No pending loan requests
                </td>
              </tr>
            ) : (
              loanRequests.map((request) => {
                // Use the member information directly from the request
                const fullName = request.fullName || `${request.firstName || ''} ${request.lastName || ''}`.trim() || 'User Not Found';
                const role = request.role || 'N/A';
                const email = request.email || 'N/A';
                
                return (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {fullName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {email}
                      </div>
                      <div className="text-xs text-gray-400">
                        {role}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {request.planName || 'General Loan'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(request.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {request.term} month{request.term !== 1 ? 's' : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(request.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleApprove(request.id, request.userId, request.planName || 'General Loan', request.amount, request.term)}
                        className="text-green-600 hover:text-green-900 mr-3"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(request.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
