'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { firestore } from '@/lib/firebase';
import toast from 'react-hot-toast';
import AuthLayout from '@/components/auth/AuthLayout';
import Input from '@/components/auth/Input';
import Button from '@/components/auth/Button';

// Password hashing utilities
const enc = new TextEncoder();
const toBase64 = (buf: ArrayBuffer) => {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
};

async function deriveKey(password: string, salt: Uint8Array) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  return new Uint8Array(derivedBits);
}

// Predefined roles for the cooperative
const ROLES = [
  'Secretary',
  'Chairman',
  'Vice Chairman',
  'Manager',
  'Treasurer',
  'Board of Directors'
];

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    contactNumber: '',
    email: '',
    role: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({
    fullName: '',
    contactNumber: '',
    email: '',
    role: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  // Form validation
  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      fullName: '',
      contactNumber: '',
      email: '',
      role: '',
      password: '',
      confirmPassword: ''
    };

    // Full name validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
      isValid = false;
    }

    // Contact number validation (must be numeric)
    if (!formData.contactNumber.trim()) {
      newErrors.contactNumber = 'Contact number is required';
      isValid = false;
    } else if (!/^\d+$/.test(formData.contactNumber)) {
      newErrors.contactNumber = 'Contact number must contain only digits';
      isValid = false;
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    // Role validation
    if (!formData.role) {
      newErrors.role = 'Role is required';
      isValid = false;
    }

    // Password validation (min 8 chars, uppercase, lowercase, number)
    if (!formData.password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
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
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
      // Check if email already exists
      const queryResult = await firestore.queryDocuments('users', [
        { field: 'email', operator: '==', value: formData.email }
      ]);

      if (queryResult.success && queryResult.data && queryResult.data.length > 0) {
        setErrors(prev => ({ ...prev, email: 'An account with this email already exists' }));
        setIsLoading(false);
        return;
      }

      // Hash the password
      const saltArr = crypto.getRandomValues(new Uint8Array(16));
      const passwordDerived = await deriveKey(formData.password, saltArr);
      const saltB64 = toBase64(saltArr.buffer);
      const hashB64 = toBase64(passwordDerived.buffer);

      // Create new user document
      const userData = {
        fullName: formData.fullName,
        contactNumber: formData.contactNumber,
        email: formData.email,
        role: formData.role, // Store role as entered by user
        passwordHash: hashB64,
        salt: saltB64,
        isPasswordSet: true,
        createdAt: new Date().toISOString()
      };

      const result = await firestore.setDocument(
        'users',
        encodeURIComponent(formData.email.toLowerCase()),
        userData
      );

      if (result.success) {
        toast.success('Account created successfully!');
        router.push('/login');
      } else {
        toast.error('Failed to create account. Please try again.');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error('An error occurred during registration. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Register for a new account"
    >
      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <Input
            label="Full Name"
            type="text"
            name="fullName"
            required
            value={formData.fullName}
            onChange={handleChange}
            placeholder="Enter your full name"
            error={errors.fullName}
          />
        </div>

        <div>
          <Input
            label="Contact Number"
            type="text"
            name="contactNumber"
            required
            value={formData.contactNumber}
            onChange={handleChange}
            placeholder="Enter your contact number"
            error={errors.contactNumber}
          />
        </div>

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
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Role <span className="text-red-500">*</span>
          </label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
              errors.role ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select a role</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          {errors.role && (
            <p className="mt-1 text-sm text-red-600">{errors.role}</p>
          )}
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
          Register Account
        </Button>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-red-600 hover:text-red-500">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}