import { NextRequest } from 'next/server';
import { firestore } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    // Sample reminders
    const sampleReminders = [
      {
        title: 'Loan Payment Due',
        description: 'Your monthly loan payment is due on the 15th of each month.',
        status: 'active',
        createdAt: new Date().toISOString(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        userRole: 'all',
        priority: 'high'
      },
      {
        title: 'Savings Target',
        description: 'You are 75% towards your savings goal this month.',
        status: 'active',
        createdAt: new Date().toISOString(),
        userRole: 'all',
        priority: 'medium'
      },
      {
        title: 'Document Update',
        description: 'Please update your identification documents.',
        status: 'active',
        createdAt: new Date().toISOString(),
        userRole: 'all',
        priority: 'low'
      },
      {
        title: 'Insurance Renewal',
        description: 'Your vehicle insurance is due for renewal next month.',
        status: 'active',
        createdAt: new Date().toISOString(),
        userRole: 'driver',
        priority: 'high'
      },
      {
        title: 'License Renewal',
        description: 'Your driver\'s license needs to be renewed soon.',
        status: 'active',
        createdAt: new Date().toISOString(),
        userRole: 'driver',
        priority: 'high'
      },
      {
        title: 'Vehicle Inspection',
        description: 'Monthly vehicle inspection is required.',
        status: 'active',
        createdAt: new Date().toISOString(),
        userRole: 'driver',
        priority: 'medium'
      },
      {
        title: 'Tax Compliance',
        description: 'Ensure your tax obligations are up to date.',
        status: 'active',
        createdAt: new Date().toISOString(),
        userRole: 'operator',
        priority: 'high'
      },
      {
        title: 'Fleet Maintenance',
        description: 'Schedule maintenance for your fleet vehicles.',
        status: 'active',
        createdAt: new Date().toISOString(),
        userRole: 'operator',
        priority: 'medium'
      }
    ];

    // Sample events
    const sampleEvents = [
      {
        title: 'Annual General Meeting',
        description: 'Annual meeting for all cooperative members.',
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        location: 'Main Conference Hall',
        status: 'active',
        createdAt: new Date().toISOString(),
        userRole: 'all'
      },
      {
        title: 'Financial Literacy Workshop',
        description: 'Learn about investment strategies and financial planning.',
        date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days from now
        location: 'Training Room A',
        status: 'active',
        createdAt: new Date().toISOString(),
        userRole: 'all'
      },
      {
        title: 'Holiday Closure',
        description: 'Office will be closed for Christmas Day.',
        date: new Date('2025-12-25').toISOString(),
        location: 'Office',
        status: 'active',
        createdAt: new Date().toISOString(),
        userRole: 'all'
      },
      {
        title: 'Driver Safety Training',
        description: 'Mandatory safety training for all drivers.',
        date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
        location: 'Safety Center',
        status: 'active',
        createdAt: new Date().toISOString(),
        userRole: 'driver'
      },
      {
        title: 'Operator Business Meeting',
        description: 'Quarterly business meeting for operators.',
        date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days from now
        location: 'Board Room',
        status: 'active',
        createdAt: new Date().toISOString(),
        userRole: 'operator'
      }
    ];

    // Add sample reminders to Firestore if they don't exist
    console.log('Adding reminders...');
    for (const reminder of sampleReminders) {
      // Check if reminder already exists (by title and description)
      const existingQuery = await firestore.queryDocuments('reminders', [
        { field: 'title', operator: '==', value: reminder.title },
        { field: 'description', operator: '==', value: reminder.description }
      ]);
      
      if (!existingQuery.success || !existingQuery.data || existingQuery.data.length === 0) {
        // Generate a unique ID for the reminder
        const reminderId = `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await firestore.setDocument('reminders', reminderId, reminder);
        console.log(`Added reminder: ${reminder.title}`);
      } else {
        console.log(`Reminder already exists: ${reminder.title}`);
      }
    }

    // Add sample events to Firestore if they don't exist
    console.log('Adding events...');
    for (const event of sampleEvents) {
      // Check if event already exists (by title and date)
      const existingQuery = await firestore.queryDocuments('events', [
        { field: 'title', operator: '==', value: event.title },
        { field: 'date', operator: '==', value: event.date }
      ]);
      
      if (!existingQuery.success || !existingQuery.data || existingQuery.data.length === 0) {
        // Generate a unique ID for the event
        const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await firestore.setDocument('events', eventId, event);
        console.log(`Added event: ${event.title}`);
      } else {
        console.log(`Event already exists: ${event.title}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Dashboard data initialized successfully!' 
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error initializing dashboard data:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Failed to initialize dashboard data',
        error: (error as Error).message 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}