'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { toast } from 'react-hot-toast';
import Input from '@/components/auth/Input';
import Button from '@/components/auth/Button';
import Link from 'next/link';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Redirect if user is already logged in as admin
  useEffect(() => {
    if (!authLoading && user) {
      // Check user role and redirect appropriately
      const role = user.role?.toLowerCase() || '';
      
      // Admin roles with specific dashboard paths
      if (role === 'admin') {
        router.replace('/admin/dashboard');
      } else if (role === 'secretary') {
        router.replace('/admin/secretary/home');
      } else if (role === 'chairman') {
        router.replace('/admin/chairman/home');
      } else if (role === 'vice chairman') {
        router.replace('/admin/vice-chairman/home');
      } else if (role === 'manager') {
        router.replace('/admin/manager/home');
      } else if (role === 'treasurer') {
        router.replace('/admin/treasurer/home');
      } else if (role === 'board of directors') {
        router.replace('/admin/bod/home');
      }
      // For non-admin roles, we allow them to stay on the admin login page
      // They will get an error when trying to log in
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Import the signIn function locally to avoid auto-redirection
      const { success, user: loggedInUser, error: loginError } = await customLogin(email, password);
      
      if (success && loggedInUser) {
        // Check if user is admin
        const role = loggedInUser.role?.toLowerCase() || '';
        
        // Admin roles with specific dashboard paths
        if (role === 'admin') {
          toast.success('Welcome back, Admin!');
          router.replace('/admin/dashboard');
        } else if (role === 'secretary') {
          toast.success('Welcome back, Secretary!');
          router.replace('/admin/secretary/home');
        } else if (role === 'chairman') {
          toast.success('Welcome back, Chairman!');
          router.replace('/admin/chairman/home');
        } else if (role === 'vice chairman') {
          toast.success('Welcome back, Vice Chairman!');
          router.replace('/admin/vice-chairman/home');
        } else if (role === 'manager') {
          toast.success('Welcome back, Manager!');
          router.replace('/admin/manager/home');
        } else if (role === 'treasurer') {
          toast.success('Welcome back, Treasurer!');
          router.replace('/admin/treasurer/home');
        } else if (role === 'board of directors') {
          toast.success('Welcome back, Board of Directors!');
          router.replace('/admin/bod/home');
        } else if (['member', 'user', 'driver', 'operator'].includes(role)) {
          const errorMsg = 'Access denied. Admin privileges required.';
          setError(errorMsg);
          toast.error(errorMsg);
        } else {
          const errorMsg = 'No valid role assigned to this account.';
          setError(errorMsg);
          toast.error(errorMsg);
        }
      } else {
        const errorMessage = loginError || 'Invalid credentials or not authorized as admin';
        setError(errorMessage);
        toast.error(errorMessage);
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

  // Custom login function that doesn't cause auto-redirection
  const customLogin = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        
        // Set cookies manually
        document.cookie = `authenticated=${encodeURIComponent(result.uid)}; path=/; max-age=${60 * 60 * 24 * 7}`;
        document.cookie = `userRole=${encodeURIComponent(result.role)}; path=/; max-age=${60 * 60 * 24 * 7}`;
        return { success: true, user: result.user };
      } else {
        return { success: false, error: result.error || 'Login failed' };
      }
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: error.message || 'An unexpected error occurred during login' };
    }
  };

  // Show loading screen while checking auth state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
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
              <Input
                label="Password"
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
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