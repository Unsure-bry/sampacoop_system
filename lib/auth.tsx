'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { clearAllAuthData } from '@/lib/logoutUtils';

// User shape for this app (stored in Firestore)
export interface AppUser {
  uid: string;
  email: string;
  displayName?: string;
  role?: string;
  lastLogin?: string | Date;
}

// User data structure in Firestore
interface FirestoreUser {
  id: string;
  email: string;
  password?: string; // Plain text password (legacy support)
  passwordHash?: string; // Hashed password
  salt?: string; // Salt for hashed password
  displayName?: string;
  role?: string;
  lastLogin?: string | Date;
  createdAt?: string;
  isPasswordSet?: boolean;
}

interface CustomLoginResponse {
  success: boolean;
  user?: AppUser;
  error?: string;
  needsPasswordSetup?: boolean;
  email?: string;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ user: AppUser }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ user: AppUser }>;
  createUser: (userData: CreateUserParams) => Promise<{ success: boolean; error?: string }>;
  customLogin: (email: string, password: string) => Promise<CustomLoginResponse>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

// Parameters for creating a user
interface CreateUserParams {
  email: string;
  password: string;
  role: 'admin' | 'member' | 'driver' | 'operator';
  fullName?: string;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// Helpers: password hashing using Web Crypto (PBKDF2)
const enc = new TextEncoder();
const toBase64 = (buf: ArrayBuffer) => {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
};
const fromBase64 = (b64: string) => Uint8Array.from(atob(b64), c => c.charCodeAt(0));

async function deriveKey(password: string, salt: Uint8Array) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  // crypto.subtle expects a BufferSource (ArrayBuffer or TypedArray.buffer)
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      // cast to ArrayBuffer to satisfy TypeScript's BufferSource
      salt: (salt as unknown) as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  return new Uint8Array(derivedBits);
}

function uidFromEmail(email: string) {
  return encodeURIComponent(email.toLowerCase());
}

// Timing-safe string comparison
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

