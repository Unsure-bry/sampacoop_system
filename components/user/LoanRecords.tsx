'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Loan {
  id: string;
  userId: string;
  amount: number;
  term: number;
  startDate: string;
  interest: number;
  status: string;
  planName?: string;
  paymentSchedule?: AmortizationSchedule[];
}

interface AmortizationSchedule {
  month: number;
  paymentDate: string;
  principal: number;
  interest: number;
  totalPayment: number;
  remainingBalance: number;
}

export default function LoanRecords() {
  const { user } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [amortizationSchedule, setAmortizationSchedule] = useState<AmortizationSchedule[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserLoans();
    }
  }, [user]);

  const fetchUserLoans = async () => {
    try {
      setLoading(true);
      
      // Validate that user has a UID
      if (!user?.uid) {
        throw new Error('User not properly authenticated');
      }
      
      // Check if Firestore is initialized
      if (!firestore) {
        throw new Error('Firestore not initialized');
      }
      
      const result = await firestore.queryDocuments('loans', [
        { field: 'userId', operator: '==', value: user?.uid }
      ]);

      if (result.success && result.data) {
        const loansData = result.data.map((doc: any) => ({
          id: doc.id,
          ...doc
        }));
        setLoans(loansData);
      } else {
        // Handle case where query was successful but no data was found
        setLoans([]);
        if (result.error) {
          console.error('Query returned error:', result.error);
        }
      }
    } catch (error: any) {
      console.error('Error fetching user loans:', error);
      toast.error('Failed to load loan records. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const calculateAmortizationSchedule = (loan: Loan): AmortizationSchedule[] => {
    const schedule: AmortizationSchedule[] = [];
    
    const monthlyInterestRate = loan.interest / 100 / 12;
    const numberOfPayments = loan.term;
    const monthlyPayment = (loan.amount * monthlyInterestRate) / (1 - Math.pow(1 + monthlyInterestRate, -numberOfPayments));
    
    let remainingBalance = loan.amount;
    let currentDate = new Date(loan.startDate);
    
    for (let month = 1; month <= numberOfPayments; month++) {
      // Add one month for each payment date
      currentDate.setMonth(currentDate.getMonth() + 1);
      
      const interestPayment = remainingBalance * monthlyInterestRate;
      const principalPayment = monthlyPayment - interestPayment;
      remainingBalance -= principalPayment;
      
      // Ensure remaining balance doesn't go below 0
      if (remainingBalance < 0) {
        remainingBalance = 0;
      }
      
      schedule.push({
        month,
        paymentDate: currentDate.toISOString().split('T')[0],
        principal: principalPayment,
        interest: interestPayment,
        totalPayment: monthlyPayment,
        remainingBalance
      });
    }
    
    return schedule;
  };

  const handleViewSchedule = (loan: Loan) => {
    setScheduleLoading(true);
    setSelectedLoan(loan);
    
    // If the loan already has a payment schedule from the database, use it
    if (loan.paymentSchedule && loan.paymentSchedule.length > 0) {
      setAmortizationSchedule(loan.paymentSchedule);
    } else {
      // Otherwise, calculate the schedule dynamically
      const schedule = calculateAmortizationSchedule(loan);
      setAmortizationSchedule(schedule);
    }
    
    setScheduleLoading(false);
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

  const exportToPDF = () => {
    if (!selectedLoan || amortizationSchedule.length === 0) {
      toast.error('No schedule to export');
      return;
    }

    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text('Amortization Schedule', 14, 20);
    
    // Add loan details
    doc.setFontSize(12);
    doc.text(`Loan ID: ${selectedLoan.id}`, 14, 30);
    doc.text(`Plan: ${selectedLoan.planName || 'N/A'}`, 14, 36);
    doc.text(`Loan Amount: ${formatCurrency(selectedLoan.amount)}`, 14, 42);
    doc.text(`Interest Rate: ${selectedLoan.interest}%`, 14, 48);
    doc.text(`Term: ${selectedLoan.term} months`, 14, 54);
    doc.text(`Start Date: ${formatDate(selectedLoan.startDate)}`, 14, 60);
    
    // Add space before table
    const startY = 68;
    
    // Add table
    autoTable(doc, {
      head: [['Month', 'Payment Date', 'Principal', 'Interest', 'Total Payment', 'Remaining Balance']],
      body: amortizationSchedule.map(item => [
        item.month.toString(),
        formatDate(item.paymentDate),
        formatCurrency(item.principal),
        formatCurrency(item.interest),
        formatCurrency(item.totalPayment),
        formatCurrency(item.remainingBalance)
      ]),
      startY: startY,
      styles: { 
        fontSize: 10,
        cellPadding: 3 
      },
      headStyles: { 
        fillColor: [220, 20, 60] // Red color for header
      }
    });
    
    // Save the PDF
    doc.save(`Amortization-Schedule-${selectedLoan.id}.pdf`);
    toast.success('PDF exported successfully!');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Loan Records</h2>
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Loan Records</h2>
      
      {loans.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">You don't have any loan records yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loans.map((loan) => (
              <div 
                key={loan.id} 
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedLoan?.id === loan.id 
                    ? 'border-red-500 bg-red-50' 
                    : 'border-gray-200 hover:shadow-md'
                }`}
                onClick={() => handleViewSchedule(loan)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-800">{loan.planName || 'Loan'}</h3>
                    <p className="text-sm text-gray-600 mt-1">{formatCurrency(loan.amount)}</p>
                    <p className="text-xs text-gray-500">{loan.term} months • {loan.interest}%</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    loan.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : loan.status === 'completed' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-800'
                  }`}>
                    {loan.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">{formatDate(loan.startDate)}</p>
              </div>
            ))}
          </div>
          
          {selectedLoan && (
            <div className="mt-6 border-t pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  Amortization Schedule for {selectedLoan.planName || 'Loan'}
                </h3>
                <div className="flex space-x-2">
                  <button
                    onClick={exportToPDF}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 0115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    Export PDF
                  </button>
                </div>
              </div>
              
              {scheduleLoading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Month
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Payment Date
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Principal
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Interest
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Payment
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Remaining Balance
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {amortizationSchedule.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.month}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(item.paymentDate)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(item.principal)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(item.interest)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(item.totalPayment)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(item.remainingBalance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}