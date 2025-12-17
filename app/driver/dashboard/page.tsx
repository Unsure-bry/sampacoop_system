'use client';

import { useAuth } from '@/lib/auth';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/shared/Card';

// Mock data for reminders
const reminders = [
  { id: 1, title: 'Loan Payment Due', description: 'Your monthly loan payment is due on November 5th.' },
  { id: 2, title: 'Savings Target', description: 'You are 75% towards your savings goal this month.' },
  { id: 3, title: 'Document Update', description: 'Please update your identification documents.' },
];

// Mock data for events
const events = [
  { id: 1, title: 'Annual General Meeting', date: 'Dec 15, 2025', description: 'Annual meeting for all cooperative members.' },
  { id: 2, title: 'Financial Literacy Workshop', date: 'Nov 20, 2025', description: 'Learn about investment strategies and financial planning.' },
  { id: 3, title: 'Holiday Closure', date: 'Dec 25, 2025', description: 'Office will be closed for Christmas Day.' },
];

export default function DriverDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Remove the useEffect that was causing redirects
  // The middleware and route validation should handle navigation

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  // If user is not authenticated, the middleware will redirect them to login
  // We don't need to handle that here

  return (
    <div className="max-w-7xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Welcome, Driver {user?.email}</h1>
        <p className="text-gray-600 mt-2">Your personalized dashboard for managing your cooperative account</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        {/* Savings Card */}
        <Card title="My Savings" className="h-full">
          <div className="flex flex-col items-center justify-center h-full py-8">
            <div className="text-4xl font-bold text-gray-800 mb-2">₱0.00</div>
            <p className="text-gray-600 mb-4">Current Savings Balance</p>
            <button 
              onClick={() => router.push('/savings')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              View Savings
            </button>
          </div>
        </Card>

        {/* Reminders Card */}
        <Card title="Reminders" className="h-full">
          <div className="space-y-4">
            {reminders.map((reminder) => (
              <div key={reminder.id} className="border-l-4 border-red-500 pl-4 py-1 hover:bg-gray-50 transition-colors">
                <h3 className="font-semibold text-gray-800">{reminder.title}</h3>
                <p className="text-gray-600 text-sm mt-1">{reminder.description}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Events Card */}
        <Card title="Special Events" className="h-full">
          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="border-l-4 border-blue-500 pl-4 py-1 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-gray-800">{event.title}</h3>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{event.date}</span>
                </div>
                <p className="text-gray-600 text-sm mt-1">{event.description}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick Actions Section */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button 
            onClick={() => router.push('/savings')}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border border-gray-200 flex flex-col items-center"
          >
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-800">My Savings</h3>
            <p className="text-gray-600 text-sm mt-1">Deposit or withdraw</p>
          </button>

          <button 
            onClick={() => router.push('/loan')}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border border-gray-200 flex flex-col items-center"
          >
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-800">Loans</h3>
            <p className="text-gray-600 text-sm mt-1">Apply for a loan</p>
          </button>

          <button 
            onClick={() => router.push('/profile')}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border border-gray-200 flex flex-col items-center"
          >
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-800">Profile</h3>
            <p className="text-gray-600 text-sm mt-1">View or edit profile</p>
          </button>

          <button 
            onClick={() => router.push('/about')}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border border-gray-200 flex flex-col items-center"
          >
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-3">
              <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-800">About</h3>
            <p className="text-gray-600 text-sm mt-1">Learn more</p>
          </button>
        </div>
      </div>
    </div>
  );
}