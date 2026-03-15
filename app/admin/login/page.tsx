'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, getDashboardPath } from '@/lib/auth';
import { toast } from 'react-hot-toast';
import { handleAdminLogout } from '@/lib/logoutUtils';
import Input from '@/components/auth/Input';
import Button from '@/components/auth/Button';
import Link from 'next/link';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user, logout, customLogin } = useAuth();

  // Don't automatically redirect authenticated users
  // Just show them a message that they're already logged in
  useEffect(() => {
    // No automatic redirect on admin login page
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Use the standardized customLogin function from the auth library
      const result = await customLogin(email, password);
      
      // Check if password setup is required
      if (!result.success && result.needsPasswordSetup) {
        // Redirect to password setup page
        router.push(`/setup-password?email=${encodeURIComponent(email)}`);
        return;
      }
      
      if (result.success && result.user) {
        // Check if user is admin
        const role = result.user.role?.toLowerCase() || '';
        
        // Admin roles with specific dashboard paths
        const adminRoles = ['admin', 'secretary', 'chairman', 'vice chairman', 'manager', 'treasurer', 'board of directors'];
        
        if (adminRoles.includes(role)) {
          // Role-based redirection is now handled automatically in the auth context
          toast.success(`Welcome back, ${role.charAt(0).toUpperCase() + role.slice(1)}!`);
        } else if (['member', 'user', 'driver', 'operator'].includes(role)) {
          const errorMsg = 'Access denied. Admin privileges required.';
          setError(errorMsg);
          toast.error(errorMsg);
        } else {
          const errorMsg = 'No valid role assigned to this account. Please contact an administrator.';
          setError(errorMsg);
          toast.error(errorMsg);
        }
      } else {
        const errorMessage = result.error || 'Invalid credentials or not authorized as admin';
        // Provide more specific error messages for role-related issues
        if (errorMessage?.includes('role not assigned')) {
          setError('Your account does not have a role assigned. Please contact an administrator.');
          toast.error('Your account does not have a role assigned. Please contact an administrator.');
        } else if (errorMessage?.includes('Invalid user role')) {
          setError('Your account has an invalid role. Please contact an administrator.');
          toast.error('Your account has an invalid role. Please contact an administrator.');
        } else {
          setError(errorMessage);
          toast.error(errorMessage);
        }
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Invalid credentials or not authorized as admin';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  // If user is already authenticated, show a message but don't redirect
  // This ensures the login form is always accessible
  if (user && typeof user === 'object') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Admin Login
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              You are already signed in
            </p>
          </div>
          <div className="mt-8 text-center">
            <p className="text-gray-600 mb-4">
              You are currently logged in. If you want to log in with a different account, 
              please log out first.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => {
                // Get the dashboard route based on user role using the unified helper function
                const dashboardPath = getDashboardPath(user.role || '');
                router.push(dashboardPath);
              }}>
                Continue to Admin Dashboard
              </Button>
              <Button variant="secondary" onClick={() => {
                // Properly handle logout with immediate redirect
                try {
                  logout();
                } catch (error) {
                  console.error('Logout error:', error);
                } finally {
                  // Perform immediate admin logout with proper redirection
                  handleAdminLogout();
                }
              }}>

              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
             Admin Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to access the admin dashboard
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <Input
                label="Email address"
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <div className="relative">
                <Input
                  label="Password"
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <Button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </div>
          
          <div className="text-center mt-4">
            Don't have an account?
            <Link href="/admin/register" className="text-sm text-red-600 hover:text-red-500">
              Sign Up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}