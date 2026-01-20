/**
 * Example of how to refactor LoanRequestsManager using the new useFirestoreData hook
 * This approach eliminates the need for composite indexes entirely
 */

'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useLoanRequests } from '@/hooks/useFirestoreData';
import LoanRequestDetailsModal from './LoanRequestDetailsModal';
import Pagination from './Pagination';

export default function LoanRequestsManagerRefactored() {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Pagination state
  const [pendingCurrentPage, setPendingCurrentPage] = useState(1);
  const [approvedCurrentPage, setApprovedCurrentPage] = useState(1);
  const [rejectedCurrentPage, setRejectedCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Use the new hooks - no composite indexes required!
  const {
    data: pendingRequests,
    loading: pendingLoading,
    error: pendingError
  } = useLoanRequests('pending');

  const {
    data: approvedRequests,
    loading: approvedLoading,
    error: approvedError
  } = useLoanRequests('approved');

  const {
    data: rejectedRequests,
    loading: rejectedLoading,
    error: rejectedError
  } = useLoanRequests('rejected');

  const loading = pendingLoading || approvedLoading || rejectedLoading;
  const hasErrors = pendingError || approvedError || rejectedError;

  // Get paginated data
  const getCurrentPageData = (data: any[], currentPage: number) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const pendingPageData = getCurrentPageData(pendingRequests, pendingCurrentPage);
  const approvedPageData = getCurrentPageData(approvedRequests, approvedCurrentPage);
  const rejectedPageData = getCurrentPageData(rejectedRequests, rejectedCurrentPage);

  const handleApprove = async (requestId: string, userId: string, planName: string, amount: number, term: number) => {
    // Your existing approval logic here
    toast.success('Loan request approved successfully!');
  };

  const handleReject = async (requestId: string, rejectionReason: string) => {
    // Your existing rejection logic here
    toast.success('Loan request rejected successfully!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (hasErrors) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-medium">Error Loading Data</h3>
        <p className="text-red-600 mt-1">
          There was an error loading loan requests. Please refresh the page or contact support.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {(['pending', 'approved', 'rejected'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)} Requests
              {tab === 'pending' && ` (${pendingRequests.length})`}
              {tab === 'approved' && ` (${approvedRequests.length})`}
              {tab === 'rejected' && ` (${rejectedRequests.length})`}
            </button>
          ))}
        </nav>
      </div>

      {/* Content based on active tab */}
      <div className="mt-6">
        {activeTab === 'pending' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Pending Loan Requests</h3>
            {pendingPageData.length === 0 ? (
              <p className="text-gray-500">No pending loan requests found.</p>
            ) : (
              <>
                {/* Your table component here */}
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Member
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Term
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Requested
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {pendingPageData.map((request) => (
                        <tr 
                          key={request.id} 
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                            setSelectedRequest(request);
                            setIsModalOpen(true);
                          }}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {request.fullName || `${request.firstName} ${request.lastName}`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ₱{request.amount?.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {request.term} months
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(request.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button className="text-red-600 hover:text-red-900 mr-3">
                              Approve
                            </button>
                            <button className="text-gray-600 hover:text-gray-900">
                              Reject
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination */}
                <Pagination
                  currentPage={pendingCurrentPage}
                  totalPages={Math.ceil(pendingRequests.length / itemsPerPage)}
                  onPageChange={setPendingCurrentPage}
                />
              </>
            )}
          </div>
        )}

        {activeTab === 'approved' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Approved Loan Requests</h3>
            {approvedPageData.length === 0 ? (
              <p className="text-gray-500">No approved loan requests found.</p>
            ) : (
              /* Similar table structure for approved requests */
              <div>Approved requests table would go here</div>
            )}
          </div>
        )}

        {activeTab === 'rejected' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Rejected Loan Requests</h3>
            {rejectedPageData.length === 0 ? (
              <p className="text-gray-500">No rejected loan requests found.</p>
            ) : (
              /* Similar table structure for rejected requests */
              <div>Rejected requests table would go here</div>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
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