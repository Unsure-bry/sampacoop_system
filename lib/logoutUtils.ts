/**
 * Centralized logout utilities for consistent logout behavior across the application
 * 
 * This module provides optimized logout functions that:
 * - Clear all authentication data immediately
 * - Provide instant redirection to login pages
 * - Prevent session persistence issues
 * - Work consistently across all user roles
 */

/**
 * Clears all authentication data from browser storage
 * This function clears cookies, localStorage, and sessionStorage to ensure
 * complete removal of authentication state
 */
export function clearAllAuthData(): void {
  try {
    // Clear authentication cookies
    document.cookie = 'authenticated=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'userRole=; path=/; max-age=0; SameSite=Lax';
    
    // Clear localStorage items
    localStorage.removeItem('authenticated');
    localStorage.removeItem('userRole');
    
    // Clear sessionStorage
    sessionStorage.clear();
  } catch (error) {
    console.error('Error clearing authentication data:', error);
    // Continue with logout even if clearing fails
  }
}

/**
 * Performs immediate logout with forced redirection
 * This function ensures instant logout without delay or hanging states
 * 
 * @param redirectPath - Path to redirect to after logout (defaults to '/login')
 * @param isAdmin - Whether this is an admin logout (affects redirect path)
 */
export function performImmediateLogout(redirectPath: string = '/login', isAdmin: boolean = false): void {
  // Clear all authentication data immediately
  clearAllAuthData();
  
  // Force immediate redirect using replace to prevent back navigation
  // Using replace instead of href prevents the user from navigating back to protected pages
  if (typeof window !== 'undefined') {
    window.location.replace(redirectPath);
  }
}

/**
 * Standardized logout handler for admin users
 * This function handles admin-specific logout with proper redirection
 */
export function handleAdminLogout(): void {
  // Clear authentication data and redirect to admin login
  performImmediateLogout('/admin/login', true);
}

/**
 * Standardized logout handler for regular users
 * This function handles user-side logout with proper redirection
 */
export function handleUserLogout(): void {
  // Clear authentication data and redirect to user login
  performImmediateLogout('/login', false);
}

/**
 * Universal logout handler that determines the appropriate redirect path
 * based on the current location
 * 
 * @param currentPath - Current path to determine redirect context
 */
export function handleUniversalLogout(currentPath: string): void {
  // Determine if we're in admin context
  const isAdminContext = currentPath.startsWith('/admin');
  
  if (isAdminContext) {
    handleAdminLogout();
  } else {
    handleUserLogout();
  }
}

export default {
  clearAllAuthData,
  performImmediateLogout,
  handleAdminLogout,
  handleUserLogout,
  handleUniversalLogout
};