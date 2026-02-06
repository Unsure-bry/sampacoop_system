'use client';

import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/shared/Card';

export default function PrivacySettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState({
    profileVisibility: 'public',
    dataSharing: false,
    marketingEmails: true,
    locationTracking: false,
  });

  const handleRadioChange = (field: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

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
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Privacy Settings</h1>
      
      <Card title="Profile Privacy">
        <div className="space-y-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-3">Profile Visibility</h3>
            <div className="space-y-2">
              {[
                { value: 'public', label: 'Public - Visible to everyone' },
                { value: 'members', label: 'Members Only - Visible to other cooperative members' },
                { value: 'private', label: 'Private - Only visible to you' }
              ].map((option) => (
                <div key={option.value} className="flex items-center">
                  <input
                    type="radio"
                    id={`visibility-${option.value}`}
                    name="profileVisibility"
                    value={option.value}
                    checked={settings.profileVisibility === option.value}
                    onChange={(e) => handleRadioChange('profileVisibility', e.target.value)}
                    className="h-4 w-4 text-red-600 focus:ring-red-500"
                  />
                  <label htmlFor={`visibility-${option.value}`} className="ml-2 text-gray-700">
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
      
      <Card title="Data Usage" className="mt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-800">Share Data with Third Parties</h3>
              <p className="text-sm text-gray-600">Allow sharing of anonymized data for research purposes</p>
            </div>
            <button 
              onClick={() => handleToggle('dataSharing')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                settings.dataSharing ? 'bg-red-600' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                settings.dataSharing ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-800">Marketing Emails</h3>
              <p className="text-sm text-gray-600">Receive promotional emails and updates</p>
            </div>
            <button 
              onClick={() => handleToggle('marketingEmails')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                settings.marketingEmails ? 'bg-red-600' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                settings.marketingEmails ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-800">Location Tracking</h3>
              <p className="text-sm text-gray-600">Allow location tracking for service improvement</p>
            </div>
            <button 
              onClick={() => handleToggle('locationTracking')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                settings.locationTracking ? 'bg-red-600' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                settings.locationTracking ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>
      </Card>
      

    </div>
  );
}