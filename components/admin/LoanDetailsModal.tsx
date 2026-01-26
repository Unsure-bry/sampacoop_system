'use client';

import { useState, useEffect } from 'react';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  remainingBalance?: number;
  paymentSchedule?: AmortizationSchedule[];
}

interface AmortizationSchedule {
  day: number;
  paymentDate: string;
  principal: number;
  interest: number;
  totalPayment: number;
  remainingBalance: number;
  status?: string;
}

interface LoanDetailsModalProps {
  loan: Loan | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function LoanDetailsModal({ loan, isOpen, onClose }: LoanDetailsModalProps) {
  const [amortizationSchedule, setAmortizationSchedule] = useState<AmortizationSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // State for payment functionality
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  
  // Pagination state for amortization schedule
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (isOpen && loan) {
      loadAmortizationSchedule();
    }
  }, [isOpen, loan]);

  const loadAmortizationSchedule = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the payment schedule from the loan if available
      if (loan && loan.paymentSchedule && loan.paymentSchedule.length > 0) {
        // Map the payment schedule to ensure consistent structure
        const mappedSchedule = loan.paymentSchedule.map((item: any) => ({
          day: item.day !== undefined ? item.day : item.month,
          paymentDate: item.paymentDate,
          principal: item.principal,
          interest: item.interest,
          totalPayment: item.totalPayment,
          remainingBalance: item.remainingBalance,
          status: item.status || 'pending'  // Default to pending if no status
        }));
        setAmortizationSchedule(mappedSchedule);
      } else if (loan) {
        // Calculate the schedule if not available
        const schedule = calculateAmortizationSchedule(loan);
        setAmortizationSchedule(schedule);
      }
    } catch (err) {
      console.error('Error loading amortization schedule:', err);
      setError('Failed to load amortization schedule');
      toast.error('Failed to load amortization schedule');
    } finally {
      setLoading(false);
    }
  };

  const calculateAmortizationSchedule = (loan: Loan): AmortizationSchedule[] => {
    const schedule: AmortizationSchedule[] = [];
    
    // Convert loan term to days (1 month = 30 days)
    const totalDays = loan.term * 30;
    
    // Calculate daily interest rate
    const dailyInterestRate = loan.interest / 100 / 365; // Annual interest rate divided by 365 days
    
    // Calculate daily payment
    const dailyPayment = loan.amount / totalDays;
    
    let remainingBalance = loan.amount;
    let currentDate = new Date(loan.startDate);
    
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
      
      schedule.push({
        day,
        paymentDate: currentDate.toISOString().split('T')[0],
        principal: principalPayment,
        interest: interestPayment,
        totalPayment: principalPayment + interestPayment,
        remainingBalance
      });
    }
    
    return schedule;
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
    if (!loan || amortizationSchedule.length === 0) {
      toast.error('No schedule to export');
      return;
    }

    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text('Loan Amortization Schedule', 14, 20);
    
    // Add loan details
    doc.setFontSize(12);
    doc.text(`Member: ${loan.fullName}`, 14, 30);
    doc.text(`Role: ${loan.role}`, 14, 36);
    doc.text(`Loan ID: ${loan.id}`, 14, 42);
    doc.text(`Loan Amount: ${formatCurrency(loan.amount)}`, 14, 48);
    doc.text(`Interest Rate: ${loan.interest}%`, 14, 54);
    doc.text(`Term: ${loan.term} months`, 14, 60);
    doc.text(`Start Date: ${formatDate(loan.startDate)}`, 14, 66);
    doc.text(`Status: ${loan.status}`, 14, 72);
    
    // Add space before table
    const startY = 80;
    
    // Add table
    autoTable(doc, {
      head: [['Day', 'Payment Date', 'Principal', 'Interest', 'Total Payment', 'Remaining Balance']],
      body: amortizationSchedule.map(item => [
        (item.day || '').toString(),
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
    doc.save(`Amortization-Schedule-${loan.id}.pdf`);
    toast.success('PDF exported successfully!');
  };

  const printSchedule = () => {
    if (!loan || amortizationSchedule.length === 0) {
      toast.error('No schedule to print');
      return;
    }

    // Create a new window with the schedule data
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Loan Amortization Schedule - ${loan.id}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 20px; }
              .info { margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              .center { text-align: center; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Loan Amortization Schedule</h1>
            </div>
            <div class="info">
              <p><strong>Member:</strong> ${loan.fullName}</p>
              <p><strong>Role:</strong> ${loan.role}</p>
              <p><strong>Loan ID:</strong> ${loan.id}</p>
              <p><strong>Loan Amount:</strong> ${formatCurrency(loan.amount)}</p>
              <p><strong>Interest Rate:</strong> ${loan.interest}%</p>
              <p><strong>Term:</strong> ${loan.term} months</p>
              <p><strong>Start Date:</strong> ${formatDate(loan.startDate)}</p>
              <p><strong>Status:</strong> ${loan.status}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th class="center">Day</th>
                  <th>Payment Date</th>
                  <th class="center">Principal</th>
                  <th class="center">Interest</th>
                  <th class="center">Total Payment</th>
                  <th class="center">Remaining Balance</th>
                </tr>
              </thead>
              <tbody>
                ${amortizationSchedule.map(item => `
                  <tr>
                    <td class="center">${item.day || ''}</td>
                    <td>${formatDate(item.paymentDate)}</td>
                    <td class="center">${formatCurrency(item.principal)}</td>
                    <td class="center">${formatCurrency(item.interest)}</td>
                    <td class="center">${formatCurrency(item.totalPayment)}</td>
                    <td class="center">${formatCurrency(item.remainingBalance)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  // Function to handle loan payment
  const handlePayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    const amount = parseFloat(paymentAmount);
    setPaymentLoading(true);

    try {
      // Find unpaid payments that can be covered by this payment
      let remainingPayment = amount;
      const updatedSchedule = [...amortizationSchedule];
      let paymentsApplied = 0;

      for (let i = 0; i < updatedSchedule.length; i++) {
        if (updatedSchedule[i].status !== 'paid' && remainingPayment > 0) {
          const totalPaymentDue = updatedSchedule[i].totalPayment;
          
          if (remainingPayment >= totalPaymentDue) {
            // Full payment for this installment
            updatedSchedule[i].status = 'paid';
            remainingPayment -= totalPaymentDue;
            paymentsApplied++;
          } else {
            // Partial payment - typically we'd want full payments but we'll mark as partial if needed
            // For simplicity, we'll consider this as covering the partial amount
            updatedSchedule[i].status = 'partial';
            remainingPayment = 0;
            paymentsApplied++;
            break;
          }
        }
      }

      // Calculate the new remaining balance after payments
      const newRemainingBalance = calculateRemainingBalanceFromSchedule(updatedSchedule);
      
      // Update the loan document with the new payment schedule and remaining balance
      const updateResult = await firestore.updateDocument('loans', loan!.id, {
        paymentSchedule: updatedSchedule,
        remainingBalance: newRemainingBalance
      });

      if (updateResult.success) {
        setAmortizationSchedule(updatedSchedule);
        toast.success(`${paymentsApplied} payment${paymentsApplied !== 1 ? 's' : ''} marked as paid!`);
        
        // Close the payment modal and reset state
        setShowPaymentModal(false);
        setPaymentAmount('');
        
        // Check if all payments are completed to update loan status
        const allPaid = updatedSchedule.every(item => item.status === 'paid');
        if (allPaid) {
          await firestore.updateDocument('loans', loan!.id, {
            status: 'completed'
          });
          toast.success('All payments completed! Loan marked as completed.');
        }
      } else {
        toast.error('Failed to update payment status');
      }
    } catch (err) {
      console.error('Error processing payment:', err);
      toast.error('Failed to process payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  // Calculate current page data for amortization schedule
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = amortizationSchedule.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(amortizationSchedule.length / itemsPerPage);

  // Calculate remaining balance based on the latest unpaid payment
  const calculateRemainingBalance = () => {
    // If the loan document has a remainingBalance property, use that
    if (loan && loan.remainingBalance !== undefined) {
      return loan.remainingBalance;
    }
    
    // Otherwise, calculate from the amortization schedule
    if (amortizationSchedule.length === 0) return loan?.amount || 0;
    
    // Find all unpaid items (not paid or partial)
    const unpaidItems = amortizationSchedule.filter(item => 
      item.status !== 'paid' && item.status !== 'completed'
    );
    
    // If there are unpaid items, return the remaining balance of the last unpaid item
    if (unpaidItems.length > 0) {
      return unpaidItems[unpaidItems.length - 1].remainingBalance;
    }
    
    // If all items are paid, return 0
    return 0;
  };
  
  // Helper function to calculate remaining balance from a given schedule
  const calculateRemainingBalanceFromSchedule = (schedule: AmortizationSchedule[]) => {
    // Find all unpaid items (not paid or partial)
    const unpaidItems = schedule.filter(item => 
      item.status !== 'paid' && item.status !== 'completed'
    );
      
    // If there are unpaid items, return the remaining balance of the last unpaid item
    if (unpaidItems.length > 0) {
      return unpaidItems[unpaidItems.length - 1].remainingBalance;
    }
      
    // If all items are paid, return 0
    return 0;
  };

  if (!isOpen || !loan) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Loan Details</h2>
                <p className="text-gray-600">ID: {loan.id}</p>
              </div>
              <button 
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Loan Information Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Member Name</p>
                <p className="font-medium">{loan.fullName}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Role</p>
                <p className="font-medium">{loan.role}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Loan Amount</p>
                <p className="font-medium">{formatCurrency(loan.amount)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Status</p>
                <p className="font-medium">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    loan.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : loan.status === 'completed' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-800'
                  }`}>
                    {loan.status}
                  </span>
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Interest Rate</p>
                <p className="font-medium">{loan.interest}%</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Term</p>
                <p className="font-medium">{loan.term} months</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Start Date</p>
                <p className="font-medium">{formatDate(loan.startDate)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Remaining Balance</p>
                <p className="font-medium">
                  {formatCurrency(calculateRemainingBalance())}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={exportToPDF}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                Export PDF
              </button>
              <button
                onClick={printSchedule}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Schedule
              </button>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Make Payment
              </button>
            </div>

            {/* Amortization Schedule */}
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Amortization Schedule</h3>
              
              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
                </div>
              ) : error ? (
                <div className="text-red-500 text-center py-8">{error}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Day
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
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentItems.map((item, index) => (
                        <tr key={indexOfFirstItem + index} className={`hover:bg-gray-50 ${item.status === 'paid' ? 'bg-green-50' : item.status === 'partial' ? 'bg-yellow-50' : ''}`}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.day || ''}
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
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              item.status === 'paid' 
                                ? 'bg-green-100 text-green-800' 
                                : item.status === 'partial' 
                                  ? 'bg-yellow-100 text-yellow-800' 
                                  : 'bg-gray-100 text-gray-800'
                            }`}>
                              {item.status || 'pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                      <div className="text-sm text-gray-700">
                        Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                        <span className="font-medium">
                          {Math.min(indexOfLastItem, amortizationSchedule.length)}
                        </span>{' '}
                        of <span className="font-medium">{amortizationSchedule.length}</span> payments
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className={`px-3 py-1 rounded-md text-sm font-medium ${
                            currentPage === 1
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          Previous
                        </button>
                        
                        <span className="px-3 py-1 text-sm font-medium text-gray-700">
                          Page {currentPage} of {totalPages}
                        </span>
                        
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className={`px-3 py-1 rounded-md text-sm font-medium ${
                            currentPage === totalPages
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800">Make Loan Payment</h3>
                <button 
                  onClick={() => setShowPaymentModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter payment amount"
                />
              </div>
              
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Remaining Balance:</span> {formatCurrency(calculateRemainingBalance())}
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  disabled={paymentLoading}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePayment}
                  disabled={paymentLoading || !paymentAmount || parseFloat(paymentAmount) <= 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {paymentLoading ? 'Processing...' : 'Process Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

}
