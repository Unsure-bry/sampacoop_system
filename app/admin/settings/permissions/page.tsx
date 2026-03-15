'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { toast } from 'react-hot-toast';
import { firestore } from '@/lib/firebase';

// Role permissions configuration interface
interface RolePermission {
  role: string;
  permissions: {
    viewMembers: boolean;
    addMembers: boolean;
    editMembers: boolean;
    archiveMembers: boolean;
    viewLoans: boolean;
    approveLoans: boolean;
    rejectLoans: boolean;
    viewSavings: boolean;
    manageSavings: boolean;
    viewReports: boolean;
    exportData: boolean;
    manageSettings: boolean;
  };
}

// Default permissions for each role (ordered by hierarchy)
const defaultPermissions: RolePermission[] = [
  {
    role: 'admin',
    permissions: {
      viewMembers: true,
      addMembers: true,
      editMembers: true,
      archiveMembers: true,
      viewLoans: true,
      approveLoans: true,
      rejectLoans: true,
      viewSavings: true,
      manageSavings: true,
      viewReports: true,
      exportData: true,
      manageSettings: true,
    },
  },
  {
    role: 'chairman',
    permissions: {
      viewMembers: true,
      addMembers: false,
      editMembers: true,
      archiveMembers: false,
      viewLoans: true,
      approveLoans: true,
      rejectLoans: true,
      viewSavings: true,
      manageSavings: false,
      viewReports: true,
      exportData: true,
      manageSettings: false,
    },
  },
  {
    role: 'vice chairman',
    permissions: {
      viewMembers: true,
      addMembers: false,
      editMembers: true,
      archiveMembers: false,
      viewLoans: true,
      approveLoans: true,
      rejectLoans: true,
      viewSavings: true,
      manageSavings: false,
      viewReports: true,
      exportData: true,
      manageSettings: false,
    },
  },
  {
    role: 'secretary',
    permissions: {
      viewMembers: true,
      addMembers: true,
      editMembers: true,
      archiveMembers: true,
      viewLoans: true,
      approveLoans: false,
      rejectLoans: false,
      viewSavings: true,
      manageSavings: true,
      viewReports: true,
      exportData: true,
      manageSettings: false,
    },
  },
  {
    role: 'treasurer',
    permissions: {
      viewMembers: true,
      addMembers: false,
      editMembers: false,
      archiveMembers: false,
      viewLoans: true,
      approveLoans: false,
      rejectLoans: false,
      viewSavings: true,
      manageSavings: true,
      viewReports: true,
      exportData: true,
      manageSettings: false,
    },
  },
  {
    role: 'manager',
    permissions: {
      viewMembers: true,
      addMembers: false,
      editMembers: false,
      archiveMembers: false,
      viewLoans: true,
      approveLoans: false,
      rejectLoans: false,
      viewSavings: true,
      manageSavings: true,
      viewReports: true,
      exportData: true,
      manageSettings: false,
    },
  },
  {
    role: 'board of directors',
    permissions: {
      viewMembers: true,
      addMembers: false,
      editMembers: false,
      archiveMembers: false,
      viewLoans: true,
      approveLoans: false,
      rejectLoans: false,
      viewSavings: false,
      manageSavings: false,
      viewReports: true,
      exportData: false,
      manageSettings: false,
    },
  },
];

// Permission labels for display
const permissionLabels: Record<string, string> = {
  viewMembers: 'View Members',
  addMembers: 'Add Members',
  editMembers: 'Edit Members',
  archiveMembers: 'Archive/Restore Members',
  viewLoans: 'View Loans',
  approveLoans: 'Approve Loans',
  rejectLoans: 'Reject Loans',
  viewSavings: 'View Savings',
  manageSavings: 'Manage Savings (Add/Edit)',
  viewReports: 'View Reports',
  exportData: 'Export Data',
  manageSettings: 'Manage Settings',
};

// Fixed order for permission display
const permissionOrder = [
  'viewMembers',
  'addMembers',
  'editMembers',
  'archiveMembers',
  'viewLoans',
  'approveLoans',
  'rejectLoans',
  'viewSavings',
  'manageSavings',
  'viewReports',
  'exportData',
  'manageSettings',
];

// Role display names
const roleDisplayNames: Record<string, string> = {
  admin: 'Administrator',
  secretary: 'Secretary',
  chairman: 'Chairman',
  'vice chairman': 'Vice Chairman',
  manager: 'Manager',
  treasurer: 'Treasurer',
  'board of directors': 'Board of Directors',
};

