/**
 * Script to fix loan calculations that were created with the incorrect formula
 * Old formula: interest = amount * (rate / 100) - WRONG (didn't multiply by term)
 * New formula: interest = amount * (rate / 100) * term - CORRECT
 * 
 * Run this script to update existing loans with correct totals
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');

// Your Firebase config
const firebaseConfig = {
  // Add your Firebase config here
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixLoanCalculations() {
  console.log('Starting loan calculation fix...\n');
  
  try {
    const loansRef = collection(db, 'loans');
    const snapshot = await getDocs(loansRef);
    
    let fixedCount = 0;
    let errorCount = 0;
    
    for (const docSnapshot of snapshot.docs) {
      const loan = docSnapshot.data();
      const loanId = docSnapshot.id;
      
      // Skip if missing required fields
      if (!loan.amount || !loan.term || loan.interest === undefined) {
        console.log(`Skipping loan ${loanId} - missing required fields`);
        continue;
      }
      
      // Calculate correct values
      const principal = loan.amount;
      const term = loan.term;
      const interestRate = loan.interest;
      
      // CORRECT formula: interest = principal * (rate/100) * term
      const correctTotalInterest = principal * (interestRate / 100) * term;
      const correctTotalAmount = principal + correctTotalInterest;
      const totalDays = term * 30;
      const dailyPayment = correctTotalAmount / totalDays;
      const dailyPrincipal = principal / totalDays;
      const dailyInterest = correctTotalInterest / totalDays;
      
      // OLD (incorrect) formula for comparison
      const oldTotalInterest = principal * (interestRate / 100);
      const oldTotalAmount = principal + oldTotalInterest;
      
      // Check if this loan needs fixing (if stored values match old incorrect formula)
      const storedRemainingBalance = loan.remainingBalance;
      const storedTotalPaid = loan.totalPaid || 0;
      
      // Calculate what the remaining balance should be with correct formula
      let correctRemainingBalance = correctTotalAmount;
      
      // If there's a payment schedule with payments, calculate remaining based on that
      if (loan.paymentSchedule && loan.paymentSchedule.length > 0) {
        const totalPaidFromSchedule = loan.paymentSchedule.reduce((sum, item) => {
          return sum + (item.paidAmount || 0);
        }, 0);
        correctRemainingBalance = Math.max(0, correctTotalAmount - totalPaidFromSchedule);
      } else if (storedTotalPaid > 0) {
        correctRemainingBalance = Math.max(0, correctTotalAmount - storedTotalPaid);
      }
      
      // Check if the loan was calculated with old formula (within small rounding tolerance)
      const tolerance = 1; // 1 peso tolerance
      const matchesOldFormula = Math.abs(storedRemainingBalance - oldTotalAmount) < tolerance ||
                                (storedRemainingBalance === undefined && !loan.paymentSchedule);
      
      if (matchesOldFormula && term > 1) {
        console.log(`\nFixing loan ${loanId}:`);
        console.log(`  Principal: ₱${principal.toLocaleString()}`);
        console.log(`  Rate: ${interestRate}%`);
        console.log(`  Term: ${term} months`);
        console.log(`  Old Interest: ₱${oldTotalInterest.toLocaleString()} (WRONG - didn't multiply by term)`);
        console.log(`  New Interest: ₱${correctTotalInterest.toLocaleString()} (CORRECT)`);
        console.log(`  Old Total: ₱${oldTotalAmount.toLocaleString()}`);
        console.log(`  New Total: ₱${correctTotalAmount.toLocaleString()}`);
        console.log(`  Stored Remaining: ₱${storedRemainingBalance?.toLocaleString() || 'N/A'}`);
        console.log(`  Correct Remaining: ₱${correctRemainingBalance.toLocaleString()}`);
        
        // Fix the payment schedule if it exists
        let updatedPaymentSchedule = loan.paymentSchedule;
        if (updatedPaymentSchedule && updatedPaymentSchedule.length > 0) {
          updatedPaymentSchedule = updatedPaymentSchedule.map((item, index) => {
            const day = index + 1;
            const newRemaining = Math.max(0, correctTotalAmount - (day * dailyPayment));
            return {
              ...item,
              principal: dailyPrincipal,
              interest: dailyInterest,
              totalPayment: dailyPayment,
              remainingBalance: newRemaining
            };
          });
          console.log(`  Updated ${updatedPaymentSchedule.length} schedule items`);
        }
        
        // Update the loan document
        try {
          await updateDoc(doc(db, 'loans', loanId), {
            remainingBalance: correctRemainingBalance,
            totalAmount: correctTotalAmount,
            totalInterest: correctTotalInterest,
            ...(updatedPaymentSchedule && { paymentSchedule: updatedPaymentSchedule }),
            fixedCalculation: true,
            fixedAt: new Date().toISOString()
          });
          console.log(`  ✓ Successfully fixed!`);
          fixedCount++;
        } catch (updateError) {
          console.error(`  ✗ Error updating loan:`, updateError.message);
          errorCount++;
        }
      }
    }
    
    console.log(`\n========================================`);
    console.log(`Fix complete!`);
    console.log(`Fixed: ${fixedCount} loans`);
    console.log(`Errors: ${errorCount} loans`);
    console.log(`========================================`);
    
  } catch (error) {
    console.error('Error fixing loans:', error);
  }
}

// Run the fix
fixLoanCalculations();
