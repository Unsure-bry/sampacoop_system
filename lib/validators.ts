import { AppUser } from '@/lib/auth';
import { getDashboardPath } from '@/lib/auth';

/**
 * Validates admin routes specifically
 * @param user - The authenticated user
 * @returns boolean indicating if access is allowed
 */
export function validateAdminRoute(user: AppUser | null): boolean {
  if (!user) return false;
  if (!user.role) return false;
  
  // Convert role to lowercase for comparison
  const normalizedRole = user.role.toLowerCase();
  
  // Admin roles
  const adminRoles = ['admin', 'secretary', 'chairman', 'vice chairman', 'manager', 'treasurer', 'board of directors'];
  return adminRoles.includes(normalizedRole);
}

/**
 * Validates role-specific admin routes
 * @param pathname - The current route path
 * @param user - The authenticated user
 * @returns boolean indicating if access is allowed
 */
export function validateRoleSpecificAdminRoute(pathname: string, user: AppUser | null): boolean {
  if (!user) return false;
  if (!user.role) return false;
  
  // Convert role to lowercase for comparison
  const normalizedRole = user.role.toLowerCase().trim();
  
  // Define role-specific paths
  const rolePaths: Record<string, string> = {
    'secretary': '/admin/secretary/',
    'chairman': '/admin/chairman/',
    'vice chairman': '/admin/vice-chairman/',
    'manager': '/admin/manager/',
    'treasurer': '/admin/treasurer/',
    'board of directors': '/admin/bod/'
  };
  
  // Check if accessing role-specific dashboard
  for (const [role, pathPrefix] of Object.entries(rolePaths)) {
    if (pathname.startsWith(pathPrefix) && normalizedRole !== role) {
      return false;
    }
  }
  
  // For admin dashboard, allow access to admin and all other admin roles
  if (pathname === '/admin/dashboard') {
    const adminRoles = ['admin', 'secretary', 'chairman', 'vice chairman', 'manager', 'treasurer', 'board of directors'];
    return adminRoles.includes(normalizedRole);
  }
  
  // For general admin routes, allow access to all admin roles
  const adminRoles = ['admin', 'secretary', 'chairman', 'vice chairman', 'manager', 'treasurer', 'board of directors'];
  return adminRoles.includes(normalizedRole);
}

/**
 * Validates user routes
 * @param user - The authenticated user
 * @returns boolean indicating if access is allowed
 */
export function validateUserRoute(user: AppUser | null): boolean {
  if (!user) return false;
  if (!user.role) return false;
  
  // Convert role to lowercase for comparison
  const normalizedRole = user.role.toLowerCase();
  
  // Member roles
  const memberRoles = ['member', 'driver', 'operator'];
  // Admin roles can also access user routes
  const adminRoles = ['admin', 'secretary', 'chairman', 'vice chairman', 'manager', 'treasurer', 'board of directors'];
  
  return memberRoles.includes(normalizedRole) || adminRoles.includes(normalizedRole);
}

/**
 * Validates authentication routes (login, register)
 * @param user - The authenticated user
 * @returns boolean indicating if access is allowed
 */
export function validateAuthRoute(user: AppUser | null): boolean {
  // Auth routes are accessible to everyone - both authenticated and unauthenticated users
  // This ensures the login form is always accessible
  return true;
}

/**
 * Gets the appropriate dashboard route based on user role
 * @param user - The authenticated user
 * @returns The dashboard path for the user
 */
export function getDashboardRoute(user: AppUser | null): string {
  if (!user) return '/login';
  if (!user.role) return '/login';
  
  // Use the unified helper function
  return getDashboardPath(user.role);
}

/**
 * Prevents route conflicts between admin and user dashboards
 * @param pathname - The current route path
 * @param user - The authenticated user
 * @returns string with redirect path or null if no conflict
 */
