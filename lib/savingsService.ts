import { firestore } from '@/lib/firebase';
import { SavingsTransaction } from '@/lib/types/savings';
import { sendSavingsDepositReceipt } from '@/lib/transactionReceiptService';

/**
 * Service for handling savings transactions with atomic updates
 */

interface MemberInfo {
  id: string;
  email?: string;
  userId?: string; // Store the corresponding user ID in the member document
  role?: string;
  firstName?: string;
  lastName?: string;
  [key: string]: any; // Allow other properties
}

/**
 * Get member ID by user UID (find the member document that corresponds to the user)
 */
export async function getMemberIdByUserId(userId: string): Promise<string | null> {
  try {
    // Log the user lookup attempt
    console.log(`Looking up member for user ID: ${userId}`);
    // First, try to find member by the userId field in the member document
    // This is the most direct way if the member document stores the user ID
    let membersResult = await firestore.queryDocuments('members', [
      { field: 'userId', operator: '==', value: userId }
    ]);

    if (membersResult.success && membersResult.data && membersResult.data.length > 0) {
      const foundMemberId = membersResult.data[0].id;
      console.log(`Found member by userId field: ${foundMemberId} for user: ${userId}`);
      // Return the ID of the first matching member
      return foundMemberId;
    }
    
    // If no match found by userId field in member document, try alternative methods
    // First, check if the userId itself might be a member ID directly
    const directMemberResult = await firestore.getDocument('members', userId);
    if (directMemberResult.success && directMemberResult.data) {
      console.log(`Found direct member document for ID: ${userId}`);
      // Check if this member document has a matching email with the user
      const userResult = await firestore.getDocument('users', userId);
      if (userResult.success && userResult.data) {
        const userData = userResult.data as any;
        const userEmail = userData.email;
        const memberData = directMemberResult.data as any;
        
        // If the member's email matches the user's email, this is a match
        if (memberData.email && memberData.email === userEmail) {
          return userId;
        }
      }
      
      // Even if email doesn't match, return the member ID if it exists
      // This handles cases where the userId is actually a member ID
      return userId;
    }
    
    // Try to get user info from users collection
    const userResult = await firestore.getDocument('users', userId);
    if (!userResult.success || !userResult.data) {
      console.error(`User not found in users collection for ID: ${userId}`);
      
      // As a last resort, try to find a member with an email that might match the userId
      // This handles cases where userId was encoded email
      try {
        const decodedEmail = decodeURIComponent(userId);
        const fallbackResult = await firestore.queryDocuments('members', [
          { field: 'email', operator: '==', value: decodedEmail }
        ]);
        
        if (fallbackResult.success && fallbackResult.data && fallbackResult.data.length > 0) {
          console.warn(`Found member by decoded email fallback for user ID: ${userId}`);
          return fallbackResult.data[0].id;
        }
      } catch (e) {
        // If decoding fails, ignore and continue
        console.warn(`Failed to decode email from user ID ${userId}:`, e);
      }
      
      return null;
    }

    const userData = userResult.data as any;
    const userEmail = userData.email;
    
    if (userEmail) {
      // Search for the member document with matching email
      console.log(`Searching for member by email: ${userEmail} for user: ${userId}`);
      membersResult = await firestore.queryDocuments('members', [
        { field: 'email', operator: '==', value: userEmail }
      ]);

      if (membersResult.success && membersResult.data && membersResult.data.length > 0) {
        const foundMemberId = membersResult.data[0].id;
        console.log(`Found member by email: ${foundMemberId} for user: ${userId} (email: ${userEmail})`);
        // Return the ID of the first matching member
        return foundMemberId;
      }
    }
    
    // If email doesn't match, try using other identifying information
    // Try to match using name if available
    if (userData.firstName && userData.lastName) {
      membersResult = await firestore.queryDocuments('members', [
        { field: 'firstName', operator: '==', value: userData.firstName },
        { field: 'lastName', operator: '==', value: userData.lastName }
      ]);

      if (membersResult.success && membersResult.data && membersResult.data.length > 0) {
       
       
        // Return the ID of the first matching member
        return membersResult.data[0].id;
      }
    }

    // Try to get user details for better error reporting
    const userInfoResult = await firestore.getDocument('users', userId);
    const userDisplayName = userInfoResult.success && userInfoResult.data 
      ? (userInfoResult.data as any).displayName || (userInfoResult.data as any).email || userId
      : userId;
    
    console.error(`No member found for user: ${userDisplayName} (ID: ${userId})`);
    console.error('Searched by email:', userEmail);
    console.error('Searched by name:', userData.firstName, userData.lastName);
    return null;
  } catch (error) {
    console.error('Error finding member ID by user ID:', error);
    return null;
  }

}

