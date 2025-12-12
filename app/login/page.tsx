'use client';

import { useState, useEffect } from 'react';
import { useAuth, getDashboardPath } from '@/lib/auth';
import toast from 'react-hot-toast';
import AuthLayout from '@/components/auth/AuthLayout';
import Input from '@/components/auth/Input';
import Button from '@/components/auth/Button';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { customLogin, user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  // Don't automatically redirect authenticated users to their dashboard
  // Let them stay on the login page unless they explicitly log in
  useEffect(() => {
    // No automatic redirect on login page
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('Attempting to login with email:', email);

      // Authenticate the user
      const result = await customLogin(email, password);
      console.log('Login result:', result);
      
      // Add extra safety checks
      if (!result) {
        toast.error('Login failed: No response from server');
        return;
      }
      
      // Check if password setup is required
      if (!result.success && result.needsPasswordSetup) {
        // Redirect to password setup page
        router.push(`/setup-password?email=${encodeURIComponent(email)}`);
        return;
      }
      
      if (!result.success) {
        toast.error(result.error || 'Failed to log in');
        return;
      }
      
      if (result.success && result.user) {
        console.log('Login successful, user:', result.user);
        
        // Determine redirect path based on user role using the unified helper function
        const dashboardPath = getDashboardPath(result.user.role || '');
        router.push(dashboardPath);
      } else {
        console.log('Login failed:', result?.error);
        toast.error(result?.error || 'Failed to log in');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      toast.error(error.message || 'An unexpected error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    try {
      // Since we're not using Firebase Auth, we can't send password reset emails
      toast.error('Password reset is not implemented in this demo');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email');
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

  // If user is already authenticated, show a message but don't redirect
  // This ensures the login form is always accessible
  if (user && typeof user === 'object') {
    return (
      <AuthLayout
        title="Welcome Back"
        subtitle="You are already signed in"
      >
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
              Continue to Dashboard
            </Button>
            <Button variant="secondary" onClick={async () => {
              // Properly handle logout
              try {
                await logout();
                // Redirect to login page after logout
                window.location.href = '/login';
              } catch (error) {
                console.error('Logout error:', error);
                // Even if logout fails, redirect to login page
                window.location.href = '/login';
              }
            }}>
              Log Out
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to your account to continue"
    >
      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <Input
          label="Email Address"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <Input
          label="Password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="********"
        />
        
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleForgotPassword}
            className="text-sm text-red-600 hover:text-red-500"
          >
            Forgot password?
          </button>
        </div>

        <Button type="submit" isLoading={isLoading}>
          Sign In
        </Button>

        <p className="text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <button 
            type="button"
            onClick={() => router.push('/register')}
            className="font-medium text-red-600 hover:text-red-500"
          >
            Sign up
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}