import emailjs from '@emailjs/browser';
import { firestore } from './firebase';

// EmailJS Configuration - Fetch from Firestore or fallback to environment variables
let cachedEmailJSConfig: { publicKey: string; serviceId: string; receiptTemplateId: string } | null = null;
let configFetchPromise: Promise<{ publicKey: string; serviceId: string; receiptTemplateId: string }> | null = null;

const fetchEmailJSConfigFromFirestore = async (): Promise<{ publicKey: string; serviceId: string; receiptTemplateId: string }> => {
  try {
    console.log('Fetching EmailJS config from Firestore (systemConfig/emailjs)...');
    
    // Try to get config from Firestore first
    const configResult = await firestore.getDocument('systemConfig', 'emailjs');
    
    console.log('Firestore config result:', { 
      success: configResult.success, 
      hasData: !!configResult.data,
      error: configResult.error 
    });
    
    if (configResult.success && configResult.data) {
      const configData = configResult.data as any;
      console.log('✅ EmailJS config loaded from Firestore:', {
        hasPublicKey: !!configData.publicKey,
        hasServiceId: !!configData.serviceId,
        hasTemplateId: !!configData.receiptTemplateId
      });
      return {
        publicKey: configData.publicKey || '',
        serviceId: configData.serviceId || '',
        receiptTemplateId: configData.receiptTemplateId || ''
      };
    } else {
      console.warn('⚠️  No EmailJS config found in Firestore at systemConfig/emailjs');
      console.warn('   Falling back to environment variables...');
    }
  } catch (error) {
    console.error('❌ Failed to fetch EmailJS config from Firestore:', error);
    console.warn('   Falling back to environment variables...');
  }
  
  // Fallback to environment variables
  const envConfig = {
    publicKey: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || '',
    serviceId: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || '',
    receiptTemplateId: process.env.NEXT_PUBLIC_EMAILJS_RECEIPT_TEMPLATE_ID || ''
  };
  
  console.log('Environment variables config:', {
    hasPublicKey: !!envConfig.publicKey,
    hasServiceId: !!envConfig.serviceId,
    hasTemplateId: !!envConfig.receiptTemplateId
  });
  
  return envConfig;
};

const getEmailJSConfig = async (): Promise<{ publicKey: string; serviceId: string; receiptTemplateId: string }> => {
  // For server-side rendering, return empty strings
  if (typeof window === 'undefined') {
    return { publicKey: '', serviceId: '', receiptTemplateId: '' };
  }
  
  // Return cached config if available
  if (cachedEmailJSConfig) {
    return cachedEmailJSConfig;
  }
  
  // If a fetch is already in progress, wait for it
  if (configFetchPromise) {
    return configFetchPromise;
  }
  
  // Start fetching and cache the promise
  configFetchPromise = fetchEmailJSConfigFromFirestore().then(config => {
    cachedEmailJSConfig = config;
    return config;
  });
  
  return configFetchPromise;
};

// Initialize EmailJS (async)
const initEmailJS = async () => {
  if (typeof window === 'undefined') return;
  try {
    const config = await getEmailJSConfig();
    if (config.publicKey) {
      emailjs.init(config.publicKey);
      console.log('EmailJS initialized');
    } else {
      console.warn('EmailJS public key missing');
    }
  } catch (error) {
    console.warn('Failed to initialize EmailJS:', error);
  }
};
initEmailJS();

interface TransactionReceiptData {
  [key: string]: string | undefined;
  to_email: string;
  to_name: string;
  member_role: string;
  transaction_type: 'loan_payment' | 'savings_deposit';
  transaction_amount: string;
  transaction_date: string;
  receipt_number: string;
  remaining_balance?: string;
  deposit_number?: string;
  loan_id?: string;
  payment_schedule_day?: string;
}

interface EmailLogEntry {
  transactionId: string;
  transactionType: string;
  userId: string;
  email: string;
  sentAt: string;
  status: 'sent' | 'failed';
  errorMessage?: string;
}

