import { AppUser } from '@/lib/auth';

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
  const normalizedRole = user.role.toLowerCase();
  
  // Check if accessing role-specific dashboard
  if (pathname.startsWith('/admin/secretary/') && normalizedRole !== 'secretary') {
    return false;
  }
  
  if (pathname.startsWith('/admin/chairman/') && normalizedRole !== 'chairman') {
    return false;
  }
  
  if (pathname.startsWith('/admin/vice-chairman/') && normalizedRole !== 'vice chairman') {
    return false;
  }
  
  if (pathname.startsWith('/admin/manager/') && normalizedRole !== 'manager') {
    return false;
  }
  
  if (pathname.startsWith('/admin/treasurer/') && normalizedRole !== 'treasurer') {
    return false;
  }
  
  if (pathname.startsWith('/admin/bod/') && normalizedRole !== 'board of directors') {
    return false;
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
  // Auth routes are accessible when not authenticated
  return !user;
}

/**
 * Gets the appropriate dashboard route based on user role
 * @param user - The authenticated user
 * @returns The dashboard path for the user
 */
export function getDashboardRoute(user: AppUser | null): string {
  if (!user) return '/login';
  if (!user.role) return '/login';
  
  // Convert role to lowercase for comparison
  const normalizedRole = user.role.toLowerCase();
  
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
  
  // Member roles
  const memberRoles = ['member', 'driver', 'operator'];
  if (memberRoles.includes(normalizedRole)) {
    return '/dashboard';
  }
  
  return '/login';
}

/**
 * Prevents route conflicts between admin and user dashboards
 * @param pathname - The current route path
 * @param user - The authenticated user
 * @returns string with redirect path or null if no conflict
 */
export function preventRouteConflict(pathname: string, user: AppUser | null): string | null {
  // If no user, redirect to login
  if (!user) {
    if (pathname.startsWith('/admin')) return '/admin/login';
    return '/login';
  }
  
  // If user has no role or invalid role, redirect to login
  if (!user.role) return '/login';
  
  // Convert role to lowercase for comparison
  const normalizedRole = user.role.toLowerCase();
  
  // Admin roles
  const adminRoles = ['admin', 'secretary', 'chairman', 'vice chairman', 'manager', 'treasurer', 'board of directors'];
  const memberRoles = ['member', 'driver', 'operator'];
  
  // If non-admin user tries to access admin routes
  if (pathname.startsWith('/admin') && !adminRoles.includes(normalizedRole)) {
    // Redirect member roles to user dashboard
    if (memberRoles.includes(normalizedRole)) {
      return '/dashboard';
    }
    return '/login';
  }
  
  // If member tries to access admin-specific routes
  if (adminRoles.includes(normalizedRole) && memberRoles.includes(normalizedRole)) {
    // This shouldn't happen with proper role assignment, but just in case
    return '/dashboard';
  }
  
  // If member tries to access admin dashboard
  if (pathname === '/admin/dashboard' && !adminRoles.includes(normalizedRole)) {
    return '/dashboard';
  }
  
  // If admin tries to access user dashboard, redirect to their specific admin dashboard
  if (pathname === '/dashboard' && adminRoles.includes(normalizedRole)) {
    // Return the appropriate admin dashboard based on role
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
    // Default fallback
    return '/admin/dashboard';
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
  if (pathname.startsWith('/admin') && pathname !== '/admin/login' && pathname !== '/admin/unauthorized') {
    if (!user) return '/admin/login';
    if (!validateRoleSpecificAdminRoute(pathname, user)) return '/admin/unauthorized';
  }

  if (pathname.startsWith('/dashboard') || pathname.startsWith('/profile') || 
      pathname.startsWith('/loan') || pathname.startsWith('/savings')) {
    if (!user) return '/login';
    if (!validateUserRoute(user)) return '/login';
  }

  if (pathname === '/login' || pathname === '/register' || pathname === '/create-password') {
    // Allow access to auth routes for unauthenticated users
    if (!user) {
      return null; // Allow access
    }
    // For authenticated users, don't force redirect - let them stay on the current page
    // Only redirect if they specifically navigate to the login page
    if (pathname === '/login') {
      return getDashboardRoute(user);
    }
    return null; // Allow access to register and create-password even for authenticated users
  }
  
  if (pathname === '/admin/register') {
    // Allow access to admin register page for authenticated admins only
    if (!user) {
      return '/admin/login';
    }
    if (user.role === 'admin') {
      return null; // Allow access
    }
    return '/admin/login';
  }

  // Public routes or access allowed
  return null;
}