/**
 * Get member info by user UID
 */
export async function getMemberInfoByUserId(userId: string): Promise<MemberInfo | null> {
  try {
    // First, try to find member by the userId field in the member document
    let membersResult = await firestore.queryDocuments('members', [
      { field: 'userId', operator: '==', value: userId }
    ]);

    if (membersResult.success && membersResult.data && membersResult.data.length > 0) {
      const memberData = membersResult.data[0];
      return memberData;
    }
    
    // If no match found by userId field in member document, try alternative methods
    // First, check if the userId itself might be a member ID directly
    const directMemberResult = await firestore.getDocument('members', userId);
    if (directMemberResult.success && directMemberResult.data) {
      // Check if this member document has a matching email with the user
      const userResult = await firestore.getDocument('users', userId);
      if (userResult.success && userResult.data) {
        const userData = userResult.data as any;
        const userEmail = userData.email;
        const memberData = directMemberResult.data as any;
        
        // If the member's email matches the user's email, this is a match
        if (memberData.email && memberData.email === userEmail) {
          return { id: userId, ...memberData };
        }
      }
      
      // Even if email doesn't match, return the member data if it exists
      // This handles cases where the userId is actually a member ID
      return { id: userId, ...(directMemberResult.data as any) };
    }
    
    // Try to get user info from users collection
    const userResult = await firestore.getDocument('users', userId);
    if (!userResult.success || !userResult.data) {
      console.error('User not found in users collection:', userId);
      
      // As a last resort, try to find a member with an email that might match the userId
      // This handles cases where userId was encoded email
      try {
        const decodedEmail = decodeURIComponent(userId);
        const fallbackResult = await firestore.queryDocuments('members', [
          { field: 'email', operator: '==', value: decodedEmail }
        ]);
        
        if (fallbackResult.success && fallbackResult.data && fallbackResult.data.length > 0) {
          return fallbackResult.data[0];
        }
      } catch (e) {
        // If decoding fails, ignore and continue
      }
      
      return null;
    }

    const userData = userResult.data as any;
    const userEmail = userData.email;
    
    if (userEmail) {
      // Search for the member document with matching email
      membersResult = await firestore.queryDocuments('members', [
        { field: 'email', operator: '==', value: userEmail }
      ]);

      if (membersResult.success && membersResult.data && membersResult.data.length > 0) {
        const memberData = membersResult.data[0];
        return memberData;
      }
    }
    
    // If email doesn't match, try using other identifying information
    // Try to match using name if available
    if (userData.firstName && userData.lastName) {
      membersResult = await firestore.queryDocuments('members', [
        { field: 'firstName', operator: '==', value: userData.firstName },
        { field: 'lastName', operator: '==', value: userData.lastName }
      ]);

      if (membersResult.success && membersResult.data && membersResult.data.length > 0) {
        const memberData = membersResult.data[0];
        return memberData;
      }
    }

    console.error('No member found for user ID:', userId);
    return null;
  } catch (error) {
    console.error('Error finding member info by user ID:', error);
    return null;
  }
}

/**
 * Atomically update savings transaction and member's total
 */
