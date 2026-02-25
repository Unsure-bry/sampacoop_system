import { firestore } from './firebase';

// Helper function to update password in Firestore
export async function updatePassword(userId: string, currentPassword: string, newPassword: string) {
  try {
    // First, get the current user document to verify current password
    const userDoc = await firestore.getDocument('users', userId);
    
    if (!userDoc.success || !userDoc.data) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data as any;
    
    // Verify current password
    if (!userData.passwordHash || !userData.salt) {
      throw new Error('Password verification failed');
    }
    
    // Hash the current password with the stored salt to verify it matches
    const isValid = await verifyPassword(currentPassword, userData.passwordHash, userData.salt);
    
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }
    
    // Hash the new password
    const { passwordHash, salt } = await hashPassword(newPassword);
    
    // Update the password in the users collection
    const updateResult = await firestore.updateDocument('users', userId, {
      passwordHash,
      salt,
      lastPasswordChange: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    if (!updateResult.success) {
      throw new Error('Failed to update password in users collection');
    }
    
    // Also update in the members collection if the document exists there
    const memberDoc = await firestore.getDocument('members', userId);
    if (memberDoc.success && memberDoc.data) {
      const memberUpdateResult = await firestore.updateDocument('members', userId, {
        passwordHash,
        salt,
        lastPasswordChange: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      if (!memberUpdateResult.success) {
        console.error('Warning: Failed to update password in members collection');
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating password:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Helper function to hash password using PBKDF2
async function hashPassword(password: string) {
  const enc = new TextEncoder();
  const saltArr = crypto.getRandomValues(new Uint8Array(16));
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltArr.buffer,
      iterations: 100000, // 100k iterations as per security spec
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  
  const passwordHash = toBase64(new Uint8Array(derivedBits));
  const salt = toBase64(saltArr);
  
  return { passwordHash, salt };
}

// Helper function to verify password
async function verifyPassword(inputPassword: string, storedHash: string, storedSalt: string) {
  const enc = new TextEncoder();
  const saltBytes = fromBase64(storedSalt);
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(inputPassword),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes.buffer,
      iterations: 100000, // 100k iterations as per security spec
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  
  const inputHash = toBase64(new Uint8Array(derivedBits));
  
  // Use timing-safe comparison to prevent timing attacks
  return timingSafeEqual(inputHash, storedHash);
}

// Timing-safe string comparison to prevent timing attacks
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

// Base64 encoding helper
function toBase64(buf: ArrayBuffer | Uint8Array) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

// Base64 decoding helper
function fromBase64(b64: string) {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}