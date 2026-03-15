'use client';

import { useState, useEffect } from 'react';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { sendLoanPaymentReceipt } from '@/lib/transactionReceiptService';

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
  // State for payment functionality
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState('');
  
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
    
    // Convert loan term to days (1 month = 30 days)
    const totalDays = loan.term * 30;
    
    // Step 1: Calculate interest amount (Principal × Interest Rate × Term)
    // Example: 5000 × 2% × 3 months = 300
    const interestAmount = loan.amount * (loan.interest / 100) * loan.term;
    
    // Step 2: Calculate total amount (Principal + Interest)
    // Example: 3000 + 150 = 3150
    const totalAmount = loan.amount + interestAmount;
    
    // Step 3: Calculate principal per day (Principal / Days)
    // Example: 3000 / 30 = 100
    const principalPerDay = loan.amount / totalDays;
    
    // Step 4: Calculate interest per day (Interest Amount / Days)
    // Example: 150 / 30 = 5
    const interestPerDay = interestAmount / totalDays;
    
    // Step 5: Calculate total payment per day (Total Amount / Days)
    // Example: 3150 / 30 = 105
    const totalPaymentPerDay = totalAmount / totalDays;
    
    // Step 6: Remaining balance starts at total amount
    let remainingBalance = totalAmount;
    let currentDate = new Date(loan.startDate);
    
    for (let day = 1; day <= totalDays; day++) {
      // Add one day for each payment date
      currentDate.setDate(currentDate.getDate() + 1);
      
      // Subtract total payment from remaining balance
      remainingBalance -= totalPaymentPerDay;
      
      // Ensure remaining balance doesn't go below 0
      if (remainingBalance < 0) {
        remainingBalance = 0;
      }
      
      schedule.push({
        day,
        paymentDate: currentDate.toISOString().split('T')[0],
        principal: principalPerDay,
        interest: interestPerDay,
        totalPayment: totalPaymentPerDay,
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

  // Function to handle payment confirmation
  const handlePaymentConfirmation = () => {
    // Remove all non-numeric characters except decimal point, then parse
    const cleanAmount = paymentAmount.replace(/[^\d.]/g, '');
    const amount = parseFloat(cleanAmount);
    const remainingBalance = getExactRemainingBalance();
    
    // Validate payment amount
    if (!paymentAmount || isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    
    // Validate payment amount does not exceed remaining balance (with small tolerance for floating point)
    if (amount > remainingBalance + 0.01) {
      toast.error(`Payment amount cannot exceed the remaining balance of ${formatCurrency(remainingBalance)}`);
      return;
    }
    
    // Validate receipt number
    if (!receiptNumber.trim()) {
      toast.error('Please enter a receipt number');
      return;
    }
    
    // Show confirmation modal
    setShowPaymentModal(false);
    setShowConfirmationModal(true);
  };

  // Function to process the actual payment
  const processPayment = async () => {
    setPaymentLoading(true);

    try {
      const amount = parseFloat(paymentAmount.replace(/,/g, ''));
      
      // Find unpaid payments that can be covered by this payment
      let remainingPayment = amount;
      const updatedSchedule = [...amortizationSchedule];
      let paymentsApplied = 0;
      const paidItems: AmortizationSchedule[] = [];

      for (let i = 0; i < updatedSchedule.length; i++) {
        if (updatedSchedule[i].status !== 'paid' && remainingPayment > 0) {
          const totalPaymentDue = updatedSchedule[i].totalPayment;
          const alreadyPaid = updatedSchedule[i].paidAmount || 0;
          const remainingDue = totalPaymentDue - alreadyPaid;
          
          // Use a small tolerance for floating point comparison (0.01 peso)
          const tolerance = 0.01;
          const isFullPayment = remainingPayment >= remainingDue - tolerance;
          
          if (isFullPayment) {
            // Full payment for this installment
            updatedSchedule[i].status = 'paid';
            updatedSchedule[i].receiptNumber = receiptNumber;
            updatedSchedule[i].paymentDateProcessed = new Date().toISOString();
            updatedSchedule[i].paidAmount = totalPaymentDue; // Mark as fully paid
            paidItems.push(updatedSchedule[i]);
            remainingPayment -= remainingDue;
            paymentsApplied++;
          } else {
            // Partial payment - accumulate the paid amount
            updatedSchedule[i].status = 'partial';
            updatedSchedule[i].receiptNumber = receiptNumber;
            updatedSchedule[i].paymentDateProcessed = new Date().toISOString();
            updatedSchedule[i].partialPaymentAmount = remainingPayment;
            updatedSchedule[i].paidAmount = alreadyPaid + remainingPayment;
            paidItems.push(updatedSchedule[i]);
            remainingPayment = 0;
            paymentsApplied++;
            break;
          }
        }
      }

      // Calculate the new remaining balance after payments
      const newRemainingBalance = calculateRemainingBalanceFromSchedule(updatedSchedule);
      
      // Clean the schedule data to remove undefined values before saving
      const cleanSchedule = updatedSchedule.map(item => ({
        day: item.day,
        paymentDate: item.paymentDate,
        principal: item.principal,
        interest: item.interest,
        totalPayment: item.totalPayment,
        remainingBalance: item.remainingBalance,
        status: item.status || 'pending',
        receiptNumber: item.receiptNumber || null,
        paymentDateProcessed: item.paymentDateProcessed || null,
        partialPaymentAmount: item.partialPaymentAmount || null,
        paidAmount: item.paidAmount || 0
      }));
      
      // Update the loan document with the new payment schedule and remaining balance
      const updateResult = await firestore.updateDocument('loans', loan!.id, {
        paymentSchedule: cleanSchedule,
        remainingBalance: newRemainingBalance
      });

      if (updateResult.success) {
        setAmortizationSchedule(updatedSchedule);
        
        // Create notification for the user
        await createPaymentNotification(amount, receiptNumber, paidItems);
        
        // Send email receipt to Driver/Operator
        if (loan?.userId && loan?.role) {
          const role = loan.role.toLowerCase();
          console.log('Checking email receipt for role:', role, 'userId:', loan.userId);
          
          if (role === 'driver' || role === 'operator') {
            console.log('Sending loan payment receipt to', role, '- userId:', loan.userId);
            try {
              const firstPaidItem = paidItems.length > 0 ? paidItems[0] : null;
              console.log('Payment details:', { 
                amount, 
                newRemainingBalance, 
                firstPaidDay: firstPaidItem?.day,
                loanId: loan.id 
              });
              
              const receiptResult = await sendLoanPaymentReceipt(
                loan.userId,
                loan.id,
                amount,
                newRemainingBalance,
                firstPaidItem?.day
              );
              
              if (receiptResult.success) {
                console.log('✅ Loan payment receipt sent:', receiptResult.receiptNumber);
              } else {
                console.error('❌ Failed to send loan payment receipt:', receiptResult.error, receiptResult);
                // Log error but don't block the payment process
              }
            } catch (emailError: any) {
              console.error('❌ Error sending loan payment receipt:', emailError);
              console.error('Error details:', {
                message: emailError?.message,
                stack: emailError?.stack
              });
              // Log error but don't block the payment process
            }
          } else {
            console.log('Email receipt not sent - role is not driver or operator:', role);
          }
        } else {
          console.log('Email receipt not sent - missing userId or role:', { 
            userId: loan?.userId, 
            role: loan?.role 
          });
        }
        
        // Close modals and reset state
        setShowConfirmationModal(false);
        setPaymentAmount('');
        setReceiptNumber('');
        
        toast.success(`Payment of ${formatCurrency(amount)} processed successfully! Receipt: ${receiptNumber}`);
        
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

  // Function to create payment notification
  const createPaymentNotification = async (amount: number, receipt: string, paidItems: AmortizationSchedule[]) => {
    try {
      // Create detailed message with payment information
      let message = `Your payment of ${formatCurrency(amount)} has been successfully processed. Receipt No: ${receipt}`;
      
      if (paidItems.length > 0) {
        message += `\n\nPayments applied to:`;
        paidItems.forEach((item, index) => {
          message += `\n- Day ${item.day}: ${formatCurrency(item.totalPayment)}`;
        });
      }

      const notificationId = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const notificationData = {
        userId: loan?.userId,
        userRole: loan?.role,
        title: 'Payment Received',
        message: message,
        type: 'payment',
        status: 'unread',
        createdAt: new Date().toISOString(),
        loanId: loan?.id,
        receiptNumber: receipt,
        paymentAmount: amount,
        paidItems: paidItems.map(item => ({
          day: item.day,
          amount: item.totalPayment,
          date: item.paymentDate
        }))
      };

      await firestore.setDocument('notifications', notificationId, notificationData);
    } catch (error) {
      console.error('Error creating notification:', error);
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
                <p className="text-sm text-black">Member Name</p>
                <p className="font-medium text-black">{loan.fullName}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-black">Role</p>
                <p className="font-medium text-black">{loan.role}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-black">Loan Amount</p>
                <p className="font-medium text-black">{formatCurrency(loan.amount)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-black">Status</p>
                <p className="font-medium text-black">
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
                <p className="text-sm text-black">Interest Rate</p>
                <p className="font-medium text-black">{loan.interest}%</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-black">Term</p>
                <p className="font-medium text-black">{loan.term} months</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-black">Start Date</p>
                <p className="font-medium text-black">{formatDate(loan.startDate)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-black">Remaining Balance</p>
                <p className="font-medium text-black">
                  {formatCurrency(getExactRemainingBalance())}
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
                disabled={loan.status === 'completed'}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center ${
                  loan.status === 'completed'
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {loan.status === 'completed' ? 'Loan Completed' : 'Make Payment'}
              </button>
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

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-black">Make Loan Payment</h3>
                <button 
                  onClick={() => setShowPaymentModal(false)}
                  className="text-black hover:text-gray-700"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-black mb-1">
                  Control No. <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black"
                  placeholder="Enter Control No."
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-black mb-1">Payment Amount</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                    ₱
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={paymentAmount}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/,/g, '');
                      // Allow: empty, digits only, digits with single decimal, digits with decimal and up to 2 digits after
                      if (rawValue === '' || /^\d+$/.test(rawValue) || /^\d+\.$/.test(rawValue) || /^\d+\.\d{0,2}$/.test(rawValue)) {
                        // Format with commas for display while preserving raw value
                        if (rawValue === '' || rawValue === '.') {
                          setPaymentAmount(rawValue);
                        } else if (rawValue.endsWith('.')) {
                          // Handle trailing decimal point
                          const numPart = rawValue.slice(0, -1);
                          const formatted = parseFloat(numPart).toLocaleString('en-PH');
                          setPaymentAmount(formatted + '.');
                        } else if (rawValue.includes('.')) {
                          // Handle number with decimal
                          const [intPart, decPart] = rawValue.split('.');
                          const formatted = parseFloat(intPart || '0').toLocaleString('en-PH');
                          setPaymentAmount(`${formatted}.${decPart}`);
                        } else {
                          // Whole number
                          setPaymentAmount(parseFloat(rawValue).toLocaleString('en-PH'));
                        }
                      }
                    }}
                    className="w-full pl-8 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black"
                    placeholder="Enter payment amount"
                  />
                </div>
              </div>
              
              <div className=" mb-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-black">
                  <span className="font-medium">Remaining Balance:</span> {formatCurrency(getExactRemainingBalance())}
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  disabled={paymentLoading}
                  className="px-4 py-2 border border-gray-300 text-black rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePaymentConfirmation}
                  disabled={paymentLoading || !paymentAmount || parseFloat(paymentAmount.replace(/,/g, '')) <= 0 || !receiptNumber.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {paymentLoading ? 'Processing...' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Confirmation Modal */}
      {showConfirmationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-black">Confirm Payment</h3>
                <button 
                  onClick={() => setShowConfirmationModal(false)}
                  className="text-black hover:text-gray-700"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center mb-3">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">Confirm Payment</h3>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-black">
                  <div className="flex justify-between">
                    <span>Receipt Number:</span>
                    <span className="font-medium">{receiptNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amount:</span>
                    <span className="font-medium">{formatCurrency(parseFloat(paymentAmount.replace(/,/g, '')))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Member:</span>
                    <span className="font-medium">{loan?.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Loan ID:</span>
                    <span className="font-medium">{loan?.id}</span>
                  </div>
                </div>
              </div>
              
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-black">
                  <span className="font-medium">Note:</span> This payment will be processed immediately and a notification will be sent to the member.
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowConfirmationModal(false)}
                  disabled={paymentLoading}
                  className="px-4 py-2 border border-gray-300 text-black rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={processPayment}
                  disabled={paymentLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {paymentLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    'Confirm Payment'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

}
