'use client';

import { useAuth } from '@/lib/auth';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/shared/Card';

export default function AboutPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">About SAMPA COOP</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Our Mission</h2>
        <p className="text-gray-600 mb-4">
          SAMPA Cooperative is dedicated to providing accessible financial services to our community members. 
          We aim to empower individuals and families through fair lending practices, competitive savings programs, 
          and financial education.
        </p>
        
        <h2 className="text-xl font-semibold mb-4 mt-8">Our History</h2>
        <p className="text-gray-600 mb-4">
          Founded in 1997, SAMPA Cooperative has grown from a small community initiative to a trusted financial 
          institution serving over 200 members. Our commitment to ethical banking and community development 
          has remained unwavering throughout our journey.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card title="Core Values">
          <ul className="space-y-3">
            <li className="flex items-start">
              <div className="flex- shrink-0 h-6 w-6 rounded-full bg-red-100 flex items-center justify-center mt-1">
                <span className="text-red-600 text-sm font-bold">1</span>
              </div>
              <p className="ml-3 text-gray-600">Integrity in all our financial dealings</p>
            </li>
            <li className="flex items-start">
              <div className="flex- shrink-0 h-6 w-6 rounded-full bg-red-100 flex items-center justify-center mt-1">
                <span className="text-red-600 text-sm font-bold">2</span>
              </div>
              <p className="ml-3 text-gray-600">Community empowerment through financial literacy</p>
            </li>
            <li className="flex items-start">
              <div className="flex- shrink-0 h-6 w-6 rounded-full bg-red-100 flex items-center justify-center mt-1">
                <span className="text-red-600 text-sm font-bold">3</span>
              </div>
              <p className="ml-3 text-gray-600">Transparency in operations and reporting</p>
            </li>
            <li className="flex items-start">
              <div className="flex- shrink-0 h-6 w-6 rounded-full bg-red-100 flex items-center justify-center mt-1">
                <span className="text-red-600 text-sm font-bold">4</span>
              </div>
              <p className="ml-3 text-gray-600">Sustainable growth for long-term member benefits</p>
            </li>
          </ul>
        </Card>
        
        <Card title="Contact Information">
          <div className="space-y-4">
            <div className="flex items-start">
              <LocationIcon className="h-5 w-5 text-red-600 mt-1" />
              <p className="ml-3 text-gray-600">123 Poblacion Sta Maria, Bulacan, Philippines </p>
            </div>
            <div className="flex items-start">
              <PhoneIcon className="h-5 w-5 text-red-600 mt-1" />
              <p className="ml-3 text-gray-600">+63 2 123 4567</p>
            </div>
            <div className="flex items-start">
              <EmailIcon className="h-5 w-5 text-red-600 mt-1" />
              <p className="ml-3 text-gray-600">@sampacooop.org</p>
            </div>
            <div className="flex items-start">
              <ClockIcon className="h-5 w-5 text-red-600 mt-1" />
              <p className="ml-3 text-gray-600">Monday - Friday: 8:00 AM - 5:00 PM</p>
            </div>
          </div>
        </Card>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Leadership Team</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="mx-auto w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-3">
              <UserIcon className="h-10 w-10 text-red-600" />
            </div>
            <h3 className="font-semibold">Jerwin Rommel L. Vergel</h3>
            <p className="text-red-600 text-sm">Chairman</p>
          </div>
          <div className="text-center">
            <div className="mx-auto w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-3">
              <UserIcon className="h-10 w-10 text-red-600" />
            </div>
            <h3 className="font-semibold">Bernardo L. Rivera</h3>
            <p className="text-red-600 text-sm">Vice Chairman</p>
          </div>
          <div className="text-center">
            <div className="mx-auto w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-3">
              <UserIcon className="h-10 w-10 text-red-600" />
            </div>
            <h3 className="font-semibold">Sherill P. Omila</h3>
            <p className="text-red-600 text-sm">Secretary</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple SVG Icon Components
const LocationIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const PhoneIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

const EmailIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const ClockIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const UserIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);