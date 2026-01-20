'use client';

import { useState, useEffect } from 'react';
import { firestore, db } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { collection, query, where, orderBy, onSnapshot, limit, startAfter } from 'firebase/firestore';
import LoanRequestDetailsModal from './LoanRequestDetailsModal';
import Pagination from './Pagination';

/*
 * NOTE: This component requires specific Firestore composite indexes to function properly.
 * If you encounter "failed-precondition" errors, please ensure the following indexes are created:
 * 
 * 1. loanRequests collection:
 *    - Fields: status (ASC), createdAt (DESC), __name__ (ASC)
 *    - Purpose: For querying pending loan requests
 * 
 * 2. loanRequests collection:
 *    - Fields: status (ASC), approvedAt (DESC), __name__ (ASC)
 *    - Purpose: For querying approved loan requests
 * 
 * 3. loanRequests collection:
 *    - Fields: status (ASC), rejectedAt (DESC), __name__ (ASC)
 *    - Purpose: For querying rejected loan requests
 * 
 * To create these indexes, see docs/FIRESTORE_INDEXES.md or run: npm run deploy-loan-indexes
 */

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

interface User {
  id: string;
  displayName: string;
  role: string;
  email: string;
  [key: string]: any;
}

export default function LoanRequestsManager() {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [pendingRequests, setPendingRequests] = useState<LoanRequest[]>([]);
  const [approvedRequests, setApprovedRequests] = useState<LoanRequest[]>([]);
  const [rejectedRequests, setRejectedRequests] = useState<LoanRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<LoanRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Pagination state
  const [pendingCurrentPage, setPendingCurrentPage] = useState(1);
  const [approvedCurrentPage, setApprovedCurrentPage] = useState(1);
  const [rejectedCurrentPage, setRejectedCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Function to refresh data
  const refreshData = async () => {
    setLoading(true);
    try {
      // Fetch pending loan requests
      const pendingResult = await firestore.queryDocuments('loanRequests', [
        { field: 'status', operator: '==', value: 'pending' }
      ]);
      
      if (pendingResult.success && pendingResult.data) {
        const pendingData: LoanRequest[] = pendingResult.data
          .map((doc: any) => ({
            id: doc.id,
            ...doc
          }))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setPendingRequests(pendingData);
      } else {
        setPendingRequests([]);
      }

      // Fetch approved loan requests
      const approvedResult = await firestore.queryDocuments('loanRequests', [
        { field: 'status', operator: '==', value: 'approved' }
      ]);
      
      if (approvedResult.success && approvedResult.data) {
        const approvedData: LoanRequest[] = approvedResult.data
          .map((doc: any) => ({
            id: doc.id,
            ...doc
          }))
          .sort((a, b) => new Date(b.approvedAt || b.createdAt).getTime() - new Date(a.approvedAt || a.createdAt).getTime());
        setApprovedRequests(approvedData);
      } else {
        setApprovedRequests([]);
      }

      // Fetch rejected loan requests
      const rejectedResult = await firestore.queryDocuments('loanRequests', [
        { field: 'status', operator: '==', value: 'rejected' }
      ]);
      
      if (rejectedResult.success && rejectedResult.data) {
        const rejectedData: LoanRequest[] = rejectedResult.data
          .map((doc: any) => ({
            id: doc.id,
            ...doc
          }))
          .sort((a, b) => new Date(b.rejectedAt || b.createdAt).getTime() - new Date(a.rejectedAt || a.createdAt).getTime());
        setRejectedRequests(rejectedData);
      } else {
        setRejectedRequests([]);
      }
    } catch (error) {
      console.error('Error in data refresh:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if Firestore is initialized
    if (!db) {
      console.error('Firestore is not initialized');
      toast.error('Database connection error');
      setLoading(false);
      return;
    }

    // Set up real-time listeners for all loan request statuses (without orderBy to avoid index requirements)
    const pendingQuery = query(
      collection(db, 'loanRequests'),
      where('status', '==', 'pending')
    );

    const approvedQuery = query(
      collection(db, 'loanRequests'),
      where('status', '==', 'approved')
    );

    const rejectedQuery = query(
      collection(db, 'loanRequests'),
      where('status', '==', 'rejected')
    );

    const unsubscribePending = onSnapshot(pendingQuery, 
      (querySnapshot) => {
        const requestsData: LoanRequest[] = [];
        querySnapshot.forEach((doc) => {
          const docData = doc.data();
          requestsData.push({
            id: doc.id,
            ...docData as Omit<LoanRequest, 'id'>
          });
        });
        // Sort client-side by createdAt (descending)
        const sortedData = requestsData.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setPendingRequests(sortedData);
      },
      (error) => {
        console.error('Error in pending loan requests listener:', error);
        if (error.code === 'failed-precondition') {
          toast.error('Firestore index error: Please contact administrator to enable required indexes');
        } else {
          toast.error('Error loading pending loan requests');
        }
      }
    );

    const unsubscribeApproved = onSnapshot(approvedQuery, 
      (querySnapshot) => {
        const requestsData: LoanRequest[] = [];
        querySnapshot.forEach((doc) => {
          const docData = doc.data();
          requestsData.push({
            id: doc.id,
            ...docData as Omit<LoanRequest, 'id'>
          });
        });
        // Sort client-side by approvedAt (descending), fallback to createdAt
        const sortedData = requestsData.sort((a, b) => 
          new Date(b.approvedAt || b.createdAt).getTime() - new Date(a.approvedAt || a.createdAt).getTime()
        );
        setApprovedRequests(sortedData);
      },
      (error) => {
        console.error('Error in approved loan requests listener:', error);
        if (error.code === 'failed-precondition') {
          toast.error('Firestore index error: Please contact administrator to enable required indexes');
        } else {
          toast.error('Error loading approved loan requests');
        }
      }
    );

    const unsubscribeRejected = onSnapshot(rejectedQuery, 
      (querySnapshot) => {
        const requestsData: LoanRequest[] = [];
        querySnapshot.forEach((doc) => {
          const docData = doc.data();
          requestsData.push({
            id: doc.id,
            ...docData as Omit<LoanRequest, 'id'>
          });
        });
        // Sort client-side by rejectedAt (descending), fallback to createdAt
        const sortedData = requestsData.sort((a, b) => 
          new Date(b.rejectedAt || b.createdAt).getTime() - new Date(a.rejectedAt || a.createdAt).getTime()
        );
        setRejectedRequests(sortedData);
      },
      (error) => {
        console.error('Error in rejected loan requests listener:', error);
        if (error.code === 'failed-precondition') {
          toast.error('Firestore index error: Please contact administrator to enable required indexes');
        } else {
          toast.error('Error loading rejected loan requests');
        }
      }
    );

    // Initial data load
    refreshData();

    // Clean up listeners on unmount
    return () => {
      unsubscribePending();
      unsubscribeApproved();
      unsubscribeRejected();
    };
  }, []);

  const handleApprove = async (requestId: string, userId: string, planName: string, amount: number, term: number) => {
    try {
      // Update loan request status with approved timestamp
      const updateResult = await firestore.updateDocument('loanRequests', requestId, {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: 'current_user_id' // This should be replaced with actual user ID
      });

      if (updateResult.success) {
        // Fetch loan request data to get member information
        const requestResult = await firestore.getDocument('loanRequests', requestId);
        let memberData = {
          fullName: 'User Not Found',
          role: 'N/A'
        };
        let interestRate = 3; // Default interest rate

        if (requestResult.success && requestResult.data) {
          const requestData = requestResult.data as any;

          // Use member information from the loan request
          const fullName = requestData.fullName || `${requestData.firstName || ''} ${requestData.lastName || ''}`.trim() || 'User Not Found';
          memberData = {
            fullName: fullName,
            role: requestData.role || 'N/A'
          };
          
          // Get interest rate from loan plan
          if (requestData.planId) {
            const planResult = await firestore.getDocument('loanPlans', requestData.planId);
            if (planResult.success && planResult.data) {
              const planData = planResult.data as any;
              interestRate = planData.interestRate || 3;
            }
          }
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

        // Calculate daily amortization schedule
        // Convert loan term to days (1 month = 30 days)
        const totalDays = term * 30;
        
        // Calculate daily interest rate
        const dailyInterestRate = interestRate / 100 / 365; // Annual interest rate divided by 365 days
        
        // Calculate daily payment
        const dailyPayment = amount / totalDays;
        
        // Generate payment schedule
        let remainingBalance = amount;
        let currentDate = new Date();
        const paymentSchedule = [];
        
        for (let day = 1; day <= totalDays; day++) {
          // Add one day for each payment date
          currentDate.setDate(currentDate.getDate() + 1);
          
          const interestPayment = remainingBalance * dailyInterestRate;
          const principalPayment = dailyPayment;
          remainingBalance -= principalPayment;
          
          // Ensure remaining balance doesn't go below 0
          if (remainingBalance < 0) {
            remainingBalance = 0;
          }
          
          paymentSchedule.push({
            day,
            paymentDate: currentDate.toISOString().split('T')[0],
            principal: principalPayment,
            interest: interestPayment,
            totalPayment: principalPayment + interestPayment,
            remainingBalance,
            status: 'pending' // Initial status for payments
          });
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
          interest: interestRate, // Interest rate from loan plan
          status: 'active',
          paymentSchedule: paymentSchedule
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

  const handleReject = async (requestId: string, rejectionReason: string) => {
    if (!rejectionReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }

    try {
      const result = await firestore.updateDocument('loanRequests', requestId, {
        status: 'rejected',
        rejectionReason: rejectionReason,
        rejectedAt: new Date().toISOString(),
        rejectedBy: 'current_user_id' // This should be replaced with actual user ID
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

  const handleRowClick = (request: LoanRequest) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  // Filter requests based on search term
  const filterRequests = (requests: LoanRequest[]) => {
    if (!searchTerm.trim()) return requests;
    
    const term = searchTerm.toLowerCase().trim();
    return requests.filter(request => {
      const fullName = request.fullName || 
                      `${request.firstName || ''} ${request.lastName || ''}`.trim() || 
                      'User Not Found';
      const email = request.email || '';
      const planName = request.planName || 'General Loan';
      
      return (
        fullName.toLowerCase().includes(term) ||
        email.toLowerCase().includes(term) ||
        planName.toLowerCase().includes(term) ||
        request.id.toLowerCase().includes(term) ||
        (request.role && request.role.toLowerCase().includes(term))
      );
    });
  };

  const renderTable = (requests: LoanRequest[], status: string) => {
    // Get current page data based on status
    const getCurrentPage = () => {
      switch(status) {
        case 'pending':
          return pendingCurrentPage;
        case 'approved':
          return approvedCurrentPage;
        case 'rejected':
          return rejectedCurrentPage;
        default:
          return 1;
      }
    };
    
    const setCurrentPage = (page: number) => {
      switch(status) {
        case 'pending':
          setPendingCurrentPage(page);
          break;
        case 'approved':
          setApprovedCurrentPage(page);
          break;
        case 'rejected':
          setRejectedCurrentPage(page);
          break;
      }
    };
    
    const getPageData = () => {
      const filteredRequests = filterRequests(requests);
      const startIndex = (getCurrentPage() - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      return filteredRequests.slice(startIndex, endIndex);
    };
    
    const getTotalPages = () => {
      const filteredRequests = filterRequests(requests);
      return Math.ceil(filteredRequests.length / itemsPerPage);
    };
    
    const currentPageData = getPageData();
    const totalPages = getTotalPages();
    
    if (currentPageData.length === 0) {
      return (
        <tr>
          <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
            No {status} loan requests
          </td>
        </tr>
      );
    }

    return currentPageData.map((request) => {
      // Use the member information directly from the request
      const fullName = request.fullName || `${request.firstName || ''} ${request.lastName || ''}`.trim() || 'User Not Found';
      const role = request.role || 'N/A';
      const email = request.email || 'N/A';

      return (
        <tr 
          key={request.id} 
          className="hover:bg-gray-50 cursor-pointer"
          onClick={() => handleRowClick(request)}
        >
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
            {status === 'pending' && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Show a prompt for rejection reason
                    const reason = prompt('Enter rejection reason:');
                    if (reason) {
                      handleReject(request.id, reason);
                    }
                  }}
                  className="text-red-600 hover:text-red-900 mr-3"
                >
                  Reject
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApprove(request.id, request.userId, request.planName || 'General Loan', request.amount, request.term);
                  }}
                  className="text-green-600 hover:text-green-900"
                >
                  Approve
                </button>
              </>
            )}
            {status === 'rejected' && (
              <span className="text-xs text-red-600">
                {request.rejectionReason || 'No reason provided'}
              </span>
            )}
          </td>
        </tr>
      );
    });
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 px-6">
          <button
            onClick={() => setActiveTab('pending')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pending'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pending ({pendingRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'approved'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Approved ({approvedRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'rejected'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Rejected ({rejectedRequests.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-4 bg-gray-50">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-lg font-medium text-gray-800">
            {activeTab === 'pending' && 'Pending Loan Requests'}
            {activeTab === 'approved' && 'Approved Loans'}
            {activeTab === 'rejected' && 'Rejected Loan Requests'}
          </h3>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name, email, plan, or ID..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 w-full sm:w-64 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <button 
              onClick={refreshData}
              disabled={loading}
              className="px-3 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

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
            {activeTab === 'pending' && renderTable(pendingRequests, 'pending')}
            {activeTab === 'approved' && renderTable(approvedRequests, 'approved')}
            {activeTab === 'rejected' && renderTable(rejectedRequests, 'rejected')}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
        {activeTab === 'pending' && pendingRequests.length > 0 && (
          <Pagination 
            currentPage={pendingCurrentPage} 
            totalPages={Math.ceil(pendingRequests.length / itemsPerPage)} 
            onPageChange={setPendingCurrentPage} 
          />
        )}
        {activeTab === 'approved' && approvedRequests.length > 0 && (
          <Pagination 
            currentPage={approvedCurrentPage} 
            totalPages={Math.ceil(approvedRequests.length / itemsPerPage)} 
            onPageChange={setApprovedCurrentPage} 
          />
        )}
        {activeTab === 'rejected' && rejectedRequests.length > 0 && (
          <Pagination 
            currentPage={rejectedCurrentPage} 
            totalPages={Math.ceil(rejectedRequests.length / itemsPerPage)} 
            onPageChange={setRejectedCurrentPage} 
          />
        )}
      </div>

      {/* Details Modal */}
      <LoanRequestDetailsModal
        request={selectedRequest}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}