'use client';

import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/shared/Card';
import { ArrowLeft } from 'lucide-react';

export default function NotificationSettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    loanUpdates: true,
    savingsUpdates: true,
    paymentReminders: true,
  });

  const handleToggle = (field: string) => {
    setSettings(prev => ({
      ...prev,
      [field]: !prev[field as keyof typeof prev]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-0">
      {/* Back Button */}
      <button
        onClick={() => router.push('/profile')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
      >
        <ArrowLeft className="h-5 w-5" />
        <span className="text-sm sm:text-base">Back to My Profile</span>
      </button>

      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Notification Settings</h1>
      
      <Card title="Communication Preferences">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border border-gray-200 rounded-lg gap-3">
            <div>
              <h3 className="font-medium text-gray-800">Email Notifications</h3>
              <p className="text-sm text-gray-600">Receive notifications via email</p>
            </div>
            <button 
              onClick={() => handleToggle('emailNotifications')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                settings.emailNotifications ? 'bg-red-600' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                settings.emailNotifications ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border border-gray-200 rounded-lg gap-3">
            <div>
              <h3 className="font-medium text-gray-800">SMS Notifications</h3>
              <p className="text-sm text-gray-600">Receive notifications via SMS</p>
            </div>
            <button 
              onClick={() => handleToggle('smsNotifications')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                settings.smsNotifications ? 'bg-red-600' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                settings.smsNotifications ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border border-gray-200 rounded-lg gap-3">
            <div>
              <h3 className="font-medium text-gray-800">Push Notifications</h3>
              <p className="text-sm text-gray-600">Receive notifications in the app</p>
            </div>
            <button 
              onClick={() => handleToggle('pushNotifications')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                settings.pushNotifications ? 'bg-red-600' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                settings.pushNotifications ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>
      </Card>
      
      <Card title="Notification Types" className="mt-4 sm:mt-6">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border border-gray-200 rounded-lg gap-3">
            <div>
              <h3 className="font-medium text-gray-800">Loan Updates</h3>
              <p className="text-sm text-gray-600">Updates about your loan applications and payments</p>
            </div>
            <button 
              onClick={() => handleToggle('loanUpdates')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                settings.loanUpdates ? 'bg-red-600' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                settings.loanUpdates ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border border-gray-200 rounded-lg gap-3">
            <div>
              <h3 className="font-medium text-gray-800">Savings Updates</h3>
              <p className="text-sm text-gray-600">Updates about your savings transactions</p>
            </div>
            <button 
              onClick={() => handleToggle('savingsUpdates')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                settings.savingsUpdates ? 'bg-red-600' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                settings.savingsUpdates ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border border-gray-200 rounded-lg gap-3">
            <div>
              <h3 className="font-medium text-gray-800">Payment Reminders</h3>
              <p className="text-sm text-gray-600">Reminders for upcoming payments</p>
            </div>
            <button 
              onClick={() => handleToggle('paymentReminders')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                settings.paymentReminders ? 'bg-red-600' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                settings.paymentReminders ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}