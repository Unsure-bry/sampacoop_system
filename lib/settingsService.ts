import { firestore } from './firebase';

export interface SystemSettings {
  membershipPayment: number;
  reactivationFee: number;
  updatedAt?: string;
  updatedBy?: string;
}

const defaultSettings: SystemSettings = {
  membershipPayment: 1500,
  reactivationFee: 1500,
};

/**
 * Fetch system settings from Firestore
 * Returns default values if no settings exist
 */
export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    const result = await firestore.getDocument('systemSettings', 'general');
    
    if (result.success && result.data) {
      return {
        ...defaultSettings,
        ...result.data,
      };
    }
    
    return defaultSettings;
  } catch (error) {
    console.error('Error fetching system settings:', error);
    return defaultSettings;
  }
}

/**
 * Format amount as Philippine Peso currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format amount with comma separators (no currency symbol)
 */
export function formatNumberWithCommas(amount: number): string {
  return new Intl.NumberFormat('en-PH').format(amount);
}