export function preventRouteConflict(pathname: string, user: AppUser | null): string | null {
  // If no user, redirect to appropriate login for protected routes
  if (!user) {
    // For admin routes, redirect to admin login
    if (pathname.startsWith('/admin') && pathname !== '/admin/login' && pathname !== '/admin/register') {
      return '/admin/login';
    }
    // For user routes, redirect to user login
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/driver') || pathname.startsWith('/operator') ||
        pathname.startsWith('/profile') || pathname.startsWith('/loan') || pathname.startsWith('/savings')) {
      return '/login';
    }
    // For auth routes, allow access
    if (pathname === '/login' || pathname === '/register' || pathname === '/admin/login' || pathname === '/admin/register') {
      return null;
    }
    return null; // Allow access to public routes
  }
  
  // If user has no role or invalid role, redirect to login
  if (!user.role) return '/login';
  
  // Convert role to lowercase for comparison
  const normalizedRole = user.role.toLowerCase().trim();
  
  // Define valid roles and their dashboard paths
  const roleDashboardMap: Record<string, string> = {
    'admin': '/admin/dashboard',
    'secretary': '/admin/secretary/home',
    'chairman': '/admin/chairman/home',
    'vice chairman': '/admin/vice-chairman/home',
    'manager': '/admin/manager/home',
    'treasurer': '/admin/treasurer/home',
    'board of directors': '/admin/bod/home',
    'member': '/dashboard',
    'driver': '/driver/dashboard',
    'operator': '/operator/dashboard'
  };
  
  // Get the expected dashboard path for this user's role
  const expectedDashboardPath = roleDashboardMap[normalizedRole];
  
  // If role is not recognized, redirect to login
  if (!expectedDashboardPath) {
    return '/login';
  }
  
  // Admin roles
  const adminRoles = ['admin', 'secretary', 'chairman', 'vice chairman', 'manager', 'treasurer', 'board of directors'];
  const memberRoles = ['member'];
  const driverRoles = ['driver'];
  const operatorRoles = ['operator'];
  
  // If non-admin user tries to access admin routes (except login/register)
  if (pathname.startsWith('/admin') && 
      pathname !== '/admin/login' && 
      pathname !== '/admin/register' && 
      !adminRoles.includes(normalizedRole)) {
    // Redirect to their appropriate dashboard
    return expectedDashboardPath;
  }
  
  // If admin tries to access user dashboard, redirect to their specific admin dashboard
  if ((pathname === '/dashboard' || pathname === '/driver/dashboard' || pathname === '/operator/dashboard') && 
      adminRoles.includes(normalizedRole)) {
    return expectedDashboardPath;
  }
  
  // Role-specific dashboard access restrictions
  if (pathname === '/driver/dashboard' && !driverRoles.includes(normalizedRole)) {
    return expectedDashboardPath;
  }
  
  if (pathname === '/operator/dashboard' && !operatorRoles.includes(normalizedRole)) {
    return expectedDashboardPath;
  }
  
  // No conflict
  return null;
}

/**
 * Validates route access and returns appropriate redirect path
 * @param pathname - The current route path
 * @param user - The authenticated user
 * @returns string with redirect path or null if access is allowed
 */
export function validateRouteAccess(pathname: string, user: AppUser | null): string | null {
  // Check for route conflicts first
  const conflictRedirect = preventRouteConflict(pathname, user);
  if (conflictRedirect) {
    return conflictRedirect;
  }

  // Validate based on route type
  if (pathname.startsWith('/admin') && 
      pathname !== '/admin/login' && 
      pathname !== '/admin/register' && 
      pathname !== '/admin/unauthorized') {
    if (!user) return '/admin/login';
    if (!validateRoleSpecificAdminRoute(pathname, user)) return '/admin/unauthorized';
  }

  if (pathname.startsWith('/dashboard') || pathname.startsWith('/driver') || pathname.startsWith('/operator') ||
      pathname.startsWith('/profile') || pathname.startsWith('/loan') || pathname.startsWith('/savings')) {
    if (!user) return '/login';
    if (!validateUserRoute(user)) return '/login';
  }

  if (pathname === '/login' || pathname === '/register') {
    // Allow access to auth routes for everyone
    // Don't force redirect authenticated users
    return null;
  }
  
  if (pathname === '/admin/login' || pathname === '/admin/register') {
    // Allow access to admin auth routes for everyone
    // Don't force redirect authenticated users
    return null;
  }

  // Public routes or access allowed
  return null;
}
