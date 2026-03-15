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
  const [showPassword, setShowPassword] = useState(false);
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
        
        // Role-based redirection is now handled automatically in the auth context
        toast.success('Welcome back!');
      } else {
        console.log('Login failed:', result?.error);
        // Provide more specific error messages for role-related issues
        if (result?.error?.includes('role not assigned')) {
          toast.error('Your account does not have a role assigned. Please contact an administrator.');
        } else if (result?.error?.includes('Invalid user role')) {
          toast.error('Your account has an invalid role. Please contact an administrator.');
        } else {
          toast.error(result?.error || 'Failed to log in');
        }
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
    <div className="min-h-screen flex flex-col bg-white">
      {/* Red top border */}
      <div className="h-3" style={{ backgroundColor: '#b40403' }}></div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-3 sm:p-4 lg:p-8">
        <div className="w-full max-w-5xl">
          <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-16">
            {/* Image Section */}
            <div className="lg:w-1/2 flex items-center justify-center">
              <img
                src="/sampa-logo.png"
                alt="SAMPA Transport Service Corporation"
                className="w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80 object-contain"
              />
            </div>

            {/* Form Section */}
            <div className="lg:w-1/2 w-full max-w-md">
              <div className="bg-white rounded-lg shadow-lg p-5 sm:p-8 lg:p-10">
                <div className="text-center mb-6 sm:mb-8">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Welcome Back</h1>
                  <p className="mt-2 text-gray-600 text-sm sm:text-base">Sign in to your account to continue</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <Input
                    label="Email Address"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                  <div className="relative">
                    <Input
                      label="Password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-12 right-0 pr-3 flex items-center"
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
                  <div className="flex items-center justify-center">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleForgotPassword}
                      className="text-sm w-full bg-gray-200 hover:bg-gray-300 text-gray-800 border-0"
                    >
                      Forgot password?
                    </Button>
                  </div>
                  <Button
                    type="submit"
                    disabled={isLoading || authLoading}
                    className="w-full bg-red-600 hover:bg-red-700"
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
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-white text-center py-3 px-4" style={{ backgroundColor: '#10035e' }}>
        <p className="text-sm">
          Copyright © 2008-2025 SAMPA: Jeepney Cooperatives. | v1.0.0-o | All Rights Reserved.
        </p>
      </div>
    </div>
  );
}