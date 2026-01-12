import emailjs from '@emailjs/browser';

// Initialize EmailJS with your public key
const EMAILJS_PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || '';
const EMAILJS_SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || '';
const EMAILJS_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || '';

// Initialize EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

interface EmailData {
  to_name?: string;
  to_email?: string;
  subject?: string;
  message?: string;
  [key: string]: any;
}

export const sendEmail = async (templateId: string, emailData: EmailData): Promise<boolean> => {
  try {
    if (!EMAILJS_SERVICE_ID || !templateId || !EMAILJS_PUBLIC_KEY) {
      console.error('EmailJS configuration is missing');
      return false;
    }

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
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
  const emailData = {
    to_name: name,
    email: email,  // This should match the variable name in your EmailJS template
    subject: 'Welcome to SAMPA Cooperative',
    message: `Dear ${name},

Thank you for registering with SAMPA Cooperative. Your membership is now active and you can access all member benefits.

To access your account, please log in at: http://localhost:3000/login

Best regards,
SAMPA Cooperative Team`
  };

  return sendEmail(EMAILJS_TEMPLATE_ID, emailData);
};

export const sendLoanApprovalEmail = async (email: string, name: string, loanId: string) => {
  const emailData = {
    to_name: name,
    email: email,  // This should match the variable name in your EmailJS template
    loan_id: loanId,
    subject: 'Loan Application Approved',
    message: `Dear ${name},

Your loan application has been approved. Please check your account for more details.

Loan ID: ${loanId}

To access your account, please log in at: http://localhost:3000/login

Best regards,
SAMPA Cooperative Team`
  };

  return sendEmail(EMAILJS_TEMPLATE_ID, emailData);
};