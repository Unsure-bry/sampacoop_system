'use client';

import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { handleAdminLogout } from '@/lib/logoutUtils';

export default function AdminProfilePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [adminData, setAdminData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: '',
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/admin/login');
    } else if (user && user.role !== 'admin' && !user.role?.includes('admin')) {
      // Check if user has admin role
      const adminRoles = ['admin', 'secretary', 'chairman', 'vice chairman', 'manager', 'treasurer', 'board of directors'];
      const normalizedRole = user.role?.toLowerCase() || '';
      if (!adminRoles.includes(normalizedRole)) {
        router.push('/admin/login');
      }
    }
    
    // Set mock data or fetch real admin data
    if (user) {
      setAdminData({
        fullName: user.displayName || 'Admin User',
        email: user.email || '',
        phone: '+63 912 345 6789', // This would come from admin profile data in a real app
        role: user.role || 'Administrator',
      });
    }
  }, [user, loading, router]);

  const handleEditProfile = () => {
    toast('Edit profile functionality would open here', { icon: '✏️' });
  };

  const handleChangePassword = () => {
    toast('Change password functionality would open here', { icon: '🔑' });
  };

  const handleLogout = () => {
    try {
      // Call logout function to clear user state immediately
      logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Perform immediate admin logout with proper redirection
      handleAdminLogout();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Admin Profile</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-col md:flex-row items-center mb-6">
          <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center mb-4 md:mb-0 md:mr-6">
            <svg className="h-12 w-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-2xl font-bold text-gray-800">{adminData.fullName}</h2>
            <p className="text-gray-600">{adminData.role}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <p className="text-lg">{adminData.fullName}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <p className="text-lg">{adminData.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
            <p className="text-lg">{adminData.phone}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <p className="text-lg">
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                {adminData.role}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}