export default function RolePermissionsPage() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<RolePermission[]>(defaultPermissions);
  const [selectedRole, setSelectedRole] = useState<string>('admin');
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Check if current user is admin
  const isAdmin = user?.role?.toLowerCase() === 'admin';

  // Load saved permissions from Firestore on mount
  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const loadedPermissions: RolePermission[] = [];
        
        for (const defaultPerm of defaultPermissions) {
          const result = await firestore.getDocument('rolePermissions', defaultPerm.role);
          if (result.success && result.data) {
            // Use Firestore permissions
            loadedPermissions.push({
              role: defaultPerm.role,
              permissions: result.data.permissions as RolePermission['permissions']
            });
          } else {
            // Use default permissions if not found in Firestore
            loadedPermissions.push(defaultPerm);
          }
        }
        
        setPermissions(loadedPermissions);
      } catch (error) {
        console.error('Error loading permissions from Firestore:', error);
        // Fall back to defaults
        setPermissions(defaultPermissions);
      }
    };
    
    loadPermissions();
  }, []);

  // Save permissions to Firestore
  const handleSavePermissions = async () => {
    setLoading(true);
    try {
      // Save each role's permissions to Firestore
      for (const rolePerm of permissions) {
        const result = await firestore.setDocument('rolePermissions', rolePerm.role, {
          role: rolePerm.role,
          permissions: rolePerm.permissions,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.uid || 'unknown'
        });
        
        if (!result.success) {
          throw new Error(`Failed to save permissions for ${rolePerm.role}`);
        }
      }
      
      // Also save to localStorage as backup
      localStorage.setItem('rolePermissions', JSON.stringify(permissions));
      
      toast.success('Permissions saved successfully! Changes will reflect for all officers.');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Failed to save permissions');
    } finally {
      setLoading(false);
    }
  };

  // Toggle a permission for a role
  const togglePermission = (role: string, permissionKey: string) => {
    setPermissions((prev) =>
      prev.map((rp) =>
        rp.role === role
          ? {
              ...rp,
              permissions: {
                ...rp.permissions,
                [permissionKey]: !rp.permissions[permissionKey as keyof typeof rp.permissions],
              },
            }
          : rp
      )
    );
    setHasChanges(true);
  };

  // Reset to default permissions
  const handleResetDefaults = async () => {
    if (confirm('Are you sure you want to reset all permissions to default?')) {
      setLoading(true);
      try {
        // Reset each role in Firestore
        for (const rolePerm of defaultPermissions) {
          await firestore.setDocument('rolePermissions', rolePerm.role, {
            role: rolePerm.role,
            permissions: rolePerm.permissions,
            updatedAt: new Date().toISOString(),
            updatedBy: user?.uid || 'unknown',
            resetToDefault: true
          });
        }
        
        setPermissions(defaultPermissions);
        localStorage.removeItem('rolePermissions');
        setHasChanges(false);
        toast.success('Permissions reset to defaults and saved!');
      } catch (error) {
        console.error('Error resetting permissions:', error);
        toast.error('Failed to reset permissions');
      } finally {
        setLoading(false);
      }
    }
  };

  // Get permissions for selected role
  const selectedRolePermissions = permissions.find((p) => p.role === selectedRole);

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Role Permissions</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <h2 className="text-lg font-semibold text-red-800">Access Denied</h2>
              <p className="text-red-600">Only administrators can access role permissions settings.</p>
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
          <h1 className="text-2xl font-bold text-gray-800">Role Permissions</h1>
          <p className="text-gray-600">Manage access permissions for each officer role</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleResetDefaults}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center"
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset Defaults
          </button>
          <button
            onClick={handleSavePermissions}
            disabled={loading || !hasChanges}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {hasChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-yellow-800">You have unsaved changes. Click Save Changes to apply.</p>
        </div>
      )}

      {/* Role Selection Tabs */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto">
            {permissions.map((rp) => (
              <button
                key={rp.role}
                onClick={() => setSelectedRole(rp.role)}
                className={`py-4 px-6 border-b-2 font-medium text-sm whitespace-nowrap ${
                  selectedRole === rp.role
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {roleDisplayNames[rp.role] || rp.role}
              </button>
            ))}
          </nav>
        </div>

        {/* Permissions Grid */}
        <div className="p-6">
          {selectedRolePermissions && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800">
                  {roleDisplayNames[selectedRolePermissions.role]} Permissions
                </h2>
                <span className="text-sm text-gray-500">
                  Toggle permissions to enable/disable access
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {permissionOrder
                  .filter((key) => key in selectedRolePermissions.permissions)
                  .map((key) => {
                    const value = selectedRolePermissions.permissions[key as keyof typeof selectedRolePermissions.permissions];
                    return (
                    <div
                      key={key}
                      className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                        value
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                      }`}
                      onClick={() => togglePermission(selectedRolePermissions.role, key)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-800">
                          {permissionLabels[key] || key}
                        </span>
                        <div
                          className={`w-12 h-6 rounded-full transition-colors relative ${
                            value ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        >
                          <div
                            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                              value ? 'left-7' : 'left-1'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-sm font-semibold text-blue-800 mb-2">Permission Summary</h3>
                <p className="text-sm text-blue-600">
                  {Object.entries(selectedRolePermissions.permissions).filter(([key, value]) => key !== 'manageLoanPlans' && value).length} of{' '}
                  {Object.keys(selectedRolePermissions.permissions).filter(key => key !== 'manageLoanPlans').length} permissions enabled
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="h-5 w-5 text-yellow-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-yellow-800">How permissions work</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Changes to permissions take effect immediately after saving. Officers will see/hide 
              UI elements based on their permissions. This applies to all shared admin pages 
              that officers can access.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
