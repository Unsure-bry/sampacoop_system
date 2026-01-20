'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { firestore } from '@/lib/firebase';

interface Reminder {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  dueDate?: string;
  userRole: string;
  priority: string;
}

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  status: string;
  createdAt: string;
  userRole: string;
}

export default function DashboardDataInitPage() {
  const [loading, setLoading] = useState(false);
  const [remindersLoading, setRemindersLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
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
        // Refresh the data after initialization
        fetchRemindersAndEvents();
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

  const fetchRemindersAndEvents = async () => {
    try {
      // Fetch reminders
      setRemindersLoading(true);
      const remindersResult = await firestore.getCollection('reminders');
      if (remindersResult.success && remindersResult.data) {
        setReminders(remindersResult.data.map((doc: any) => ({
          id: doc.id,
          title: doc.title,
          description: doc.description,
          status: doc.status,
          createdAt: doc.createdAt,
          dueDate: doc.dueDate,
          userRole: doc.userRole,
          priority: doc.priority
        })));
      } else {
        setReminders([]);
      }
      setRemindersLoading(false);

      // Fetch events
      setEventsLoading(true);
      const eventsResult = await firestore.getCollection('events');
      if (eventsResult.success && eventsResult.data) {
        setEvents(eventsResult.data.map((doc: any) => ({
          id: doc.id,
          title: doc.title,
          description: doc.description,
          date: doc.date,
          location: doc.location,
          status: doc.status,
          createdAt: doc.createdAt,
          userRole: doc.userRole
        })));
      } else {
        setEvents([]);
      }
      setEventsLoading(false);
    } catch (error) {
      console.error('Error fetching reminders and events:', error);
      setReminders([]);
      setEvents([]);
      setRemindersLoading(false);
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    fetchRemindersAndEvents();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const [formData, setFormData] = useState({
    reminderTitle: '',
    reminderDescription: '',
    reminderDate: '',
    reminderRole: 'all',
    reminderPriority: 'medium',
    eventTitle: '',
    eventDescription: '',
    eventDate: '',
    eventLocation: '',
    eventRole: 'all',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addReminder = async () => {
    if (!formData.reminderTitle.trim()) {
      toast.error('Reminder title is required');
      return;
    }

    const newReminder = {
      title: formData.reminderTitle,
      description: formData.reminderDescription,
      status: 'active',
      createdAt: new Date().toISOString(),
      dueDate: formData.reminderDate || undefined,
      userRole: formData.reminderRole,
      priority: formData.reminderPriority,
    };

    try {
      const reminderId = `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const result = await firestore.setDocument('reminders', reminderId, newReminder);
      
      if (result.success) {
        toast.success('Reminder added successfully!');
        setFormData(prev => ({
          ...prev,
          reminderTitle: '',
          reminderDescription: '',
          reminderDate: '',
        }));
        fetchRemindersAndEvents(); // Refresh the data
      } else {
        toast.error('Failed to add reminder');
      }
    } catch (error) {
      console.error('Error adding reminder:', error);
      toast.error('Failed to add reminder');
    }
  };

  const addEvent = async () => {
    if (!formData.eventTitle.trim()) {
      toast.error('Event title is required');
      return;
    }

    const newEvent = {
      title: formData.eventTitle,
      description: formData.eventDescription,
      date: formData.eventDate,
      location: formData.eventLocation,
      status: 'active',
      createdAt: new Date().toISOString(),
      userRole: formData.eventRole,
    };

    try {
      const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const result = await firestore.setDocument('events', eventId, newEvent);
      
      if (result.success) {
        toast.success('Event added successfully!');
        setFormData(prev => ({
          ...prev,
          eventTitle: '',
          eventDescription: '',
          eventDate: '',
          eventLocation: '',
        }));
        fetchRemindersAndEvents(); // Refresh the data
      } else {
        toast.error('Failed to add event');
      }
    } catch (error) {
      console.error('Error adding event:', error);
      toast.error('Failed to add event');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard Data Management</h1>
        
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

        <div className="flex items-center space-x-4 mb-8">
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

        {/* Forms Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Add Reminder Form */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Add Reminder</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="reminderTitle" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  id="reminderTitle"
                  name="reminderTitle"
                  value={formData.reminderTitle}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter reminder name"
                />
              </div>
              
              <div>
                <label htmlFor="reminderDescription" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  id="reminderDescription"
                  name="reminderDescription"
                  value={formData.reminderDescription}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter reminder description"
                  rows={3}
                />
              </div>
              
              <div>
                <label htmlFor="reminderDate" className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="datetime-local"
                  id="reminderDate"
                  name="reminderDate"
                  value={formData.reminderDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="reminderRole" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    id="reminderRole"
                    name="reminderRole"
                    value={formData.reminderRole}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="all">All</option>
                    <option value="member">Member</option>
                    <option value="driver">Driver</option>
                    <option value="operator">Operator</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="reminderPriority" className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    id="reminderPriority"
                    name="reminderPriority"
                    value={formData.reminderPriority}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              
              <button
                onClick={addReminder}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Add Reminder
              </button>
            </div>
          </div>

          {/* Add Event Form */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Add Event</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="eventTitle" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  id="eventTitle"
                  name="eventTitle"
                  value={formData.eventTitle}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter event name"
                />
              </div>
              
              <div>
                <label htmlFor="eventDescription" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  id="eventDescription"
                  name="eventDescription"
                  value={formData.eventDescription}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter event description"
                  rows={3}
                />
              </div>
              
              <div>
                <label htmlFor="eventDate" className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="datetime-local"
                  id="eventDate"
                  name="eventDate"
                  value={formData.eventDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
              
              <div>
                <label htmlFor="eventLocation" className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  id="eventLocation"
                  name="eventLocation"
                  value={formData.eventLocation}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter event location"
                />
              </div>
              
              <div>
                <label htmlFor="eventRole" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  id="eventRole"
                  name="eventRole"
                  value={formData.eventRole}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="all">All</option>
                  <option value="member">Member</option>
                  <option value="driver">Driver</option>
                  <option value="operator">Operator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              <button
                onClick={addEvent}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Add Event
              </button>
            </div>
          </div>
        </div>

        {/* Current Reminders and Events Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Reminders List */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Current Reminders</h2>
            {remindersLoading ? (
              <div className="flex justify-center items-center h-24">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
              </div>
            ) : reminders.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
                No reminders found.
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {reminders.map((reminder) => (
                  <div key={reminder.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-gray-900">{reminder.title}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        reminder.priority === 'high' 
                          ? 'bg-red-100 text-red-800' 
                          : reminder.priority === 'medium' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-green-100 text-green-800'
                      }`}>
                        {reminder.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{reminder.description}</p>
                    <div className="mt-2 text-xs text-gray-500">
                      {reminder.dueDate ? `Due: ${formatDate(reminder.dueDate)}` : 'No due date'} • {reminder.userRole}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Events List */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Current Events</h2>
            {eventsLoading ? (
              <div className="flex justify-center items-center h-24">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
              </div>
            ) : events.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
                No events found.
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {events.map((event) => (
                  <div key={event.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="font-medium text-gray-900">{event.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                    <div className="mt-2 text-xs text-gray-500">
                      {formatDate(event.date)} • {event.location} • {event.userRole}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}