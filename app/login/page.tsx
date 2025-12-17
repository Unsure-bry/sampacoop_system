'use client';

import { useState, useEffect } from 'react';
import { useAuth, getDashboardPath } from '@/lib/auth';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { handleUserLogout } from '@/lib/logoutUtils';
import AuthLayout from '@/components/auth/AuthLayout';
import Input from '@/components/auth/Input';
import Button from '@/components/auth/Button';

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
      // TODO: Implement actual password reset functionality
      toast.success('Password reset instructions sent to your email');
    } catch (error) {
      toast.error('Failed to send password reset instructions');
    }
  };

  // If user is authenticated, show option to continue to dashboard or logout
  if (user && !authLoading) {
    return (
      <AuthLayout
        title="Already Logged In"
        subtitle="You are currently signed in"
      >
        <div className="mt-8">
          <div className="rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Welcome back, {user.email}
                </h3>
                <p className="mt-2 text-sm text-green-700">
                  You are already logged in. You can continue to your dashboard or log out to switch accounts.
                </p>
              </div>
            </div>
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
                Continue to Dashboard
              </Button>
              <Button variant="secondary" onClick={() => {
                // Properly handle logout with immediate redirect
                try {
                  logout();
                } catch (error) {
                  console.error('Logout error:', error);
                } finally {
                  // Perform immediate user logout with proper redirection
                  handleUserLogout();
                }
              }}>
                Log Out
              </Button>
            </div>
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
          placeholder="••••••••"
        />
        <div className="flex items-center justify-between">
          <Button 
            type="button" 
            variant="secondary"
            onClick={handleForgotPassword}
            className="text-sm"
          >
            Forgot password?
          </Button>
        </div>
        <Button 
          type="submit" 
          disabled={isLoading || authLoading}
          className="w-full"
        >
          {isLoading || authLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing In...
            </>
          ) : 'Sign In'}
        </Button>
      </form>
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Don't have an account?{' '}
          <Button 
            variant="secondary"
            onClick={() => router.push('/register')}
            className="font-medium"
          >
            Register here
          </Button>
        </p>
      </div>
    </AuthLayout>
  );
}