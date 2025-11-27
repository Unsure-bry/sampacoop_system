'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import MemberRegistrationModal from '@/components/admin/MemberRegistrationModal';

export default function MembershipPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleMemberAdded = () => {
    // Show success message
    toast.success('Member registered successfully!');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Membership</h1>
          <p className="text-gray-600">Manage membership plans and settings</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
        >
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Member
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <p className="text-gray-500">Click "Add Member" to register a new member. All registered members will appear in the Member Records section.</p>
        </div>
      </div>
      
      <MemberRegistrationModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onMemberAdded={handleMemberAdded} 
      />
    </div>
  );
}