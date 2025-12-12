'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import AuthLayout from '@/components/auth/AuthLayout';
import Input from '@/components/auth/Input';
import Button from '@/components/auth/Button';

export default function SetupPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  
  const [formData, setFormData] = useState({
    email: email,
    password: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  
  // If no email in URL, redirect to login
  useEffect(() => {
    if (!email) {
      router.push('/login');
    }
  }, [email, router]);
  
  // Form validation
  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      email: '',
      password: '',
      confirmPassword: ''
    };
    
    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
      isValid = false;
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
      isValid = false;
    }
    
    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };
  
  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/setup-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        toast.success('Password set successfully! You can now log in.');
        // Redirect to login page
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        toast.error(result.error || 'Failed to set password. Please try again.');
      }
    } catch (error: any) {
      console.error('Password setup error:', error);
      toast.error('An error occurred during password setup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!email) {
    return null; // Will redirect in useEffect
  }
  
  return (
    <AuthLayout
      title="Set Up Your Password"
      subtitle="Complete your account setup by creating a password"
    >
      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <Input
            label="Email Address"
            type="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
            error={errors.email}
            disabled
          />
          <p className="mt-1 text-sm text-gray-500">
            This is the email associated with your account.
          </p>
        </div>
        
        <div>
          <Input
            label="Password"
            type="password"
            name="password"
            required
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter your password"
            error={errors.password}
          />
          <p className="mt-1 text-xs text-gray-500">
            Password must be at least 8 characters and contain uppercase, lowercase, and number.
          </p>
        </div>
        
        <div>
          <Input
            label="Confirm Password"
            type="password"
            name="confirmPassword"
            required
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm your password"
            error={errors.confirmPassword}
          />
        </div>
        
        <Button type="submit" isLoading={isLoading}>
          Set Password and Continue
        </Button>
        
        <p className="text-center text-sm text-gray-600">
          Already have your password set?{' '}
          <button 
            type="button"
            onClick={() => router.push('/login')}
            className="font-medium text-red-600 hover:text-red-500"
          >
            Sign in
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}