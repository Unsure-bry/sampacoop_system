import emailjs from '@emailjs/browser';
import { firestore } from './firebase';

// Cache for EmailJS configuration
let cachedConfig: {
  publicKey: string;
  serviceId: string;
  templateId: string;
  receiptTemplateId?: string;
} | null = null;

// EmailJS Configuration - fetch from Firestore with environment variable fallback
const getEmailJSConfig = async () => {
  // Return cached config if available
  if (cachedConfig) {
    return cachedConfig;
  }

  // For client-side rendering, try Firestore first
  if (typeof window !== 'undefined') {
    let firestoreConfig = null;
    
    try {
      const result = await firestore.getDocument('systemConfig', 'emailjs');
      if (result.success && result.data) {
        firestoreConfig = {
          publicKey: result.data.publicKey || '',
          serviceId: result.data.serviceId || '',
          templateId: result.data.templateId || '',
          receiptTemplateId: result.data.receiptTemplateId || ''
        };
      }
    } catch (error) {
      console.warn('Failed to fetch EmailJS config from Firestore:', error);
    }

    // Build config with Firestore data as priority, fallback to env vars
    const config = {
      publicKey: firestoreConfig?.publicKey || process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || '',
      serviceId: firestoreConfig?.serviceId || process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || '',
      templateId: firestoreConfig?.templateId || process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || '',
      receiptTemplateId: firestoreConfig?.receiptTemplateId || ''
    };
    
    // Cache the config
    cachedConfig = config;
    return config;
  }

  // For server-side, return empty strings
  return {
    publicKey: '',
    serviceId: '',
    templateId: ''
  };
};

// Initialize EmailJS on client side only
const initEmailJS = async () => {
  if (typeof window !== 'undefined') {
    const config = await getEmailJSConfig();
    if (config.publicKey) {
      emailjs.init(config.publicKey);
      console.log('EmailJS initialized successfully');
    } else {
      console.warn('EmailJS public key not found. Email functionality will not work.');
    }
  }
};

// Initialize on module load
initEmailJS();

interface EmailData {
  to_name?: string;
  to_email?: string;
  subject?: string;
  message?: string;
  [key: string]: any;
}

