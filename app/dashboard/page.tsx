'use client';

import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/shared/Card';
import { ActiveSavings, AddSavingsTransactionModal } from '@/components';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import DynamicDashboard, { type Reminder, type Event } from '@/components/user/DynamicDashboard';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [totalSavings, setTotalSavings] = useState(0);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const router = useRouter();

  // The middleware and route validation should handle navigation
  // But we still check on the client side for better UX
  useEffect(() => {
    if (!loading && user) {
      // Validate that this user should be on this dashboard
      const userRole = user.role?.toLowerCase() || '';
      if (userRole !== 'member') {
        // Redirect to correct dashboard
        if (typeof window !== 'undefined') {
          window.location.replace('/login');
        }
      }
      
      // Fetch dynamic data after user validation
      fetchDynamicData();
    }
  }, [user, loading]);

  const fetchDynamicData = async () => {
    try {
      setLoadingData(true);

      // Fetch reminders for this user
      const remindersResult = await firestore.getCollection('reminders');
      if (remindersResult.success && remindersResult.data) {
        const userReminders = remindersResult.data
          .filter((doc: any) => {
            // Filter reminders by user role or for all users
            return !doc.userRole || 
                   doc.userRole === 'all' || 
                   doc.userRole.toLowerCase() === user?.role?.toLowerCase();
          })
          .filter((doc: any) => {
            // Filter by user status if specified
            return !doc.status || 
                   doc.status === 'active' || 
                   doc.status === 'published';
          })
          .map((doc: any) => ({
            id: doc.id,
            title: doc.title,
            description: doc.description,
            status: doc.status || 'active',
            createdAt: doc.createdAt,
            dueDate: doc.dueDate,
            priority: doc.priority || 'medium'
          }))
          .sort((a: Reminder, b: Reminder) => {
            // Sort by priority (high first) then by due date
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            if (priorityOrder[(b.priority as 'high' | 'medium' | 'low') || 'medium'] !== 
                priorityOrder[(a.priority as 'high' | 'medium' | 'low') || 'medium']) {
              return priorityOrder[(b.priority as 'high' | 'medium' | 'low') || 'medium'] - 
                     priorityOrder[(a.priority as 'high' | 'medium' | 'low') || 'medium'];
            }
            return new Date(a.dueDate || a.createdAt).getTime() - 
                   new Date(b.dueDate || b.createdAt).getTime();
          });

        setReminders(userReminders);
      }

      // Fetch events for this user
      const eventsResult = await firestore.getCollection('events');
      if (eventsResult.success && eventsResult.data) {
        const userEvents = eventsResult.data
          .filter((doc: any) => {
            // Filter events by user role or for all users
            return !doc.userRole || 
                   doc.userRole === 'all' || 
                   doc.userRole.toLowerCase() === user?.role?.toLowerCase();
          })
          .filter((doc: any) => {
            // Filter by user status if specified
            return !doc.status || 
                   doc.status === 'active' || 
                   doc.status === 'published';
          })
          .filter((doc: any) => {
            // Filter by event date validity - only show upcoming events
            const eventDate = new Date(doc.date);
            const now = new Date();
            return eventDate >= now;
          })
          .map((doc: any) => ({
            id: doc.id,
            title: doc.title,
            description: doc.description,
            date: doc.date,
            location: doc.location,
            status: doc.status || 'active',
            createdAt: doc.createdAt,
            applicableTo: doc.applicableTo || []
          }))
          .sort((a: Event, b: Event) => {
            // Sort by date (upcoming first)
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          });

        setEvents(userEvents);
      }
    } catch (error) {
      console.error('Error fetching dynamic dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoadingData(false);
    }
  };

  const handleAddSavings = async (transactionData: { type: 'deposit' | 'withdrawal', amount: number, date: string, remarks: string }) => {
    try {
      if (!user) {
        toast.error('User not authenticated');
        return false;
      }

      // Calculate new balance
      const amount = parseFloat(transactionData.amount.toString());
      const newBalance = transactionData.type === 'deposit' 
        ? totalSavings + amount 
        : totalSavings - amount;
      
      // Validate withdrawal doesn't exceed balance
      if (transactionData.type === 'withdrawal' && amount > totalSavings) {
        toast.error('Withdrawal amount cannot exceed current balance');
        return false;
      }
      
      // Create transaction object
      const newTransaction = {
        memberId: user.uid,
        memberName: user.email || 'Unknown Member',
        date: transactionData.date,
        type: transactionData.type,
        amount: amount,
        balance: newBalance,
        remarks: transactionData.remarks,
        createdAt: new Date().toISOString()
      };
      
      // Generate a unique ID for the transaction
      const transactionId = `${transactionData.type}-${Date.now()}`;
      
      // Save to Firestore under /members/{memberId}/savings collection
      const result = await firestore.setDocument(`members/${user.uid}/savings`, transactionId, newTransaction);
      
      if (result.success) {
        toast.success(`Savings ${transactionData.type} recorded successfully!`);
        // Refresh total savings
        setTotalSavings(newBalance);
        setShowAddModal(false);
        return true;
      } else {
        toast.error('Failed to record savings transaction');
        return false;
      }
    } catch (error) {
      console.error('Error adding savings transaction:', error);
      toast.error('Failed to record savings transaction');
      return false;
    }
  };

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  // If user is not authenticated, the middleware will redirect them to login
  // We don't need to handle that here

  return (
    <DynamicDashboard>
      <div className="max-w-7xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Welcome, {user?.email}</h1>
          <p className="text-gray-600 mt-2">Member Dashboard</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
          {/* Savings Card */}
          <ActiveSavings compact={true} />

          {/* Reminders Card */}
          <Card title="Reminders" className="h-full">
            <div className="space-y-4">
              {reminders.length > 0 ? (
                reminders.map((reminder) => (
                  <div key={reminder.id} className={`border-l-4 pl-4 py-1 hover:bg-gray-50 transition-colors ${
                    reminder.priority === 'high' ? 'border-red-500' : 
                    reminder.priority === 'medium' ? 'border-yellow-500' : 'border-green-500'
                  }`}>
                    <h3 className="font-semibold text-gray-800">{reminder.title}</h3>
                    <p className="text-gray-600 text-sm mt-1">{reminder.description}</p>
                    {reminder.dueDate && (
                      <p className="text-xs text-gray-500 mt-1">
                        Due: {new Date(reminder.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No reminders at this time
                </div>
              )}
            </div>
          </Card>

          {/* Events Card */}
          <Card title="Special Events" className="h-full">
            <div className="space-y-4">
              {events.length > 0 ? (
                events.map((event) => (
                  <div key={event.id} className="border-l-4 border-blue-500 pl-4 py-1 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-gray-800">{event.title}</h3>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        {new Date(event.date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mt-1">{event.description}</p>
                    {event.location && (
                      <p className="text-xs text-gray-500 mt-1">
                        {event.location}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No upcoming events
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Recent Savings Transactions Section */}
        <div className="mt-8">
          <ActiveSavings compact={false} />
        </div>

        {/* Quick Actions Section */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border border-gray-200 flex flex-col items-center"
            >
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-800">Add Savings</h3>
              <p className="text-gray-600 text-sm mt-1">Deposit or withdraw</p>
            </button>

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
              <p className="text-gray-600 text-sm mt-1">View all transactions</p>
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
          </div>
        </div>

        {/* Add Savings Transaction Modal */}
        <AddSavingsTransactionModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAddSavings={handleAddSavings}
          currentBalance={totalSavings}
        />
      </div>
    </DynamicDashboard>
  );
}