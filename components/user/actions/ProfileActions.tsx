'use client';

import { useRouter } from 'next/navigation';

interface ProfileActionsProps {
  onProfileUpdate?: () => void;
}

export default function ProfileActions({ onProfileUpdate }: ProfileActionsProps) {
  const router = useRouter();

  const handleSecuritySettings = () => {
    // Navigate to security settings page
    router.push('/profile/security');
  };

  const handleNotificationSettings = () => {
    // Navigate to notification settings page
    router.push('/profile/notifications');
  };

  return (
    <div className="space-y-4">
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
      
    </div>
  );
}