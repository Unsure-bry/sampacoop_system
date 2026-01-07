'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';

interface Reminder {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  dueDate?: string;
  userId?: string;
  userRole?: string;
  priority?: 'low' | 'medium' | 'high';
}

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location?: string;
  status: string;
  createdAt: string;
  userRole?: string;
  applicableTo?: string[];
}

interface DynamicDashboardProps {
  children: React.ReactNode;
}

export default function DynamicDashboard({ children }: DynamicDashboardProps) {
  const { user, loading } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (user && !loading) {
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
            if (priorityOrder[b.priority as 'high' | 'medium' | 'low'] !== 
                priorityOrder[a.priority as 'high' | 'medium' | 'low']) {
              return priorityOrder[b.priority as 'high' | 'medium' | 'low'] - 
                     priorityOrder[a.priority as 'high' | 'medium' | 'low'];
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

  // Provide the dynamic data to child components via context or props
  // For now, we'll just render the children and the data will be available
  return (
    <div>
      {children}
    </div>
  );
}

// Export helper functions to access the data
export { type Reminder, type Event };