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
  // Generate a temporary password reset link
  const resetLink = `http://localhost:3000/setup-password?email=${encodeURIComponent(email)}`;
  
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

To access your account after setting up your password, please visit: http://localhost:3000/login

Best regards,
SAMPA Cooperative Team`
  };

  return sendEmail(EMAILJS_TEMPLATE_ID, emailData);
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