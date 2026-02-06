/**
 * Service to manage user-member linking and ensure consistent IDs across collections
 * This service enforces a single source of truth for user identification
 */

import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';

/**
 * Generates a consistent user ID from email
 * @param email - User's email address
 * @returns Consistent user ID for both users and members collections
 */
export function generateUserId(email: string): string {
  return encodeURIComponent(email.toLowerCase());
}

/**
 * Creates a linked user-member record ensuring both collections are synchronized
 * @param userData - Complete user/member data
 * @returns Promise with success status and created IDs
 */
export async function createLinkedUserMember(userData: {
  email: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  suffix?: string;
  role: string;
  phoneNumber: string;
  birthdate?: string;
  driverInfo?: any;
  operatorInfo?: any;
  paymentInfo?: any;
}): Promise<{ success: boolean; userId?: string; memberId?: string; error?: string }> {
  try {
    const userId = generateUserId(userData.email);
    const fullName = `${userData.firstName} ${userData.middleName ? userData.middleName + ' ' : ''}${userData.lastName}${userData.suffix ? ' ' + userData.suffix : ''}`;

    // Create user document first
    const userDocument = {
      email: userData.email,
      displayName: fullName,
      role: userData.role.toLowerCase(),
      createdAt: new Date().toISOString(),
      isPasswordSet: false,
    };

    const userResult = await firestore.setDocument('users', userId, userDocument);
    
    if (!userResult.success) {
      return { success: false, error: 'Failed to create user account' };
    }

    // Create member document with same ID
    const memberDocument = {
      firstName: userData.firstName,
      lastName: userData.lastName,
      middleName: userData.middleName || '',
      suffix: userData.suffix || '',
      fullName: fullName,
      email: userData.email,
      phoneNumber: userData.phoneNumber,
      birthdate: userData.birthdate || '',
      role: userData.role,
      driverInfo: userData.driverInfo || null,
      operatorInfo: userData.operatorInfo || null,
      paymentInfo: userData.paymentInfo || null,
      status: 'Active',
      userId: userId, // Critical: Link to user account
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const memberResult = await firestore.setDocument('members', userId, memberDocument);
    
    if (!memberResult.success) {
      // Rollback user creation if member creation fails
      await firestore.deleteDocument('users', userId);
      return { success: false, error: 'Failed to create member profile' };
    }

    return { 
      success: true, 
      userId: userId, 
      memberId: userId 
    };
  } catch (error) {
    console.error('Error creating linked user-member:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Validates and heals user-member linkage on login
 * @param userId - User ID to validate
 * @returns Promise with validation result and healing status
 */
export async function validateAndHealUserMemberLink(userId: string): Promise<{
  isValid: boolean;
  healed: boolean;
  userData?: any;
  memberData?: any;
  error?: string;
}> {
  try {
    // Fetch user data
    const userResult = await firestore.getDocument('users', userId);
    if (!userResult.success || !userResult.data) {
      return { isValid: false, healed: false, error: 'User account not found' };
    }

    const userData = userResult.data as any;

    // Fetch member data
    const memberResult = await firestore.getDocument('members', userId);
    
    // If member exists, validate linkage
    if (memberResult.success && memberResult.data) {
      const memberData = memberResult.data as any;
      
      // Check if linkage is correct
      if (memberData.userId === userId && memberData.email === userData.email) {
        return { 
          isValid: true, 
          healed: false, 
          userData, 
          memberData 
        };
      }
      
      // Heal incorrect linkage
      const updateResult = await firestore.updateDocument('members', userId, {
        userId: userId,
        email: userData.email,
        updatedAt: new Date().toISOString()
      });
      
      if (updateResult.success) {
        return { 
          isValid: true, 
          healed: true, 
          userData, 
          memberData: { ...memberData, userId, email: userData.email } 
        };
      }
    }
    
    // Member doesn't exist - create it
    const fullName = userData.displayName || userData.fullName || 
                     `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 
                     'User';
    
    const memberDocument = {
      firstName: userData.firstName || fullName.split(' ')[0] || '',
      lastName: userData.lastName || fullName.split(' ').slice(-1)[0] || '',
      middleName: userData.middleName || '',
      suffix: userData.suffix || '',
      fullName: fullName,
      email: userData.email,
      phoneNumber: userData.contactNumber || userData.phoneNumber || '',
      birthdate: userData.birthdate || '',
      role: userData.role || 'member',
      driverInfo: userData.driverInfo || null,
      operatorInfo: userData.operatorInfo || null,
      status: 'Active',
      userId: userId,
      createdAt: userData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const createResult = await firestore.setDocument('members', userId, memberDocument);
    
    if (createResult.success) {
      toast.success('Member profile initialized successfully');
      return { 
        isValid: true, 
        healed: true, 
        userData, 
        memberData: memberDocument 
      };
    }

    return { 
      isValid: false, 
      healed: false, 
      userData, 
      error: 'Failed to create member profile' 
    };
  } catch (error) {
    console.error('Error validating/healing user-member link:', error);
    return { 
      isValid: false, 
      healed: false, 
      error: 'An unexpected error occurred during validation' 
    };
  }
}

/**
 * Gets member data by user ID with automatic healing
 * @param userId - User ID to lookup
 * @returns Promise with member data or null
 */
export async function getMemberByUserId(userId: string): Promise<any | null> {
  try {
    // First validate and heal the linkage
    const validationResult = await validateAndHealUserMemberLink(userId);
    
    if (!validationResult.isValid) {
      console.error('User-member linkage validation failed:', validationResult.error);
      return null;
    }

    // Return member data
    return validationResult.memberData || null;
  } catch (error) {
    console.error('Error getting member by user ID:', error);
    return null;
  }
}

/**
 * Checks if an email already exists in the users collection
 * @param email - Email to check for existence
 * @returns Promise with boolean indicating if email exists
 */
export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    const userId = generateUserId(email);
    const userResult = await firestore.getDocument('users', userId);
    
    return userResult.success && userResult.data !== null;
  } catch (error) {
    console.error('Error checking email existence:', error);
    return false; // If there's an error, assume email doesn't exist to avoid blocking registration
  }
}

/**
 * Updates both user and member records consistently
 * @param userId - User ID to update
 * @param updateData - Data to update in both collections
 * @returns Promise with success status
 */
export async function updateUserMember(userId: string, updateData: any): Promise<{ success: boolean; error?: string }> {
  try {
    const updates: Array<Promise<any>> = [];
    
    // Prepare user updates
    const userUpdates: any = {};
    if (updateData.email) userUpdates.email = updateData.email;
    if (updateData.firstName || updateData.lastName) {
      const fullName = `${updateData.firstName || ''} ${updateData.lastName || ''}`.trim();
      userUpdates.displayName = fullName;
    }
    if (Object.keys(userUpdates).length > 0) {
      userUpdates.updatedAt = new Date().toISOString();
      updates.push(firestore.updateDocument('users', userId, userUpdates));
    }

    // Prepare member updates
    const memberUpdates: any = { ...updateData, updatedAt: new Date().toISOString() };
    // Remove fields that shouldn't go to members collection
    delete memberUpdates.email;
    delete memberUpdates.password;
    delete memberUpdates.isPasswordSet;
    
    if (Object.keys(memberUpdates).length > 0) {
      updates.push(firestore.updateDocument('members', userId, memberUpdates));
    }

    // Execute updates in parallel
    const results = await Promise.all(updates);
    
    const allSuccessful = results.every(result => result.success);
    
    if (allSuccessful) {
      return { success: true };
    } else {
      return { success: false, error: 'Failed to update one or more records' };
    }
  } catch (error) {
    console.error('Error updating user-member records:', error);
    return { success: false, error: 'An unexpected error occurred during update' };
  }
}