export const sendEmail = async (templateId: string, emailData: EmailData): Promise<boolean> => {
  try {
    const config = await getEmailJSConfig();
    if (!config.serviceId || !templateId || !config.publicKey) {
      console.error('EmailJS configuration is missing');
      return false;
    }

    const response = await emailjs.send(
      config.serviceId,
      templateId,
      emailData
    );

    console.log('Email sent successfully:', response);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

// Specific email templates
export const sendMemberRegistrationEmail = async (email: string, name: string) => {
  // Generate a temporary password reset link
  const resetLink = `https://sampa-coop.vercel.app/setup-password?email=${encodeURIComponent(email)}`;
  
  const emailData = {
    to_name: name,
    email: email,  // This should match the variable name in your EmailJS template
    reset_link: resetLink,  // Include the reset link in the email data
    subject: 'Welcome to SAMPA Cooperative - Set Your Password',
    message: `Dear ${name},

Welcome to SAMPA Cooperative! Your membership has been successfully created.

To activate your account and set your login credentials, please click the link below:

SET UP YOUR PASSWORD: ${resetLink}

For security reasons, this link should be used within 24 hours. After setting your password, you can log in to the system using your email address.

To access your account after setting up your password, please visit: https://sampa-coop.vercel.app/login

Best regards,
SAMPA Cooperative Team`
  };

  const config = await getEmailJSConfig();
  return sendEmail(config.templateId, emailData);
};

// Send email with auto-generated password (alternative approach)
export const sendAutoCredentialsEmail = async (email: string, name: string, tempPassword: string) => {
  const emailData = {
    to_name: name,
    email: email,
    temp_password: tempPassword,  // Include temporary password in the email data
    subject: 'Your SAMPA Cooperative Login Credentials',
    message: `Dear ${name},

Welcome to SAMPA Cooperative! Your account has been created with the following login credentials:

Email: ${email}
Temporary Password: ${tempPassword}

For security, please change your password immediately after your first login.

To access your account, please log in at: https://sampa-coop.vercel.app/login

Best regards,
SAMPA Cooperative Team`
  };

  const config = await getEmailJSConfig();
  return sendEmail(config.templateId, emailData);
};
// Loan Approved Email//
export const sendLoanApprovalEmail = async (email: string, name: string, loanId: string) => {
  const emailData = {
    to_name: name,
    email: email,  // This should match the variable name in your EmailJS template
    loan_id: loanId,
    subject: 'Loan Application Approved',
    message: `Dear ${name},

Your loan application has been approved. Please check your account for more details.

Loan ID: ${loanId}

To access your account, please log in at: https://sampa-coop.vercel.app/login

Best regards,
SAMPA Cooperative Team`
  };

  const config = await getEmailJSConfig();
  return sendEmail(config.templateId, emailData);
};

// Send certificate generation notification email
export const sendCertificateNotificationEmail = async (
  email: string, 
  name: string, 
  membershipId: string,
  certificateDownloadUrl: string
) => {
  const emailData = {
    to_name: name,
    email: email,
    membership_id: membershipId,
    certificate_url: certificateDownloadUrl,
    subject: 'Your Official Membership Certificate - SAMPA Cooperative',
    message: `Dear ${name},

Congratulations! Your official membership certificate has been generated and is ready for download.

Membership ID: ${membershipId}

You can download your certificate using the following link:
${certificateDownloadUrl}

Please keep this certificate for your records. If you have any questions or need corrections, please contact our support team.

Best regards,
SAMPA Cooperative Team`
  };

  const config = await getEmailJSConfig();
  return sendEmail(config.templateId, emailData);

};

// Loan Payment Message//
export const sendPaymentMessage = async (
  email: string, 
  name: string, 
  receiptNumber: number,
  amountReceived: number,
  remainingBalance: number
) => {
  const emailData = {
    to_name: name,
    email: email,
    subject: 'Your Official Payment Receipt - SAMPA Cooperative',
    message: `Dear ${name},

    Hi! ${name},

    I hope you're doing well!

    Thank you for your payment. We are pleased to confirm that we have successfully received your payment of [Amount] on [Date] for your [Loan Type] loan.
    
    Receipt Number: ${receiptNumber}
    Amount Received: ${amountReceived}
    Remaining Balance: ${remainingBalance}

    Best Regards,
    SAMPA Cooperative Team`
  };

  const config = await getEmailJSConfig();
  return sendEmail(config.templateId, emailData);

};

// Approved Loan Application//
export const approvedloanMessage = async (
  email: string, 
  name: string, 
  loanamount: number,
  interestRate: number,
  loanTerm: number,
  monthlyPayment: number
) => {
  const emailData = {
    to_name: name,
    email: email,
    subject: 'Loan Application Approved',
    message: `Dear ${name},

    Hi! ${name},

    I hope you're doing well!

    Thank you for your loan application. We are pleased to confirm that your loan application has been approved.
    
    Loan Amount: ${loanamount}
    Interest Rate: ${interestRate}%
    Loan Term: ${loanTerm}
    Monthly Payment: ${monthlyPayment}

    Best Regards,
    SAMPA Cooperative Team`
  };

  const config = await getEmailJSConfig();
  return sendEmail(config.templateId, emailData);

};

// Rejected Loan Application//
export const rejectedLoanMessage = async (
  email: string, 
  name: string, 
  loanamount: number,
  interestRate: number,
  loanTerm: number,
  monthlyPayment: number,
  reasonsForRejection: string,
) => {
  const emailData = {
    to_name: name,
    email: email,
    subject: 'Loan Application Rejected',
    message: `Dear ${name},

    Hi! ${name},

    I hope you're doing well!

    Thank you for your loan application. We are pleased to confirm that your loan application has been rejected.
    
    Loan Amount: ${loanamount}
    Interest Rate: ${interestRate}%
    Loan Term: ${loanTerm}
    Monthly Payment: ${monthlyPayment}
    Reasons for Rejection: ${reasonsForRejection}

    Best Regards,
    SAMPA Cooperative Team`
  };

  const config = await getEmailJSConfig();
  return sendEmail(config.templateId, emailData);

};

// Deposit Applicaion//
export const depositApplicationMessage = async (
  email: string, 
  name: string, 
  Deposit: number,
  DepositotalAmount: number,
  ControlNumber: number,  
) => {
  const emailData = {
    to_name: name,
    email: email,
    subject: 'Deposit Application Received',
    message: `Dear ${name},

    Hi! ${name},

    I hope you're doing well!

  
    This is to confirm that we have received your deposit of ${deposit}. Your total amount deposited is ${depositotalAmount} with the control # ${ControlNumber}.

    Thank you for being a valued member of SAMPA Cooperative.




    Best Regards,
    SAMPA Cooperative Team`
  };

  const config = await getEmailJSConfig();
  return sendEmail(config.templateId, emailData);

};

// Withdrawal Application//
export const withdrawalApplicationMessage = async (
  email: string, 
  name: string, 
  Withdrawal: number,
  WithdrawalNumber: number,

)=> {
  const emailData = {
    to_name: name,
    email: email,
    subject: 'Withdrawal Application Received',
    message: `Dear ${name},

    Hi! ${name},

    I hope you're doing well!

    This is to inform you that you have made a withdrawal of ${withdrawal} with the withdrawal number ${withdrawalNumber}.

    Thank you for being a valued member of SAMPA Cooperative.

    Withdrawal: ${withdrawal}
    WithdrawalNumber: ${withdrawalNumber}


    Best Regards,
    SAMPA Cooperative Team`
  }

  const config = await getEmailJSConfig();
  return sendEmail(config.templateId, emailData);

};
