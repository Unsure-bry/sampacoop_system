'use client';

import { useState } from 'react';
import { firestore } from '@/lib/firebase';
import toast from 'react-hot-toast';
import { Member, DriverInfo, OperatorInfo } from '@/lib/types/member';

export default function MembersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [memberData, setMemberData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    suffix: '',
    age: 0,
    email: '',
    phoneNumber: '',
    birthdate: '',
    role: 'Driver' as 'Driver' | 'Operator',
    licenseNumber: '',
    tinId: '',
    houseNumber: '',
    blockNumber: '',
    lotNumber: '',
    street: '',
    barangay: '',
    city: ''
  });

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setMemberData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!memberData.firstName || !memberData.lastName || !memberData.email || 
          !memberData.phoneNumber || !memberData.licenseNumber || !memberData.role) {
        toast.error('Please fill in all required fields');
        setLoading(false);
        return;
      }

      // Validate age
      if (memberData.age < 18 || memberData.age > 100) {
        toast.error('Please enter a valid age (18-100)');
        setLoading(false);
        return;
      }

      // Create member document in Firestore
      const fullName = `${memberData.firstName} ${memberData.middleName} ${memberData.lastName} ${memberData.suffix}`.trim();
      
      // Prepare driver or operator info based on role
      // Ensure both driverInfo and operatorInfo are always defined to prevent Firestore undefined field errors
      let driverInfo: DriverInfo | null = null;
      let operatorInfo: OperatorInfo | null = null;
      
      if (memberData.role === 'Driver') {
        driverInfo = {
          licenseNumber: memberData.licenseNumber,
          tinId: memberData.tinId,
          houseNumber: memberData.houseNumber,
          blockNumber: memberData.blockNumber,
          lotNumber: memberData.lotNumber,
          street: memberData.street,
          barangay: memberData.barangay,
          city: memberData.city
        };
        // Initialize operatorInfo as empty object for drivers to prevent undefined field errors
        operatorInfo = {
          licenseNumber: '',
          tinId: '',
          numberOfJeepneys: 0,
          plateNumbers: [],
          houseNumber: '',
          blockNumber: '',
          lotNumber: '',
          street: '',
          barangay: '',
          city: ''
        };
      } else {
        operatorInfo = {
          licenseNumber: memberData.licenseNumber,
          tinId: memberData.tinId,
          numberOfJeepneys: 1, // Default value
          plateNumbers: [], // Empty array
          houseNumber: memberData.houseNumber,
          blockNumber: memberData.blockNumber,
          lotNumber: memberData.lotNumber,
          street: memberData.street,
          barangay: memberData.barangay,
          city: memberData.city
        };
        // Initialize driverInfo as empty object for operators to prevent undefined field errors
        driverInfo = {
          licenseNumber: '',
          tinId: '',
          houseNumber: '',
          blockNumber: '',
          lotNumber: '',
          street: '',
          barangay: '',
          city: ''
        };
      }

      const memberDoc: Partial<Member> = {
        firstName: memberData.firstName,
        lastName: memberData.lastName,
        middleName: memberData.middleName,
        suffix: memberData.suffix,
        age: memberData.age,
        email: memberData.email,
        phoneNumber: memberData.phoneNumber,
        birthdate: memberData.birthdate,
        role: memberData.role,
        driverInfo,
        operatorInfo,
        fullName,
        status: 'Active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Generate a unique ID for the member
      const docId = `${memberData.firstName}-${memberData.lastName}-${Date.now()}`.toLowerCase().replace(/\s+/g, '-');
      
      const result = await firestore.setDocument('members', docId, memberDoc);
      
      if (result.success) {
        toast.success('Member added successfully!');
        // Reset form
        setMemberData({
          firstName: '',
          lastName: '',
          middleName: '',
          suffix: '',
          age: 0,
          email: '',
          phoneNumber: '',
          birthdate: '',
          role: 'Driver',
          licenseNumber: '',
          tinId: '',
          houseNumber: '',
          blockNumber: '',
          lotNumber: '',
          street: '',
          barangay: '',
          city: ''
        });
        setIsModalOpen(false);
      } else {
        toast.error('Failed to add member: ' + (result.error as Error).message);
      }
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error('An error occurred while adding the member');
    } finally {
      setLoading(false);
    }
  };

  // Close modal and reset form
  const closeModal = () => {
    setIsModalOpen(false);
    setMemberData({
      firstName: '',
      lastName: '',
      middleName: '',
      suffix: '',
      age: 0,
      email: '',
      phoneNumber: '',
      birthdate: '',
      role: 'Operator',
      licenseNumber: '',
      tinId: '',
      houseNumber: '',
      blockNumber: '',
      lotNumber: '',
      street: '',
      barangay: '',
      city: ''
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Members Management</h1>
          <p className="text-gray-600">Manage cooperative members</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center"
        >
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Member
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <p>Members management features will be implemented here.</p>
      </div>

      {/* Add Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-800">Add New Member</h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={memberData.firstName}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter first name"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={memberData.lastName}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter last name"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    name="middleName"
                    value={memberData.middleName}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter middle name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Suffix
                  </label>
                  <input
                    type="text"
                    name="suffix"
                    value={memberData.suffix}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    placeholder="e.g., Jr., Sr."
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Age <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="age"
                    value={memberData.age || ''}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter age"
                    min="18"
                    max="100"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Birthdate
                  </label>
                  <input
                    type="date"
                    name="birthdate"
                    value={memberData.birthdate}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={memberData.email}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter email address"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={memberData.phoneNumber}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter phone number"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="role"
                    value={memberData.role}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    required
                  >
                    <option value="Driver">Driver</option>
                    <option value="Operator">Operator</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="licenseNumber"
                    value={memberData.licenseNumber}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter license number"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  TIN ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="tinId"
                  value={memberData.tinId}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter TIN ID"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    House Number
                  </label>
                  <input
                    type="text"
                    name="houseNumber"
                    value={memberData.houseNumber}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter house number"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Block Number
                  </label>
                  <input
                    type="text"
                    name="blockNumber"
                    value={memberData.blockNumber}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter block number"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lot Number
                  </label>
                  <input
                    type="text"
                    name="lotNumber"
                    value={memberData.lotNumber}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter lot number"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street
                  </label>
                  <input
                    type="text"
                    name="street"
                    value={memberData.street}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter street"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Barangay
                  </label>
                  <input
                    type="text"
                    name="barangay"
                    value={memberData.barangay}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter barangay"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={memberData.city}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter city"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}