'use client';

import { useState, useEffect } from 'react';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/lib/auth';

// Officer roles in hierarchical order
const OFFICER_ROLES = [
  { value: 'chairman', label: 'Chairman' },
  { value: 'vice chairman', label: 'Vice Chairman' },
  { value: 'secretary', label: 'Secretary' },
  { value: 'treasurer', label: 'Treasurer' },
  { value: 'manager', label: 'Manager' },
  { value: 'board of directors', label: 'Board of Directors' },
];

// Role hierarchy for sorting (lower number = higher rank)
const ROLE_HIERARCHY: Record<string, number> = {
  'admin': 0,
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
  phoneNumber?: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export default function OfficerManagementPage() {
  const { user } = useAuth();
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedOfficer, setSelectedOfficer] = useState<Officer | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    phoneNumber: '',
    temporaryPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const isAdmin = user?.role?.toLowerCase() === 'admin';

  useEffect(() => {
    fetchOfficers();
  }, []);

  const fetchOfficers = async () => {
    try {
      setLoading(true);
      const result = await firestore.getCollection('users');
      
      if (result.success && result.data) {
        // Filter only officer roles
        const officerRoles = ['chairman', 'vice chairman', 'secretary', 'treasurer', 'manager', 'board of directors', 'admin'];
        const officersData = result.data
          .filter((doc: any) => {
            const role = doc.role?.toLowerCase();
            return officerRoles.includes(role);
          })
          .map((doc: any) => ({
            id: doc.id,
            firstName: doc.firstName || '',
            lastName: doc.lastName || '',
            email: doc.email || '',
            role: doc.role || '',
            phoneNumber: doc.phoneNumber || doc.contactNumber || '',
            status: doc.status || 'active',
            createdAt: doc.createdAt || new Date().toISOString(),
          }));
        
        setOfficers(officersData);
      }
    } catch (error) {
      console.error('Error fetching officers:', error);
      toast.error('Failed to load officers');
    } finally {
      setLoading(false);
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^09\d{9}$/;
    return phoneRegex.test(phone);
  };

  const handleAddOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all required fields
    if (!formData.firstName.trim()) {
      toast.error('First name is required');
      return;
    }
    
    if (!formData.lastName.trim()) {
      toast.error('Last name is required');
      return;
    }
    
    if (!formData.email.trim()) {
      toast.error('Email is required');
      return;
    }
    
    if (!validateEmail(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    if (!formData.role) {
      toast.error('Role is required');
      return;
    }
    
    if (!formData.phoneNumber.trim()) {
      toast.error('Phone number is required');
      return;
    }
    
    if (!validatePhoneNumber(formData.phoneNumber)) {
      toast.error('Phone number must be 11 digits starting with "09" (e.g., 09123456789)');
      return;
    }
    
    if (!formData.temporaryPassword) {
      toast.error('Temporary password is required');
      return;
    }
    
    if (formData.temporaryPassword.length < 8) {
      toast.error('Temporary password must be at least 8 characters');
      return;
    }
    
    try {
      // Check if email already exists (case-insensitive)
      const normalizedEmail = formData.email.trim().toLowerCase();
      const existingResult = await firestore.queryDocuments('users', [
        { field: 'email', operator: '==', value: normalizedEmail }
      ]);
      
      if (!existingResult.success) {
        console.error('Error checking email:', existingResult.error);
        toast.error('Unable to verify email. Please try again.');
        return;
      }
      
      if (existingResult.data && existingResult.data.length > 0) {
        toast.error('An officer with this email already exists');
        return;
      }

      const result = await firestore.setDocument('users', `officer-${Date.now()}`, {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: normalizedEmail,
        role: formData.role.toLowerCase(),
        phoneNumber: formData.phoneNumber,
        password: formData.temporaryPassword,
        status: 'active',
        createdAt: new Date().toISOString(),
        isOfficer: true,
        isPasswordSet: true,
      });

      if (result.success) {
        toast.success('Officer added successfully');
        setIsAddModalOpen(false);
        setFormData({ firstName: '', lastName: '', email: '', role: '', phoneNumber: '', temporaryPassword: '' });
        fetchOfficers();
      } else {
        toast.error('Failed to add officer');
      }
    } catch (error) {
      console.error('Error adding officer:', error);
      toast.error('An error occurred while adding officer');
    }
  };

  const handleEditOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOfficer) return;

    try {
      const result = await firestore.updateDocument('users', selectedOfficer.id, {
        ...formData,
        role: formData.role.toLowerCase(),
        updatedAt: new Date().toISOString(),
      });

      if (result.success) {
        toast.success('Officer updated successfully');
        setIsEditModalOpen(false);
        setSelectedOfficer(null);
        fetchOfficers();
      } else {
        toast.error('Failed to update officer');
      }
    } catch (error) {
      console.error('Error updating officer:', error);
      toast.error('An error occurred while updating officer');
    }
  };

  const handleDeleteOfficer = async () => {
    if (!selectedOfficer) return;

    try {
      const result = await firestore.deleteDocument('users', selectedOfficer.id);

      if (result.success) {
        toast.success('Officer deleted successfully');
        setIsDeleteModalOpen(false);
        setSelectedOfficer(null);
        fetchOfficers();
      } else {
        toast.error('Failed to delete officer');
      }
    } catch (error) {
      console.error('Error deleting officer:', error);
      toast.error('An error occurred while deleting officer');
    }
  };

  const openEditModal = (officer: Officer) => {
    setSelectedOfficer(officer);
    setFormData({
      firstName: officer.firstName,
      lastName: officer.lastName,
      email: officer.email,
      role: officer.role,
      phoneNumber: officer.phoneNumber || '',
      temporaryPassword: '',
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (officer: Officer) => {
    setSelectedOfficer(officer);
    setIsDeleteModalOpen(true);
  };

  const filteredOfficers = officers
    .filter(officer => {
      const searchLower = searchTerm.toLowerCase();
      return (
        officer.firstName.toLowerCase().includes(searchLower) ||
        officer.lastName.toLowerCase().includes(searchLower) ||
        officer.email.toLowerCase().includes(searchLower) ||
        officer.role.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      // Sort by role hierarchy first
      const aRank = ROLE_HIERARCHY[a.role.toLowerCase()] ?? 999;
      const bRank = ROLE_HIERARCHY[b.role.toLowerCase()] ?? 999;
      if (aRank !== bRank) {
        return aRank - bRank;
      }
      // If same rank, sort by name
      return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
    });

  const getRoleLabel = (role: string) => {
    const normalizedRole = role.toLowerCase();
    if (normalizedRole === 'admin') {
      return 'Administrator';
    }
    const roleConfig = OFFICER_ROLES.find(r => r.value === normalizedRole);
    return roleConfig?.label || role;
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Officer Management</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <h2 className="text-lg font-semibold text-red-800">Access Denied</h2>
              <p className="text-red-600">Only administrators can manage officers.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Officer Management</h1>
          <p className="text-gray-600">Add, update, or delete cooperative officers</p>
        </div>
        <button
          onClick={() => {
            setFormData({ firstName: '', lastName: '', email: '', role: '', phoneNumber: '', temporaryPassword: '' });
            setIsAddModalOpen(true);
          }}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
        >
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Officer
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <input
          type="text"
          placeholder="Search officers..."
          className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 w-full text-gray-900 placeholder-gray-400 shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Officers Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
          </div>
        ) : filteredOfficers.length === 0 ? (
          <div className="text-center py-12">
            <svg className="h-12 w-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-gray-500">No officers found</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOfficers.map((officer) => (
                <tr key={officer.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-medium text-sm mr-3">
                        {officer.firstName.charAt(0)}{officer.lastName.charAt(0)}
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {officer.firstName} {officer.lastName}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {officer.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-700 border border-gray-200">
                      {getRoleLabel(officer.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                      officer.status === 'active' 
                        ? 'bg-green-50 text-green-700 border border-green-200' 
                        : 'bg-gray-50 text-gray-600 border border-gray-200'
                    }`}>
                      {officer.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openEditModal(officer)}
                      className="text-gray-600 hover:text-gray-900 mr-4 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => openDeleteModal(officer)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Officer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-semibold text-gray-800">Add New Officer</h2>
                <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleAddOfficer} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    {!formData.role && <option value="">Select Role</option>}
                    {OFFICER_ROLES.map((role) => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={11}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900"
                    value={formData.phoneNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                      setFormData({ ...formData, phoneNumber: value });
                    }}
                  />
                  <p className="mt-1 text-xs text-gray-500">Must be 11 digits starting with "09"</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Temporary Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      className="w-full px-3 py-2 pr-10 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900"
                      value={formData.temporaryPassword}
                      onChange={(e) => setFormData({ ...formData, temporaryPassword: e.target.value })}
                      placeholder="Min. 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {showPassword ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Officer can change this after first login</p>
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Add Officer
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Officer Modal */}
      {isEditModalOpen && selectedOfficer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-semibold text-gray-800">Edit Officer</h2>
                <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleEditOfficer} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    required
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    {!formData.role && <option value="">Select Role</option>}
                    {OFFICER_ROLES.map((role) => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Update Officer
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedOfficer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Confirm Delete</h2>
                <button onClick={() => setIsDeleteModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mb-6">
                <p className="text-gray-600">
                  Are you sure you want to delete <strong>{selectedOfficer.firstName} {selectedOfficer.lastName}</strong>?
                </p>
                <p className="text-sm text-red-600 mt-2">
                  This action cannot be undone.
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteOfficer}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
