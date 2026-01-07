'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function DashboardDataInitPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const initializeDashboardData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/dashboard/initialize', {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error initializing dashboard data:', error);
      toast.error('Failed to initialize dashboard data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard Data Initialization</h1>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            This page allows administrators to initialize sample data for the dynamic dashboard system,
            including reminders and events for different user roles.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-blue-800 mb-2">What will be created:</h2>
            <ul className="list-disc pl-5 text-gray-700 space-y-1">
              <li>Sample reminders for all user roles (member, driver, operator)</li>
              <li>Upcoming events for different user roles</li>
              <li>Role-specific notifications based on user type</li>
            </ul>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={initializeDashboardData}
            disabled={loading}
            className={`px-6 py-3 rounded-lg text-white font-medium ${
              loading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Initializing...
              </span>
            ) : (
              'Initialize Dashboard Data'
            )}
          </button>
          
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}