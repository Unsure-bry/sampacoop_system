'use client';

import { useState, useEffect } from 'react';
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
  receiptNumber?: string;
  paymentDateProcessed?: string;
  partialPaymentAmount?: number; // Track how much was paid for partial payments
  paidAmount?: number; // Track total paid amount for this day
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
  // Payment functionality removed - admin handles payments separately
  
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
      
      // Always calculate the schedule using the correct formula
      // This ensures the amortization calculation is consistent and accurate
      if (loan) {
        const calculatedSchedule = calculateAmortizationSchedule(loan);
        
        // Merge payment status from Firestore if available
        // IMPORTANT: Only merge payment status info, keep calculated values
        const scheduleWithPayments = calculatedSchedule.map((calcItem, index) => {
          const storedItem = loan.paymentSchedule?.[index];
          if (storedItem) {
            return {
              ...calcItem, // Keep calculated values (principal, interest, totalPayment, remainingBalance)
              status: storedItem.status, // Merge payment status
              receiptNumber: storedItem.receiptNumber, // Merge receipt number
              paymentDateProcessed: storedItem.paymentDateProcessed, // Merge processed date
              partialPaymentAmount: storedItem.partialPaymentAmount, // Merge partial payment
              paidAmount: storedItem.paidAmount // Merge paid amount
            };
          }
          return calcItem;
        });
        
        setAmortizationSchedule(scheduleWithPayments);
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
    
    const principal = loan.amount || 0;
    const annualInterest = loan.interest || 0;
    const termMonths = loan.term || 0;
    const totalDays = termMonths * 30; // Convert months to days (30 days per month)
    
    if (principal <= 0 || totalDays <= 0) return [];
    
    const dailyInterestRate = (annualInterest / 100) / 365; // Daily interest rate
    let dailyPayment: number;
    
    if (dailyInterestRate === 0) {
      dailyPayment = principal / totalDays;
    } else {
      dailyPayment = principal * (dailyInterestRate * Math.pow(1 + dailyInterestRate, totalDays)) / (Math.pow(1 + dailyInterestRate, totalDays) - 1);
    }
    
    let remainingBalance = principal;
    const startDate = loan.startDate ? new Date(loan.startDate) : new Date();
    let currentDate = new Date(startDate);
    
    for (let day = 1; day <= totalDays; day++) {
      // Add one day for each payment date
      currentDate.setDate(currentDate.getDate() + 1);
      
      const interestPayment = remainingBalance * dailyInterestRate;
      const principalPayment = dailyPayment - interestPayment;
      remainingBalance = Math.max(0, remainingBalance - principalPayment);
      
      schedule.push({
        day,
        paymentDate: currentDate.toISOString().split('T')[0],
        principal: principalPayment,
        interest: interestPayment,
        totalPayment: dailyPayment,
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
    doc.text(`Loan ID: ${loan.id}`, 14, 30);
    doc.text(`Loan Amount: ${formatCurrency(loan.amount)}`, 14, 36);
    doc.text(`Interest Rate: ${loan.interest}%`, 14, 42);
    doc.text(`Term: ${loan.term} months`, 14, 48);
    
    // Add space before table
    const startY = 60;
    
    // Add table
    autoTable(doc, {
      head: [['Day', 'Payment Date', 'Principal', 'Interest Amount', 'Total Payment', 'Remaining Balance']],
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
              <p><strong>Loan ID:</strong> ${loan.id}</p>
              <p><strong>Loan Amount:</strong> ${formatCurrency(loan.amount)}</p>
              <p><strong>Interest Rate:</strong> ${loan.interest}%</p>
              <p><strong>Term:</strong> ${loan.term} months</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th class="center">Day</th>
                  <th>Payment Date</th>
                  <th class="center">Principal</th>
                  <th class="center">Interest Amount</th>
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

  // Payment functionality removed - admin handles payments separately

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
    // Calculate remaining balance by summing up all unpaid amounts
    let totalRemaining = 0;
    
    for (const item of schedule) {
      if (item.status === 'paid') {
        // Fully paid, nothing remaining
        continue;
      } else if (item.status === 'partial') {
        // Partially paid - add the remaining amount for this day
        const paidAmount = item.paidAmount || 0;
        totalRemaining += item.totalPayment - paidAmount;
      } else {
        // Not paid at all - add full amount
        totalRemaining += item.totalPayment;
      }
    }
    
    // Add to the remaining balance from the last item to account for accumulated interest/principal
    const lastItem = schedule[schedule.length - 1];
    if (lastItem) {
      // The remainingBalance field shows the balance after each scheduled payment
      // We need to adjust it based on actual payments made
      const originalTotal = schedule.reduce((sum, item) => sum + item.totalPayment, 0);
      const totalPaid = schedule.reduce((sum, item) => sum + (item.paidAmount || 0), 0);
      return Math.max(0, originalTotal - totalPaid);
    }
    
    return Math.max(0, totalRemaining);
  };

  // Function to get exact remaining balance from loan data
  const getExactRemainingBalance = () => {
    // First check if loan has remainingBalance property (this is the exact balance from database)
    if (loan && loan.remainingBalance !== undefined && loan.remainingBalance !== null) {
      return loan.remainingBalance;
    }
    
    // If no remainingBalance property, calculate from current schedule
    return calculateRemainingBalanceFromSchedule(amortizationSchedule);
  };

  if (!isOpen || !loan) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-black">Loan Details</h2>
                <p className="text-black">ID: {loan.id}</p>
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

            {/* Loan Information Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-black">Loan Amount</p>
                <p className="font-medium text-black">{formatCurrency(loan.amount)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-black">Interest Rate</p>
                <p className="font-medium text-black">{loan.interest}%</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-black">Term</p>
                <p className="font-medium text-black">{loan.term} months</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-black">Remaining Balance</p>
                <p className="font-medium text-black">
                  {formatCurrency(
                    (loan.remainingBalance || loan.amount || 0) + 
                    ((loan.amount || 0) * (loan.interest || 0) / 100 * (loan.term || 0))
                  )}
                </p>
              </div>
            </div>

            {/* Amortization Schedule */}
            <div>
              <h3 className="text-xl font-semibold text-black mb-4">Amortization Schedule</h3>
              
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
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                          Day
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                          Payment Date
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                          Principal
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                          Interest Amount
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                          Total Payment
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                          Remaining Balance
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                          Paid Amount
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                          Receipt No.
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                          Processed Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentItems.map((item, index) => (
                        <tr key={indexOfFirstItem + index} className={`hover:bg-gray-50 ${item.status === 'paid' ? 'bg-green-50' : item.status === 'partial' ? 'bg-yellow-50' : ''}`}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-black">
                            {item.day || ''}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-black">
                            {formatDate(item.paymentDate)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-black">
                            {formatCurrency(item.principal)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-black">
                            {formatCurrency(item.interest)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-black">
                            {formatCurrency(item.totalPayment)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-black">
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
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-black">
                            {item.paidAmount ? formatCurrency(item.paidAmount) : '-'}
                            {item.status === 'partial' && item.paidAmount && (
                              <span className="text-xs text-black ml-1">
                                / {formatCurrency(item.totalPayment)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-black">
                            {item.receiptNumber || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-black">
                            {item.paymentDateProcessed 
                              ? new Date(item.paymentDateProcessed).toLocaleString('en-PH', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit'
                                }) 
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                      <div className="text-sm text-black">
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
                        
                        <span className="px-3 py-1 text-sm font-medium text-black">
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

      {/* Payment modals removed - admin handles payments separately */}
    </>
  );

}