// Helper function to determine dashboard path based on role
export function getDashboardPath(role: string): string {
  // Convert role to lowercase for comparison
  const normalizedRole = role.toLowerCase();
  
  // Admin roles with specific dashboard paths
  if (normalizedRole === 'admin') {
    return '/admin/dashboard';
  } else if (normalizedRole === 'secretary') {
    return '/admin/secretary/home';
  } else if (normalizedRole === 'chairman') {
    return '/admin/chairman/home';
  } else if (normalizedRole === 'vice chairman') {
    return '/admin/vice-chairman/home';
  } else if (normalizedRole === 'manager') {
    return '/admin/manager/home';
  } else if (normalizedRole === 'treasurer') {
    return '/admin/treasurer/home';
  } else if (normalizedRole === 'board of directors') {
    return '/admin/bod/home';
  }
  
  // Specific roles with individual dashboards
  if (normalizedRole === 'driver') {
    return '/driver/dashboard';
  }
  
  if (normalizedRole === 'operator') {
    return '/operator/dashboard';
  }
  
  // Member role (default user dashboard)
  if (normalizedRole === 'member') {
    return '/dashboard';
  }
  
  // Default fallback
  return '/dashboard';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // On mount, check for an "authenticated" cookie and load user data
  useEffect(() => {
    const loadUserFromCookie = async () => {
      setLoading(true);
      try {
        const authenticatedMatch = document.cookie.match(/(?:^|; )authenticated=([^;]+)/);
        const roleMatch = document.cookie.match(/(?:^|; )userRole=([^;]+)/);
        
        if (authenticatedMatch && roleMatch) {
          const uid = decodeURIComponent(authenticatedMatch[1]);
          const role = decodeURIComponent(roleMatch[1]);
          
          // Fetch user data from Firestore
          const res = await firestore.getDocument('users', uid);
          if (res.success && res.data) {
            const data = res.data as any;
            setUser({ uid, email: data.email, displayName: data.displayName, role: role, lastLogin: data.lastLogin });
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Failed to load user from cookie', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUserFromCookie();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('SignIn called with email:', email);
      
      // Validate input
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
      }
      
      // Call the login API route instead of direct Firestore query
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      // Check if response is valid
      if (!response) {
        throw new Error('No response from server');
      }
      
      // Debug mode: Print the exact response if it's not JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // Get the raw response text for debugging
        const text = await response.text();
        console.log('Raw server response:', text);
        console.log('Response content-type:', contentType);
        console.log('Response status:', response.status);
        
        // Try to parse as JSON anyway in case of content-type mismatch
        try {
          const result = JSON.parse(text);
          if (result.error) {
            throw new Error(result.error);
          }
        } catch (parseError) {
          // If it's really HTML, return a descriptive error
          if (text.startsWith('<')) {
            throw new Error('Server returned an HTML error page instead of JSON. Check server logs.');
          }
          throw new Error('Server returned invalid response format');
        }
      }
      
      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        console.error('Error parsing API response:', parseError);
        throw new Error('Invalid response from server');
      }
      
      console.log('SignIn API response:', result);
      
      // Handle HTTP errors
      if (!response.ok) {
        console.log('SignIn API HTTP error:', response.status, response.statusText);
        // Check if this is a password setup required error
        if (result.needsPasswordSetup) {
          // Redirect to password setup page
          router.push(`/setup-password?email=${encodeURIComponent(email)}`);
          throw new Error('Password setup required');
        }
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Handle application-level errors
      if (!result) {
        throw new Error('Empty response from server');
      }
      
      if (result.error) {
        console.log('Login error from server:', result.error);
        // Check if this is a password setup required error
        if (result.needsPasswordSetup) {
          // Redirect to password setup page
          router.push(`/setup-password?email=${encodeURIComponent(email)}`);
          throw new Error('Password setup required');
        }
        throw new Error(result.error);
      }
      
      if (!result.success) {
        throw new Error(result.error || 'SignIn failed');
      }

      // If we get here, login was successful
      // The API returns { success: true, user: {...}, role: '...' }
      const { user, role } = result;
      
      // Validate user data
      if (!user) {
        console.error('Missing user data in response:', result);
        throw new Error('Invalid user data in response - user object missing');
      }
      
      if (!user.uid) {
        console.error('Missing uid in user data:', user);
        throw new Error('Invalid user data in response - uid missing');
      }
      
      if (!role) {
        console.error('Missing role in response:', result);
        throw new Error('Invalid user data in response - role missing');
      }
      
      console.log('SignIn successful, user:', user);
      
      // Set cookie with user role information (not HTTP-only so client can read it)
      try {
        document.cookie = `authenticated=${encodeURIComponent(user.uid)}; path=/; max-age=${60 * 60 * 24 * 7}`; // 7 days
        document.cookie = `userRole=${encodeURIComponent(role)}; path=/; max-age=${60 * 60 * 24 * 7}`; // 7 days
        console.log('Cookies set');
      } catch (cookieError) {
        console.error('Error setting cookies:', cookieError);
        // Don't fail the login if we can't set cookies
      }
      
      // Set user in state
      setUser(user);
      console.log('User state set');

      // Remove auto-redirect here - let the user stay on the current page
      // Role-based redirection should be handled by the calling component if needed
      // const dashboardPath = getDashboardPath(role);
      // router.push(dashboardPath);

      return { user };
    } catch (error: any) {
      console.error('SignIn error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      throw new Error(error.message || 'An unexpected error occurred during sign in');
    }
  };

  /**
   * Custom login function that verifies user credentials using Firestore only
   * @param email - User's email address
   * @param password - User's password
   * @returns Promise that resolves to success status, user object (if successful), and error message (if failed)
   */
  const customLogin = async (email: string, password: string): Promise<CustomLoginResponse> => {
    try {
      console.log('Custom login called with email:', email);
      
      // Validate input
      if (!email || !password) {
        return { success: false, error: 'Email and password are required' };
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { success: false, error: 'Invalid email format' };
      }
      
      // Call the login API route instead of direct Firestore query
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      // Check if response is valid
      if (!response) {
        return { success: false, error: 'No response from server' };
      }
      
      // Debug mode: Print the exact response if it's not JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // Get the raw response text for debugging
        const text = await response.text();
        console.log('Raw server response:', text);
        console.log('Response content-type:', contentType);
        console.log('Response status:', response.status);
        
        // Try to parse as JSON anyway in case of content-type mismatch
        try {
          const result = JSON.parse(text);
          if (result.error) {
            return { success: false, error: result.error };
          }
        } catch (parseError) {
          // If it's really HTML, return a descriptive error
          if (text.startsWith('<')) {
            return { success: false, error: 'Server returned an HTML error page instead of JSON. Check server logs.' };
          }
          return { success: false, error: 'Server returned invalid response format' };
        }
      }
      
      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        console.error('Error parsing API response:', parseError);
        return { success: false, error: 'Invalid response from server' };
      }
      
      console.log('Login API response:', result);
      
      // Handle HTTP errors
      if (!response.ok) {
        console.log('Login API HTTP error:', response.status, response.statusText);
        // Check if this is a password setup required error
        if (result.needsPasswordSetup) {
          // Return a special error indicating password setup is needed
          return { success: false, error: 'Password setup required', needsPasswordSetup: true, email: email };
        }
        return { success: false, error: result.error || `HTTP ${response.status}: ${response.statusText}` };
      }
      
      // Handle application-level errors
      if (!result) {
        return { success: false, error: 'Empty response from server' };
      }
      
      if (result.error) {
        console.log('Login error from server:', result.error);
        // Check if this is a password setup required error
        if (result.needsPasswordSetup) {
          // Return a special error indicating password setup is needed
          return { success: false, error: 'Password setup required', needsPasswordSetup: true, email: email };
        }
        return { success: false, error: result.error };
      }
      
      if (!result.success) {
        console.log('Login unsuccessful:', result.error);
        return { success: false, error: result.error || 'Login failed' };
      }

      // If we get here, login was successful
      // The API returns { success: true, user: {...}, role: '...' }
      const { user, role } = result;
      
      // Validate user data
      if (!user) {
        console.error('Missing user data in response:', result);
        return { success: false, error: 'Invalid user data in response - user object missing' };
      }
      
      if (!user.uid) {
        console.error('Missing uid in user data:', user);
        return { success: false, error: 'Invalid user data in response - uid missing' };
      }
      
      if (!role) {
        console.error('Missing role in response:', result);
        return { success: false, error: 'Invalid user data in response - role missing' };
      }
      
      console.log('Login successful, user:', user);
      
      // Set cookie with user role information (not HTTP-only so client can read it)
      try {
        document.cookie = `authenticated=${encodeURIComponent(user.uid)}; path=/; max-age=${60 * 60 * 24 * 7}`; // 7 days
        document.cookie = `userRole=${encodeURIComponent(role)}; path=/; max-age=${60 * 60 * 24 * 7}`; // 7 days
        console.log('Cookies set');
      } catch (cookieError) {
        console.error('Error setting cookies:', cookieError);
        // Don't fail the login if we can't set cookies
      }
      
      // Set user in state
      setUser(user);
      console.log('User state set');

      return { success: true, user };
    } catch (error: any) {
      console.error('Login error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      return { success: false, error: error.message || 'An unexpected error occurred during login' };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    // Check if user with this email already exists
    const queryResult = await firestore.queryDocuments('users', [
      { field: 'email', operator: '==', value: email }
    ]);
    
    if (queryResult.success && queryResult.data && queryResult.data.length > 0) {
      throw new Error('Email is already registered');
    }

    // Create salt and hash
    const saltArr = crypto.getRandomValues(new Uint8Array(16));
    const passwordDerived = await deriveKey(password, saltArr);
    const saltB64 = toBase64(saltArr.buffer);
    const hashB64 = toBase64(passwordDerived.buffer);

    // Generate UID from email
    const uid = uidFromEmail(email);

    const userData = {
      email,
      displayName: fullName || '',
      role: 'member', // Default role for new users
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      passwordHash: hashB64,
      salt: saltB64,
      isPasswordSet: true, // Set flag to true for direct registration
    };

    const setRes = await firestore.setDocument('users', uid, userData);
    if (!setRes.success) {
      throw new Error('Failed to create user');
    }

    // Set cookies
    document.cookie = `authenticated=${encodeURIComponent(uid)}; path=/; max-age=${60 * 60 * 24 * 7}`;
    document.cookie = `userRole=member; path=/; max-age=${60 * 60 * 24 * 7}`;
    
    const appUser: AppUser = { uid, email, displayName: fullName || '', role: 'member', lastLogin: userData.lastLogin };
    setUser(appUser);

    // Redirect to user dashboard after signup using the unified helper function
    const dashboardPath = getDashboardPath('member');
    router.push(dashboardPath);

    return { user: appUser };
  };

  /**
   * Create a user in Firestore with the specified parameters
   * @param userData - Object containing email, password, role, and optional fullName
   * @returns Promise that resolves to success status and optional error message
   */
  const createUser = async (userData: CreateUserParams): Promise<{ success: boolean; error?: string }> => {
    try {
      const { email, password, role, fullName } = userData;
      
      // Validate role
      const validRoles = ['admin', 'member', 'driver', 'operator'] as const;
      if (!validRoles.includes(role)) {
        return { success: false, error: 'Invalid role specified' };
      }
      
      // Check if user with this email already exists
      const queryResult = await firestore.queryDocuments('users', [
        { field: 'email', operator: '==', value: email }
      ]);
      
      if (queryResult.success && queryResult.data && queryResult.data.length > 0) {
        return { success: false, error: 'User with this email already exists' };
      }

      // Create salt and hash the password
      const saltArr = crypto.getRandomValues(new Uint8Array(16));
      const passwordDerived = await deriveKey(password, saltArr);
      const saltB64 = toBase64(saltArr.buffer);
      const hashB64 = toBase64(passwordDerived.buffer);

      // Generate UID from email
      const uid = uidFromEmail(email);

      // Prepare user document
      const userDocument = {
        email,
        displayName: fullName || '',
        role,
        passwordHash: hashB64,
        salt: saltB64,
        isPasswordSet: true, // Set flag to true for admin-created users with passwords
        createdAt: new Date().toISOString(),
      };

      // Store user in Firestore
      const result = await firestore.setDocument('users', uid, userDocument);
      
      if (result.success) {
        return { success: true };
      } else {
        return { success: false, error: 'Failed to store user in Firestore' };
      }
    } catch (error) {
      console.error('Error creating user:', error);
      return { success: false, error: 'An unexpected error occurred while creating the user' };
    }
  };

  const logout = () => {
    // Clear user state immediately to prevent UI flickering
    setUser(null);
    
    // Clear all authentication data using centralized utility
    clearAllAuthData();
    
    // Don't show toast message during logout as it introduces delay
    // toast.success('Signed out successfully.');
  };

  const resetPassword = async (email: string) => {
    // Since we're not using Firebase Auth, implement a simple reset flow:
    // For production, send an email with a secure token and allow password reset.
    // Here we'll throw to indicate not-implemented.
    throw new Error('Password reset via Firestore is not implemented. Implement a secure server-side flow.');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, createUser, customLogin, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);