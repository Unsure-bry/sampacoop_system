'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { toast } from 'react-hot-toast';

interface ProfileActionsProps {
  onProfileUpdate?: () => void;
}

export default function ProfileActions({ onProfileUpdate }: ProfileActionsProps) {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await logout();
      toast.success('Signed out successfully.');
    } catch (error) {
      toast.error('Failed to sign out. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    toast('Profile editing feature coming soon!', {
      icon: 'ℹ️',
    });
  };

  const handleSecuritySettings = () => {
    toast('Security settings feature coming soon!', {
      icon: 'ℹ️',
    });
  };

  const handleNotificationSettings = () => {
    toast('Notification settings feature coming soon!', {
      icon: 'ℹ️',
    });
  };

  const handlePrivacySettings = () => {
    toast('Privacy settings feature coming soon!', {
      icon: 'ℹ️',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
        <div>
          <h3 className="font-medium text-gray-800">Edit Profile</h3>
          <p className="text-sm text-gray-600">Update your personal information</p>
        </div>
        <button 
          onClick={handleEditProfile}
          className="text-red-600 hover:text-red-800 font-medium"
        >
          Edit
        </button>
      </div>
      
      <div className="flex justify-between items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
        <div>
          <h3 className="font-medium text-gray-800">Security Settings</h3>
          <p className="text-sm text-gray-600">Update your password and security preferences</p>
        </div>
        <button 
          onClick={handleSecuritySettings}
          className="text-red-600 hover:text-red-800 font-medium"
        >
          Manage
        </button>
      </div>
      
      <div className="flex justify-between items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
        <div>
          <h3 className="font-medium text-gray-800">Notification Preferences</h3>
          <p className="text-sm text-gray-600">Choose how you want to be notified</p>
        </div>
        <button 
          onClick={handleNotificationSettings}
          className="text-red-600 hover:text-red-800 font-medium"
        >
          Manage
        </button>
      </div>
      
      <div className="flex justify-between items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
        <div>
          <h3 className="font-medium text-gray-800">Privacy Settings</h3>
          <p className="text-sm text-gray-600">Control your privacy and data sharing</p>
        </div>
        <button 
          onClick={handlePrivacySettings}
          className="text-red-600 hover:text-red-800 font-medium"
        >
          Manage
        </button>
      </div>
      
      <div className="pt-4">
        <button
          onClick={handleSignOut}
          disabled={loading}
          className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center disabled:opacity-50"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing Out...
            </>
          ) : (
            <>
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </>
          )}
        </button>
      </div>
    </div>
  );
}