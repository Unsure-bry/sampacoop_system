'use client';

import { useState, useEffect } from 'react';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';

interface Loan {
  id: string;
  userId: string;
  fullName: string;
  role: string;
  amount: number;
  term: number;
  startDate: string;
  interest: number;
  status: string;
}

interface User {
  id: string;
  displayName: string;
  role: string;
  email: string;
  [key: string]: any;
}

export default function LoanRecordsPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLoanRecords();
  }, []);

  const fetchLoanRecords = async () => {
    try {
      setLoading(true);
      
      // Fetch all loans
      const result = await firestore.getCollection('loans');

      if (result.success && result.data) {
        const loansData = result.data.map((doc: any) => ({
          id: doc.id,
          ...doc
        }));
        setLoans(loansData);
        
        // Fetch user data for each loan
        fetchUsersForLoans(loansData);
      }
    } catch (error) {
      console.error('Error fetching loan records:', error);
      toast.error('Failed to load loan records');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersForLoans = async (loans: Loan[]) => {
    try {
      const userIds = [...new Set(loans.map(loan => loan.userId))];
      const usersData: Record<string, User> = {};
      
      // Fetch each user individually
      for (const userId of userIds) {
        const userResult = await firestore.getDocument('users', userId);
        if (userResult.success && userResult.data) {
          usersData[userId] = {
            id: userId,
            ...userResult.data as any
          };
        }
      }
      
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
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
      day: 'numeric'
    });
  };

  const getFullName = (loan: Loan, user: User | undefined) => {
    
    // Prioritize embedded user data in loan record
    if (loan.fullName && loan.fullName !== 'Unknown Member' && loan.fullName !== 'User Not Found') {
      return loan.fullName;
    }
    
    // Fallback to fetched user data
    if (!user) return '';
    
    // Use displayName from user data
    return user.displayName || 'User Unknown';
  };

  const getUserRole = (loan: Loan, user: User | undefined) => {
    // Prioritize embedded user data in loan record
    if (loan.role && loan.role !== 'N/A') {
      return loan.role;
    }
    
    // Fallback to fetched user data
    if (!user) return 'N/A';
    return user.role || 'N/A';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Loan Records</h1>
          <p className="text-gray-600">View all loan records</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Loan Records</h1>
        <p className="text-gray-600">View all loan records</p>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Term
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Interest
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Start Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No loan records found
                  </td>
                </tr>
              ) : (
                loans.map((loan) => {
                  const user = users[loan.userId];
                  const fullName = getFullName(loan, user);
                  const role = getUserRole(loan, user);
                  
                  return (
                    <tr key={loan.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {fullName} — {role}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(loan.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {loan.term} month{loan.term !== 1 ? 's' : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {loan.interest}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(loan.startDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          loan.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : loan.status === 'completed' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-gray-100 text-gray-800'
                        }`}>
                          {loan.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}