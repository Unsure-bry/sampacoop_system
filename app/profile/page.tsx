'use client';

import { useAuth } from '@/lib/auth';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/shared/Card';
import { ProfileActions } from '@/components';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Remove the redirect effect - middleware handles authentication
  // useEffect(() => {
  //   if (!loading && !user) {
  //     router.push('/login');
  //   }
  // }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  // Mock user data
  const userData = {
    name: user?.displayName || 'Juan Dela Cruz S.',
    email: user?.email || 'Aboveba@gmail.com',
    memberSince: 'Jan 01, 2025',
    memberId: 'D-2025-0001',
    phone: '+63 912 345 6789',
    address: '123 Main Street, Santa Maria, Bulacan',
  };

  const accountSummary = {
    totalSavings: '₱00.00',
    totalLoans: '₱00.00',
    pendingPayments: '₱00.00',
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">My Profile</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-1">
          <Card title="Profile Picture" className="text-center">
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <UserIcon className="h-12 w-12 text-red-600" />
              </div>
              <button className="text-red-600 hover:text-red-800 text-sm font-medium">
                Change Photo
              </button>
            </div>
          </Card>
        </div>
        
        <div className="lg:col-span-2">
          <Card title="Personal Information">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Full Name</label>
                  <p className="font-medium">{userData.name}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Email Address</label>
                  <p className="font-medium">{userData.email}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Phone Number</label>
                  <p className="font-medium">{userData.phone}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Member Since</label>
                  <p className="font-medium">{userData.memberSince}</p>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500">Address</label>
                <p className="font-medium">{userData.address}</p>
              </div>
              <div className="flex justify-end pt-4">
                <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                  Edit Profile
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card title="Total Savings" className="text-center">
          <p className="text-3xl font-bold text-green-600 mt-2">{accountSummary.totalSavings}</p>
        </Card>
        <Card title="Active Loans" className="text-center">
          <p className="text-3xl font-bold text-red-600 mt-2">{accountSummary.totalLoans}</p>
        </Card>
        <Card title="Pending Payments" className="text-center">
          <p className="text-3xl font-bold text-yellow-600 mt-2">{accountSummary.pendingPayments}</p>
        </Card>
      </div>
      
      {/* Account Settings using the new ProfileActions component */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Account Settings</h2>
        <ProfileActions />
      </div>
    </div>
  );
}

// Simple SVG Icon Component
const UserIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);