const generateReceiptNumber = (): string => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `SMP-${dateStr}-${random}`;
};

const checkEmailAlreadySent = async (transactionId: string, transactionType: string): Promise<boolean> => {
  try {
    const result = await firestore.queryDocuments('emailLogs', [
      { field: 'transactionId', operator: '==', value: transactionId },
      { field: 'transactionType', operator: '==', value: transactionType },
      { field: 'status', operator: '==', value: 'sent' }
    ]);
    return !!(result.success && result.data && result.data.length > 0);
  } catch (error) {
    console.error('Error checking email log:', error);
    return false;
  }
};

const logEmailAttempt = async (entry: EmailLogEntry): Promise<void> => {
  try {
    const logId = `email-${entry.transactionType}-${entry.transactionId}-${Date.now()}`;
    await firestore.setDocument('emailLogs', logId, entry);
  } catch (error) {
    console.error('Error logging email attempt:', error);
  }
};

const getUserDetails = async (userId: string): Promise<{
  email: string;
  fullName: string;
  role: string;
} | null> => {
  try {
    // First, try to get user data from users collection
    const userResult = await firestore.getDocument('users', userId);
    
    let userData: Record<string, any> = {};
    let memberData: Record<string, any> = {};
    
    if (userResult.success && userResult.data) {
      userData = userResult.data as Record<string, any>;
      
      // Get member data linked to this user
      const memberResult = await firestore.queryDocuments('members', [
        { field: 'userId', operator: '==', value: userId }
      ]);
      
      if (memberResult.success && memberResult.data && memberResult.data.length > 0) {
        memberData = memberResult.data[0] as Record<string, any>;
      }
    } else {
      // If user not found by ID, try to find member by userId field first
      const memberByUserId = await firestore.queryDocuments('members', [
        { field: 'userId', operator: '==', value: userId }
      ]);
      
      if (memberByUserId.success && memberByUserId.data && memberByUserId.data.length > 0) {
        memberData = memberByUserId.data[0] as Record<string, any>;
        
        // Try to get user data using the member's userId
        if (memberData.userId) {
          const linkedUserResult = await firestore.getDocument('users', memberData.userId);
          if (linkedUserResult.success && linkedUserResult.data) {
            userData = linkedUserResult.data as Record<string, any>;
          }
        }
      } else {
        // Try finding member directly by ID (in case userId is actually a memberId)
        const directMemberResult = await firestore.getDocument('members', userId);
        if (directMemberResult.success && directMemberResult.data) {
          memberData = directMemberResult.data as Record<string, any>;
          
          // Try to get linked user
          if (memberData.userId) {
            const linkedUserResult = await firestore.getDocument('users', memberData.userId);
            if (linkedUserResult.success && linkedUserResult.data) {
              userData = linkedUserResult.data as Record<string, any>;
            }
          }
        } else {
          console.error('User/Member not found for ID:', userId);
          return null;
        }
      }
    }
    
    // Build full name
    const fullName = memberData.firstName && memberData.lastName
      ? `${memberData.firstName} ${memberData.lastName}`.trim()
      : userData.displayName || userData.email || memberData.email || 'Member';
    
    const role = memberData.role || userData.role || 'Member';
    const email = userData.email || memberData.email;
    
    if (!email) {
      console.error('No email found for user:', userId);
      return null;
    }
    
    console.log('Retrieved user details:', { email, fullName, role, userId });
    return { email, fullName, role };
  } catch (error) {
    console.error('Error getting user details:', error);
    return null;
  }
};

