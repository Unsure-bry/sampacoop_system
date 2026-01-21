import { logActivity } from './activityLogger';
import { AppUser } from './auth';

/**
 * Tracks a user action in the activity logs
 * @param user - The current user performing the action
 * @param action - Description of the action performed
 * @param additionalData - Any additional data to include in the log
 */
export async function trackUserAction(
  user: AppUser | null,
  action: string,
  additionalData?: Record<string, any>
): Promise<boolean> {
  if (!user) {
    console.warn('Cannot track user action: no user is authenticated');
    return false;
  }

  try {
    // Get client information for the log
    const clientInfo = getClientInfo();

    const activityLog = {
      userId: user.uid,
      userEmail: user.email,
      userName: user.displayName,
      role: user.role,
      action,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      ...additionalData
    };

    const result = await logActivity(activityLog);

    if (!result.success) {
      console.error('Failed to log activity:', result.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error tracking user action:', error);
    return false;
  }
}

/**
 * Gets client information like IP address and user agent
 * Note: Since this runs on the client-side, we can only approximate IP address
 * In a real application, you'd typically log IP address on the backend
 */
function getClientInfo() {
  return {
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    // Note: Getting real IP on client-side is limited due to privacy restrictions
    // The IP address will typically be logged on the backend
    ipAddress: 'client-side-ip-not-available' 
  };
}

/**
 * Higher-order function to wrap actions with automatic logging
 * @param user - The current user
 * @param actionDescription - Description of the action
 * @param actionFn - The function to execute
 * @param additionalData - Additional data to log with the action
 */
export async function withActionTracking<T>(
  user: AppUser | null,
  actionDescription: string,
  actionFn: () => Promise<T>,
  additionalData?: Record<string, any>
): Promise<T> {
  // Track the action
  await trackUserAction(user, actionDescription, additionalData);

  // Execute the original function
  return await actionFn();
}

// Specific action tracking functions
export const trackLogin = async (user: AppUser | null) => {
  return trackUserAction(user, 'User logged in to the system');
};

export const trackLogout = async (user: AppUser | null) => {
  return trackUserAction(user, 'User logged out of the system');
};

export const trackProfileUpdate = async (user: AppUser | null) => {
  return trackUserAction(user, 'User updated their profile information');
};

export const trackMemberCreation = async (user: AppUser | null, memberId: string) => {
  return trackUserAction(user, `User created new member profile: ${memberId}`, { memberId });
};

export const trackLoanApproval = async (user: AppUser | null, loanId: string) => {
  return trackUserAction(user, `User approved loan request: ${loanId}`, { loanId });
};

export const trackLoanRejection = async (user: AppUser | null, loanId: string) => {
  return trackUserAction(user, `User rejected loan request: ${loanId}`, { loanId });
};

export const trackSavingsUpdate = async (user: AppUser | null, memberId: string) => {
  return trackUserAction(user, `User updated savings record for member: ${memberId}`, { memberId });
};

export const trackReportGeneration = async (user: AppUser | null, reportType: string) => {
  return trackUserAction(user, `User generated ${reportType} report`, { reportType });
};

export const trackSettingsUpdate = async (user: AppUser | null) => {
  return trackUserAction(user, 'User updated system settings');
};