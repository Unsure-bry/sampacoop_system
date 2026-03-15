'use client';

import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { firestore } from '@/lib/firebase';
import { MapPin, Phone, Mail, Clock, User } from 'lucide-react';

// Officer roles in hierarchical order
const ROLE_HIERARCHY: Record<string, number> = {
  'chairman': 1,
  'vice chairman': 2,
  'secretary': 3,
  'treasurer': 4,
  'manager': 5,
  'board of directors': 6,
};

interface Officer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
}

export default function AboutPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [fetchingOfficers, setFetchingOfficers] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    fetchOfficers();
  }, []);

  const fetchOfficers = async () => {
    try {
      setFetchingOfficers(true);
      const result = await firestore.getCollection('users');
      
      if (result.success && result.data) {
        // Filter only officer roles (excluding admin)
        const officerRoles = ['chairman', 'vice chairman', 'secretary', 'treasurer', 'manager', 'board of directors'];
        const officersData = result.data
          .filter((doc: any) => {
            const role = doc.role?.toLowerCase();
            return officerRoles.includes(role) && doc.status === 'active';
          })
          .map((doc: any) => ({
            id: doc.id,
            firstName: doc.firstName || '',
            lastName: doc.lastName || '',
            email: doc.email || '',
            role: doc.role || '',
            status: doc.status || 'active',
          }))
          .sort((a: Officer, b: Officer) => {
            const rankA = ROLE_HIERARCHY[a.role.toLowerCase()] || 999;
            const rankB = ROLE_HIERARCHY[b.role.toLowerCase()] || 999;
            return rankA - rankB;
          });
        
        setOfficers(officersData);
      }
    } catch (error) {
      console.error('Error fetching officers:', error);
    } finally {
      setFetchingOfficers(false);
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      'chairman': 'Chairman',
      'vice chairman': 'Vice Chairman',
      'secretary': 'Secretary',
      'treasurer': 'Treasurer',
      'manager': 'Manager',
      'board of directors': 'Board of Directors',
    };
    return labels[role.toLowerCase()] || role;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">About SAMPA COOP</h1>
        <p className="text-slate-500">Learn more about our cooperative</p>
      </div>

      {/* Mission & History */}
      <div className="space-y-8 mb-10">
        <section>
          <h2 className="text-lg font-medium text-slate-900 mb-3">Our Mission</h2>
          <p className="text-slate-600 leading-relaxed">
            SAMPA Cooperative is dedicated to providing accessible financial services to our community members. 
            We aim to empower individuals and families through fair lending practices, competitive savings programs, 
            and financial education.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-slate-900 mb-3">Our History</h2>
          <p className="text-slate-600 leading-relaxed">
            Founded in 1997, SAMPA Cooperative has grown from a small community initiative to a trusted financial 
            institution serving over 200 members. Our commitment to ethical banking and community development 
            has remained unwavering throughout our journey.
          </p>
        </section>
      </div>

      {/* Core Values */}
      <section className="mb-10">
        <h2 className="text-lg font-medium text-slate-900 mb-4">Core Values</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { num: '01', text: 'Integrity in all our financial dealings' },
            { num: '02', text: 'Community empowerment through financial literacy' },
            { num: '03', text: 'Transparency in operations and reporting' },
            { num: '04', text: 'Sustainable growth for long-term member benefits' },
          ].map((value) => (
            <div key={value.num} className="flex items-start p-4 bg-slate-50 rounded-lg">
              <span className="text-sm font-medium text-red-600 mr-3">{value.num}</span>
              <p className="text-slate-600 text-sm">{value.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Information */}
      <section className="mb-10">
        <h2 className="text-lg font-medium text-slate-900 mb-4">Contact Us</h2>
        <div className="space-y-3">
          <div className="flex items-center text-slate-600">
            <MapPin className="h-4 w-4 text-slate-400 mr-3" />
            <span className="text-sm">123 Poblacion Sta Maria, Bulacan, Philippines</span>
          </div>
          <div className="flex items-center text-slate-600">
            <Phone className="h-4 w-4 text-slate-400 mr-3" />
            <span className="text-sm">+63 2 123 4567</span>
          </div>
          <div className="flex items-center text-slate-600">
            <Mail className="h-4 w-4 text-slate-400 mr-3" />
            <span className="text-sm">info@sampacoop.org</span>
          </div>
          <div className="flex items-center text-slate-600">
            <Clock className="h-4 w-4 text-slate-400 mr-3" />
            <span className="text-sm">Monday - Friday: 8:00 AM - 5:00 PM</span>
          </div>
        </div>
      </section>

      {/* Leadership Team */}
      <section>
        <h2 className="text-lg font-medium text-slate-900 mb-4">Leadership Team</h2>
        {fetchingOfficers ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-red-600"></div>
          </div>
        ) : officers.length === 0 ? (
          <p className="text-slate-500 text-sm">No officers found.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {officers.map((officer) => (
              <div key={officer.id} className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="mx-auto w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-3">
                  <User className="h-6 w-6 text-slate-400" />
                </div>
                <h3 className="font-medium text-slate-900 text-sm">
                  {officer.firstName} {officer.lastName}
                </h3>
                <p className="text-red-600 text-xs mt-1">{getRoleLabel(officer.role)}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}