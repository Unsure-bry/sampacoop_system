'use client';

import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { firestore } from '@/lib/firebase';
import Link from 'next/link';

interface OfficerData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  phoneNumber?: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export default function AdminProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [officerData, setOfficerData] = useState<OfficerData | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/admin/login');
      return;
    }

    // Check if user has valid admin/officer role
    if (user) {
      const adminRoles = ['admin', 'secretary', 'chairman', 'vice chairman', 'manager', 'treasurer', 'board of directors'];
      const normalizedRole = user.role?.toLowerCase() || '';
      if (!adminRoles.includes(normalizedRole)) {
        router.push('/admin/login');
        return;
      }
      fetchOfficerData();
    }
  }, [user, loading, router]);

  const fetchOfficerData = async () => {
    try {
      setFetching(true);
      
      // Fetch from users collection where email matches
      const result = await firestore.queryDocuments('users', [
        { field: 'email', operator: '==', value: user?.email }
      ]);

      if (result.success && result.data && result.data.length > 0) {
        const data = result.data[0] as any;
        setOfficerData({
          id: data.id,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || user?.email || '',
          role: data.role || user?.role || '',
          phoneNumber: data.phoneNumber || data.contactNumber || '',
          status: data.status || 'active',
          createdAt: data.createdAt || '',
        });
      } else {
        // Fallback to user auth data
        setOfficerData({
          id: user?.uid || '',
          firstName: user?.displayName?.split(' ')[0] || '',
          lastName: user?.displayName?.split(' ').slice(1).join(' ') || '',
          email: user?.email || '',
          role: user?.role || '',
          phoneNumber: '',
          status: 'active',
          createdAt: '',
        });
      }
    } catch (error) {
      console.error('Error fetching officer data:', error);
      toast.error('Failed to load profile data');
    } finally {
      setFetching(false);
    }
  };

  const getRoleLabel = (role: string) => {
    const normalizedRole = role?.toLowerCase() || '';
    if (normalizedRole === 'admin') return 'Administrator';
    if (normalizedRole === 'vice chairman') return 'Vice Chairman';
    if (normalizedRole === 'board of directors') return 'Board of Directors';
    return role?.charAt(0).toUpperCase() + role?.slice(1) || 'Unknown';
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-red-600"></div>
      </div>
    );
  }

  const fullName = `${officerData?.firstName || ''} ${officerData?.lastName || ''}`.trim() || 'Unknown User';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">My Profile</h1>
        <p className="text-gray-500 mt-1">View and manage your account information</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white border border-gray-200 rounded-lg">
        {/* Profile Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-semibold text-lg">
              {getInitials(officerData?.firstName || '', officerData?.lastName || '')}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{fullName}</h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 mt-1">
                {getRoleLabel(officerData?.role || '')}
              </span>
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">First Name</label>
              <p className="text-gray-900">{officerData?.firstName || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Last Name</label>
              <p className="text-gray-900">{officerData?.lastName || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Email Address</label>
              <p className="text-gray-900">{officerData?.email || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Phone Number</label>
              <p className="text-gray-900">{officerData?.phoneNumber || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                officerData?.status === 'active' 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-gray-50 text-gray-600 border border-gray-200'
              }`}>
                {officerData?.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Member Since</label>
              <p className="text-gray-900">
                {officerData?.createdAt 
                  ? new Date(officerData.createdAt).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })
                  : '-'
                }
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Quick Links */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/admin/profile/edit"
          className="flex items-center p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center mr-3">
            <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Edit Profile</p>
            <p className="text-xs text-gray-500">Update your information</p>
          </div>
        </Link>
        <Link
          href="/admin/profile/security"
          className="flex items-center p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center mr-3">
            <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Security</p>
            <p className="text-xs text-gray-500">Change password</p>
          </div>
        </Link>
        <Link
          href="/admin/profile/activity"
          className="flex items-center p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mr-3">
            <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Activity Log</p>
            <p className="text-xs text-gray-500">View your recent activity</p>
          </div>
        </Link>
        <Link
          href="/admin/dashboard"
          className="flex items-center p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mr-3">
            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Dashboard</p>
            <p className="text-xs text-gray-500">Go to your dashboard</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