export const sendLoanPaymentReceipt = async (
  userId: string,
  loanId: string,
  paymentAmount: number,
  remainingBalance: number,
  paymentScheduleDay?: number
): Promise<{ success: boolean; error?: string; receiptNumber?: string }> => {
  try {
    const transactionId = `${loanId}-${Date.now()}`;
    
    const alreadySent = await checkEmailAlreadySent(transactionId, 'loan_payment');
    if (alreadySent) {
      return { success: true, receiptNumber: 'ALREADY_SENT' };
    }

    const userDetails = await getUserDetails(userId);
    if (!userDetails) {
      throw new Error('Could not retrieve user details');
    }

    const role = userDetails.role.toLowerCase();
    if (role !== 'driver' && role !== 'operator') {
      return { success: true, receiptNumber: 'NOT_APPLICABLE' };
    }

    const receiptNumber = generateReceiptNumber();

    // Prepare email data - using format that works with most EmailJS templates
    const emailData: Record<string, string> = {
      // Standard EmailJS template variables
      to_email: userDetails.email,
      to_name: userDetails.fullName,
      from_name: 'SAMPA Cooperative',
      reply_to: 'noreply@sampacoop.com',
      
      // Transaction-specific variables
      member_role: userDetails.role,
      transaction_type: 'Loan Payment',
      transaction_amount: `₱${paymentAmount.toFixed(2)}`,
      transaction_date: new Date().toLocaleString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      receipt_number: receiptNumber,
      remaining_balance: `₱${remainingBalance.toFixed(2)}`,
      loan_id: loanId,
      payment_schedule_day: paymentScheduleDay ? `Day ${paymentScheduleDay}` : 'N/A',
      
      // Message body for simple templates
      message: `Dear ${userDetails.fullName},

Your loan payment has been successfully processed.

Payment Amount: ₱${paymentAmount.toFixed(2)}
Remaining Balance: ₱${remainingBalance.toFixed(2)}
Receipt Number: ${receiptNumber}
Date: ${new Date().toLocaleString('en-PH')}

Thank you for using SAMPA Cooperative.

Best regards,
SAMPA Cooperative Team`,
      
      // Subject line
      subject: 'Loan Payment Receipt - SAMPA Cooperative'
    };

    const config = await getEmailJSConfig();
    if (!config.serviceId || !config.receiptTemplateId || !config.publicKey) {
      console.error('EmailJS configuration is missing. Please configure in Firestore systemConfig/emailjs or set environment variables.');
      
      // Log the failed attempt
      await logEmailAttempt({
        transactionId,
        transactionType: 'loan_payment',
        userId,
        email: userDetails.email,
        sentAt: new Date().toISOString(),
        status: 'failed',
        errorMessage: 'EmailJS configuration is missing'
      });
      
      return { success: false, error: 'EmailJS configuration is missing', receiptNumber: 'CONFIG_MISSING' };
    }

    console.log('Sending loan payment email via EmailJS...');
    console.log('EmailJS config:', {
      serviceId: config.serviceId,
      templateId: config.receiptTemplateId,
      publicKey: config.publicKey.substring(0, 10) + '...'
    });
    
    let response;
    try {
      response = await emailjs.send(
        config.serviceId,
        config.receiptTemplateId,
        emailData
      );
    } catch (emailError: any) {
      console.error('❌ EmailJS send failed for loan payment');
      
      let errorDetails: any = {};
      if (emailError && typeof emailError === 'object') {
        try {
          errorDetails = JSON.parse(JSON.stringify(emailError));
        } catch (e) {
          errorDetails = {
            message: emailError.message || 'No message',
            name: emailError.name || 'No name',
            toString: emailError.toString ? emailError.toString() : 'No toString'
          };
        }
      } else {
        errorDetails = { raw: emailError, type: typeof emailError };
      }
      
      console.error('Error details:', errorDetails);
      throw new Error(`EmailJS failed: ${JSON.stringify(errorDetails)}`);
    }

    console.log('✅ Loan payment receipt sent:', response);

    await logEmailAttempt({
      transactionId,
      transactionType: 'loan_payment',
      userId,
      email: userDetails.email,
      sentAt: new Date().toISOString(),
      status: 'sent'
    });

    return { success: true, receiptNumber };
  } catch (error: any) {
    console.error('❌ Error sending loan payment receipt');
    
    // Extract error message properly
    let errorMessage = 'Failed to send receipt email';
    if (error && typeof error === 'object') {
      if (error.message) {
        errorMessage = error.message;
      } else if (error.toString && error.toString() !== '[object Object]') {
        errorMessage = error.toString();
      } else {
        try {
          errorMessage = JSON.stringify(error);
        } catch (e) {
          errorMessage = 'Unknown error object';
        }
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    console.error('Error message:', errorMessage);
    
    await logEmailAttempt({
      transactionId: `${loanId}-${Date.now()}`,
      transactionType: 'loan_payment',
      userId,
      email: '',
      sentAt: new Date().toISOString(),
      status: 'failed',
      errorMessage: errorMessage
    });

    return { success: false, error: errorMessage };
  }
};

export const sendSavingsDepositReceipt = async (
  userId: string,
  depositAmount: number,
  currentBalance: number,
  depositControlNumber?: string
): Promise<{ success: boolean; error?: string; receiptNumber?: string }> => {
  try {
    const transactionId = `savings-${userId}-${Date.now()}`;
    
    const alreadySent = await checkEmailAlreadySent(transactionId, 'savings_deposit');
    if (alreadySent) {
      return { success: true, receiptNumber: 'ALREADY_SENT' };
    }

    const userDetails = await getUserDetails(userId);
    if (!userDetails) {
      throw new Error('Could not retrieve user details');
    }

    const role = userDetails.role.toLowerCase();
    if (role !== 'driver' && role !== 'operator') {
      return { success: true, receiptNumber: 'NOT_APPLICABLE' };
    }

    const receiptNumber = generateReceiptNumber();

    // Prepare email data - using format that works with most EmailJS templates
    // Common variable names: to_email, to_name, from_name, message, etc.
    const emailData: Record<string, string> = {
      // Standard EmailJS template variables
      to_email: userDetails.email,
      to_name: userDetails.fullName,
      from_name: 'SAMPA Cooperative',
      reply_to: 'noreply@sampacoop.com',
      
      // Transaction-specific variables
      member_role: userDetails.role,
      transaction_type: 'Savings Deposit',
      transaction_amount: `₱${depositAmount.toFixed(2)}`,
      transaction_date: new Date().toLocaleString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      receipt_number: receiptNumber,
      remaining_balance: `₱${currentBalance.toFixed(2)}`,
      deposit_number: depositControlNumber || 'N/A',
      
      // Message body for simple templates
      message: `Dear ${userDetails.fullName},

Your savings deposit has been successfully processed.

Deposit Control Number: ${depositControlNumber || 'N/A'}
Deposit Amount: ₱${depositAmount.toFixed(2)}
Current Balance: ₱${currentBalance.toFixed(2)}
Receipt Number: ${receiptNumber}
Date: ${new Date().toLocaleString('en-PH')}

Thank you for using SAMPA Cooperative.

Best regards,
SAMPA Cooperative Team`,
      
      // Subject line
      subject: 'Savings Deposit Receipt - SAMPA Cooperative'
    };
    
    console.log('Email data prepared:', Object.keys(emailData));
    console.log('Deposit control number in email:', depositControlNumber || 'N/A');

    console.log('Getting EmailJS config for savings deposit receipt...');
    const config = await getEmailJSConfig();
    console.log('EmailJS config retrieved:', { 
      hasServiceId: !!config.serviceId, 
      hasTemplateId: !!config.receiptTemplateId, 
      hasPublicKey: !!config.publicKey 
    });
    
    if (!config.serviceId || !config.receiptTemplateId || !config.publicKey) {
      const missingFields = [];
      if (!config.serviceId) missingFields.push('serviceId');
      if (!config.receiptTemplateId) missingFields.push('receiptTemplateId');
      if (!config.publicKey) missingFields.push('publicKey');
      
      const errorMsg = `EmailJS configuration is missing: ${missingFields.join(', ')}`;
      console.error('❌', errorMsg);
      
      // Log the failed attempt
      await logEmailAttempt({
        transactionId,
        transactionType: 'savings_deposit',
        userId,
        email: userDetails.email,
        sentAt: new Date().toISOString(),
        status: 'failed',
        errorMessage: errorMsg
      });
      
      return { success: false, error: errorMsg, receiptNumber: 'CONFIG_MISSING' };
    }

    console.log('Sending email via EmailJS...');
    console.log('EmailJS config:', {
      serviceId: config.serviceId,
      templateId: config.receiptTemplateId,
      publicKey: config.publicKey.substring(0, 10) + '...'
    });
    console.log('Email data keys:', Object.keys(emailData));
    
    let response;
    try {
      response = await emailjs.send(
        config.serviceId,
        config.receiptTemplateId,
        emailData
      );
    } catch (emailError: any) {
      console.error('❌ EmailJS send failed');
      
      // Try to extract error details in multiple ways
      let errorDetails: any = {};
      
      if (emailError && typeof emailError === 'object') {
        // Try to get all enumerable properties
        try {
          errorDetails = JSON.parse(JSON.stringify(emailError));
        } catch (e) {
          // If JSON stringify fails, try manual extraction
          errorDetails = {
            message: emailError.message || 'No message',
            name: emailError.name || 'No name',
            stack: emailError.stack || 'No stack',
            toString: emailError.toString ? emailError.toString() : 'No toString',
            keys: Object.keys(emailError),
            raw: emailError
          };
        }
      } else {
        errorDetails = { raw: emailError, type: typeof emailError };
      }
      
      console.error('Error details:', errorDetails);
      throw new Error(`EmailJS failed: ${JSON.stringify(errorDetails)}`);
    }

    console.log('✅ Savings deposit receipt sent:', response);

    await logEmailAttempt({
      transactionId,
      transactionType: 'savings_deposit',
      userId,
      email: userDetails.email,
      sentAt: new Date().toISOString(),
      status: 'sent'
    });

    return { success: true, receiptNumber };
  } catch (error: any) {
    console.error('❌ Error sending savings deposit receipt');
    
    // Extract error message properly
    let errorMessage = 'Failed to send receipt email';
    if (error && typeof error === 'object') {
      if (error.message) {
        errorMessage = error.message;
      } else if (error.toString && error.toString() !== '[object Object]') {
        errorMessage = error.toString();
      } else {
        try {
          errorMessage = JSON.stringify(error);
        } catch (e) {
          errorMessage = 'Unknown error object';
        }
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    console.error('Error message:', errorMessage);
    
    await logEmailAttempt({
      transactionId: `savings-${userId}-${Date.now()}`,
      transactionType: 'savings_deposit',
      userId,
      email: '',
      sentAt: new Date().toISOString(),
      status: 'failed',
      errorMessage: errorMessage
    });

    return { success: false, error: errorMessage };
  }
};

export const sendTransactionReceipt = async (
  type: 'loan_payment' | 'savings_deposit',
  userId: string,
  data: {
    loanId?: string;
    amount: number;
    remainingBalance?: number;
    currentBalance?: number;
    depositControlNumber?: string;
    paymentScheduleDay?: number;
  }
): Promise<{ success: boolean; error?: string; receiptNumber?: string }> => {
  if (type === 'loan_payment' && data.loanId && data.remainingBalance !== undefined) {
    return sendLoanPaymentReceipt(
      userId,
      data.loanId,
      data.amount,
      data.remainingBalance,
      data.paymentScheduleDay
    );
  }
  if (type === 'savings_deposit' && data.currentBalance !== undefined) {
    return sendSavingsDepositReceipt(
      userId,
      data.amount,
      data.currentBalance,
      data.depositControlNumber
    );
  }
  return { success: false, error: 'Invalid transaction data' };
};
