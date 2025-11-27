import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateRouteAccess } from '@/lib/validators';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Skip middleware for static files, images, favicon, and API routes
  if (
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname.startsWith('/api/') || // Exclude API routes
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }
  
  // If user is authenticated, get user data from cookies
  let user = null;
  const authenticatedCookie = request.cookies.get('authenticated');
  const userRoleCookie = request.cookies.get('userRole');
  
  if (authenticatedCookie && userRoleCookie) {
    try {
      // Extract UID and role from cookies
      const uid = decodeURIComponent(authenticatedCookie.value);
      const role = decodeURIComponent(userRoleCookie.value);
      
      user = {
        uid: uid,
        email: '', // Email not needed for route validation
        role: role
      };
    } catch (error) {
      console.error('Error parsing cookie data in middleware:', error);
      // If there's an error parsing cookie data, treat as unauthenticated
      user = null;
    }
  }

  // Special handling for root path - always go to user login
  if (pathname === '/' || pathname === '') {
    console.log('Redirecting root path to user login');
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Validate route access using our new validators
  const redirectPath = validateRouteAccess(pathname, user);
  
  if (redirectPath && redirectPath !== pathname) {
    // Only redirect if the target path is different from current path
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api).*)', // DO NOT block API routes
  ],
};