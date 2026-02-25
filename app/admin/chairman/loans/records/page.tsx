'use client';

import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/admin';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';

interface Loan {
  id: string;
  memberId?: string;
  memberName?: string;
  userId?: string;
  amount: number;
  remainingAmount?: number;
  status: string;
  loanType?: string;
  term?: number;
  interestRate?: number;
  startDate?: string;
  dueDate?: string;
  createdAt?: string;
  completedAt?: string;
}

export default function ChairmanLoanRecordsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/admin/login');
    } else if (user && user.role?.toLowerCase() !== 'chairman') {
      router.push('/admin/unauthorized');
    }
  }, [user, loading, router]);

  // Fetch loans from Firestore
  useEffect(() => {
    const fetchLoans = async () => {
      try {
        setIsLoading(true);
        
        // Fetch all loans from Firestore
        const result = await firestore.getCollection('loans');
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch loans');
        }

        const loansData = result.data || [];
        
        // Process loans and fetch member names
        const processedLoans = await Promise.all(
          loansData.map(async (loan: any) => {
            let memberName = loan.memberName || 'Unknown Member';
            
            // If we have a memberId but no memberName, fetch the member details
            if (loan.memberId && !loan.memberName) {
              try {
                const memberResult = await firestore.getDocument('members', loan.memberId);
                if (memberResult.success && memberResult.data) {
                  const member = memberResult.data;
                  memberName = `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Unknown Member';
                }
              } catch (error) {
                console.error('Error fetching member:', error);
              }
            }
            
            // Calculate due date based on start date and term
            let dueDate = loan.dueDate || loan.completedAt;
            if (loan.startDate && loan.term && !dueDate) {
              const start = new Date(loan.startDate);
              const due = new Date(start);
              due.setMonth(due.getMonth() + parseInt(loan.term));
              dueDate = due.toISOString();
            }
            
            return {
              id: loan.id,
              memberId: loan.memberId,
              memberName: memberName,
              userId: loan.userId,
              amount: loan.amount || 0,
              remainingAmount: loan.remainingAmount || loan.amount || 0,
              status: loan.status || 'pending',
              loanType: loan.loanType || loan.planName || 'Regular Loan',
              term: loan.term || 0,
              interestRate: loan.interestRate || loan.interest || 0,
              startDate: loan.startDate,
              dueDate: dueDate,
              createdAt: loan.createdAt,
              completedAt: loan.completedAt
            };
          })
        );
        
        // Sort by created date (newest first)
        processedLoans.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        
        setLoans(processedLoans);
      } catch (error) {
        console.error('Error fetching loans:', error);
        toast.error('Failed to load loan records');
      } finally {
        setIsLoading(false);
      }
    };

    if (user && user.role?.toLowerCase() === 'chairman') {
      fetchLoans();
    }
  }, [user]);

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Loan Records</h1>
        <button 
          onClick={() => router.push('/admin/chairman/loans')}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Back
        </button>
      </div>

      <Card>
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-800">All Loans</h3>
        </div>
        <div className="p-6">
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
                    Due Date
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
                {loans.map((loan) => (
                  <tr key={loan.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{loan.memberName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">₱{(loan.amount || 0).toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {loan.dueDate ? new Date(loan.dueDate).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        loan.status === 'active' || loan.status === 'Active'
                          ? 'bg-green-100 text-green-800' 
                          : loan.status === 'paid' || loan.status === 'Paid'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {loan.status || 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-red-600 hover:text-red-900 mr-3">Edit</button>
                      <button className="text-red-600 hover:text-red-900">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}