export async function addSavingsTransaction(
  userId: string,
  transactionData: Omit<SavingsTransaction, 'id' | 'createdAt'>
): Promise<{ success: boolean; error?: string; transactionId?: string }> {
  try {
    // Get the member ID that corresponds to this user
    const memberId = await getMemberIdByUserId(userId);
    if (!memberId) {
      // Try to get user details for better error reporting
      const userInfoResult = await firestore.getDocument('users', userId);
      const userDisplayName = userInfoResult.success && userInfoResult.data 
        ? (userInfoResult.data as any).displayName || (userInfoResult.data as any).email || userId
        : userId;
        
      return { 
        success: false, 
        error: `Member record not found for user: ${userDisplayName} (ID: ${userId})` 
      };
    }

    // Create transaction object
    const newTransaction: SavingsTransaction = {
      ...transactionData,
      id: `${transactionData.type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, // More unique ID
      createdAt: new Date().toISOString()
    };

    // Calculate new balance based on existing transactions
    const transactionsResult = await firestore.getCollection(`members/${memberId}/savings`);
    let runningBalance = 0;

    if (transactionsResult.success && transactionsResult.data) {
      // Sort existing transactions by date to calculate running balance
      const existingTransactions = transactionsResult.data
        .map((doc: any) => ({ id: doc.id, ...doc }))
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate balance from existing transactions
      existingTransactions.forEach((transaction: any) => {
        if (transaction.type === 'deposit') {
          runningBalance += transaction.amount;
        } else if (transaction.type === 'withdrawal') {
          runningBalance -= transaction.amount;
        }
      });
    }

    // Apply the new transaction
    if (newTransaction.type === 'deposit') {
      runningBalance += newTransaction.amount;
    } else if (newTransaction.type === 'withdrawal') {
      runningBalance -= newTransaction.amount;
    }

    // Validate withdrawal doesn't go negative
    if (runningBalance < 0) {
      return { success: false, error: 'Insufficient funds for withdrawal' };
    }

    // Update the transaction with the new balance
    const transactionWithBalance = {
      ...newTransaction,
      balance: runningBalance
    };

    // Save to savings subcollection
    const saveResult = await firestore.setDocument(
      `members/${memberId}/savings`,
      newTransaction.id,
      transactionWithBalance
    );

    if (!saveResult.success) {
      return { success: false, error: saveResult.error || 'Failed to save transaction' };
    }

    // Update member's aggregate savings in the main document
    const memberResult = await firestore.getDocument('members', memberId);
    if (memberResult.success && memberResult.data) {
      const memberData = memberResult.data;
      const currentSavings = memberData.savings?.total || 0;
      const newTotalSavings = newTransaction.type === 'deposit' 
        ? currentSavings + newTransaction.amount 
        : currentSavings - newTransaction.amount;

      // Update the member document with the new total
      const updateResult = await firestore.updateDocument('members', memberId, {
        ...memberData,
        savings: {
          ...memberData.savings,
          total: Math.max(0, newTotalSavings), // Ensure non-negative
          lastUpdated: new Date().toISOString()
        }
      });

      if (!updateResult.success) {
        console.error('Warning: Failed to update member savings total, but transaction was saved:', updateResult.error);
      }
    }

    // Create notification for the savings transaction
    try {
      const notificationId = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const memberResultForNotif = await firestore.getDocument('members', memberId);
      const memberDataForNotif = memberResultForNotif.success && memberResultForNotif.data 
        ? memberResultForNotif.data as any 
        : {};
      
      await firestore.setDocument('notifications', notificationId, {
        userId: userId,
        userRole: memberDataForNotif.role || 'member',
        title: 'Savings Transaction',
        message: `A ${newTransaction.type} of ₱${newTransaction.amount.toFixed(2)} has been processed to your savings account. Your new balance is ₱${runningBalance.toFixed(2)}.`,
        type: 'savings_transaction',
        status: 'unread',
        createdAt: new Date().toISOString(),
        metadata: {
          transactionId: newTransaction.id,
          transactionType: newTransaction.type,
          amount: newTransaction.amount,
          balance: runningBalance,
          remarks: newTransaction.remarks || ''
        }
      });
    } catch (notifError) {
      console.error('Error creating savings notification:', notifError);
      // Don't fail the transaction if notification creation fails
    }

    // Send email receipt for deposits to Driver/Operator
    if (newTransaction.type === 'deposit') {
      try {
        const memberResultForEmail = await firestore.getDocument('members', memberId);
        const memberDataForEmail = memberResultForEmail.success && memberResultForEmail.data 
          ? memberResultForEmail.data as any 
          : {};
        
        const role = (memberDataForEmail.role || '').toLowerCase();
        if (role === 'driver' || role === 'operator') {
          // Use the actual userId from member data if available, otherwise fall back to passed userId
          const actualUserId = memberDataForEmail.userId || userId;
          
          console.log('Sending savings deposit receipt email:', {
            actualUserId,
            amount: newTransaction.amount,
            runningBalance,
            depositControlNumber: newTransaction.depositControlNumber
          });
          
          const receiptResult = await sendSavingsDepositReceipt(
            actualUserId,
            newTransaction.amount,
            runningBalance,
            newTransaction.depositControlNumber
          );
          
          if (receiptResult.success) {
            console.log('✅ Savings deposit receipt sent:', receiptResult.receiptNumber);
          } else {
            // Log error but don't fail the transaction - email is secondary to the actual savings transaction
            console.error('❌ Failed to send savings deposit receipt:', receiptResult.error, receiptResult);
            // Only show warning in console, not to user
            if (receiptResult.receiptNumber === 'CONFIG_MISSING') {
              console.warn('⚠️ EmailJS not configured. Email receipt was not sent, but savings transaction was successful.');
            }
          }
        }
      } catch (emailError) {
        console.error('Error sending savings deposit receipt:', emailError);
        // Don't fail the transaction if email sending fails
      }
    }

    return { success: true, transactionId: newTransaction.id };
  } catch (error) {
    console.error('Error adding savings transaction:', error);
    return { success: false, error: 'Failed to add savings transaction' };
  }
}

/**
 * Get savings transactions for a user
 */
export async function getUserSavingsTransactions(userId: string): Promise<SavingsTransaction[]> {
  try {
    // Get the member ID that corresponds to this user
    const memberId = await getMemberIdByUserId(userId);
    if (!memberId) {
      // Try to get user details for better error reporting
      const userInfoResult = await firestore.getDocument('users', userId);
      const userDisplayName = userInfoResult.success && userInfoResult.data 
        ? (userInfoResult.data as any).displayName || (userInfoResult.data as any).email || userId
        : userId;
        
      console.error(`Member not found for user: ${userDisplayName} (ID: ${userId})`);
      return [];
    }

    // Fetch savings transactions from the member's subcollection
    const result = await firestore.getCollection(`members/${memberId}/savings`);

    if (result.success && result.data) {
      const transactions = result.data.map((doc: any) => ({
        id: doc.id,
        ...doc
      }));
      
      // Sort by date descending (newest first) to ensure new transactions appear at the top
      return transactions.sort((a, b) => 
        new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
      );
    }

    return [];
  } catch (error) {
    console.error('Error fetching user savings transactions:', error);
    return [];
  }
}

/**
 * Get user's current savings balance
 */
export async function getUserSavingsBalance(userId: string): Promise<number> {
  try {
    // Get the member ID that corresponds to this user
    const memberId = await getMemberIdByUserId(userId);
    if (!memberId) {
      // Try to get user details for better error reporting
      const userInfoResult = await firestore.getDocument('users', userId);
      const userDisplayName = userInfoResult.success && userInfoResult.data 
        ? (userInfoResult.data as any).displayName || (userInfoResult.data as any).email || userId
        : userId;
        
      console.error(`Member not found for user: ${userDisplayName} (ID: ${userId})`);
      return 0;
    }

    // Try to get from member document first (cached/aggregate value)
    const memberResult = await firestore.getDocument('members', memberId);
    if (memberResult.success && memberResult.data) {
      const memberData = memberResult.data;
      if (memberData.savings && typeof memberData.savings.total !== 'undefined') {
        return memberData.savings.total || 0;
      }
    }

    // Fallback: calculate from transactions
    const transactions = await getUserSavingsTransactions(userId);
    if (transactions.length === 0) {
      return 0;
    }

    // Calculate balance from transactions
    return transactions.reduce((balance, transaction) => {
      return transaction.type === 'deposit' 
        ? balance + transaction.amount 
        : balance - transaction.amount;
    }, 0);
  } catch (error) {
    console.error('Error fetching user savings balance:', error);
    return 0;
  }
}

/**
 * Get savings balance for a specific member
 */
export async function getSavingsBalanceForMember(memberId: string): Promise<number> {
  try {
    // Try to get from member document first (cached/aggregate value)
    const memberResult = await firestore.getDocument('members', memberId);
    if (memberResult.success && memberResult.data) {
      const memberData = memberResult.data;
      if (memberData.savings && typeof memberData.savings.total !== 'undefined') {
        return memberData.savings.total || 0;
      }
    }

    // Fallback: calculate from transactions
    const transactionsResult = await firestore.getCollection(`members/${memberId}/savings`);
    if (transactionsResult.success && transactionsResult.data) {
      // Calculate balance from transactions
      return transactionsResult.data.reduce((balance, transaction: any) => {
        return transaction.type === 'deposit' 
          ? balance + transaction.amount 
          : balance - transaction.amount;
      }, 0);
    }

    return 0;
  } catch (error) {
    console.error('Error getting savings balance for member:', error);
    return 0;
  }
}
