'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from './auth';
import { firestore } from './firebase';

// Permission types
export type Permission =
  | 'viewMembers'
  | 'addMembers'
  | 'editMembers'
  | 'deleteMembers'
  | 'archiveMembers'
  | 'viewLoans'
  | 'approveLoans'
  | 'rejectLoans'
  | 'viewSavings'
  | 'manageSavings'
  | 'viewReports'
  | 'exportData'
  | 'manageSettings';

// Default permissions for each role
export const defaultPermissions: Record<string, Record<Permission, boolean>> = {
  admin: {
    viewMembers: true,
    addMembers: true,
    editMembers: true,
    deleteMembers: true,
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
  secretary: {
    viewMembers: true,
    addMembers: true,
    editMembers: true,
    deleteMembers: false,
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
  chairman: {
    viewMembers: true,
    addMembers: false,
    editMembers: true,
    deleteMembers: false,
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
  'vice chairman': {
    viewMembers: true,
    addMembers: false,
    editMembers: true,
    deleteMembers: false,
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
  manager: {
    viewMembers: true,
    addMembers: false,
    editMembers: false,
    deleteMembers: false,
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
  treasurer: {
    viewMembers: true,
    addMembers: false,
    editMembers: false,
    deleteMembers: false,
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
  'board of directors': {
    viewMembers: true,
    addMembers: false,
    editMembers: false,
    deleteMembers: false,
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
};

// Get permissions for a role (from Firestore or defaults)
export async function getRolePermissionsFromFirestore(role: string): Promise<Record<Permission, boolean>> {
  const normalizedRole = role.toLowerCase().trim();
  
  try {
    const result = await firestore.getDocument('rolePermissions', normalizedRole);
    if (result.success && result.data) {
      return result.data.permissions as Record<Permission, boolean>;
    }
  } catch (error) {
    console.error('Error fetching permissions from Firestore:', error);
  }
  
  // Return default permissions if Firestore fetch fails
  return defaultPermissions[normalizedRole] || defaultPermissions['board of directors'];
}

// Get permissions for a role (fallback to defaults for SSR/compatibility)
export function getRolePermissions(role: string): Record<Permission, boolean> {
  const normalizedRole = role.toLowerCase().trim();
  return defaultPermissions[normalizedRole] || defaultPermissions['board of directors'];
}

// Hook to check permissions for current user (with Firestore sync)
export function usePermissions() {
  const { user } = useAuth();
  const role = user?.role?.toLowerCase().trim() || '';
  const [permissions, setPermissions] = useState<Record<Permission, boolean>>(getRolePermissions(role));
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!role) {
      setLoading(false);
      return;
    }
    
    // Fetch permissions from Firestore
    const fetchPermissions = async () => {
      try {
        const firestorePermissions = await getRolePermissionsFromFirestore(role);
        setPermissions(firestorePermissions);
      } catch (error) {
        console.error('Error loading permissions:', error);
        // Fall back to default permissions
        setPermissions(getRolePermissions(role));
      } finally {
        setLoading(false);
      }
    };
    
    fetchPermissions();
  }, [role]);
  
  const hasPermission = (permission: Permission): boolean => {
    return permissions[permission] || false;
  };
  
  const hasAnyPermission = (permissionList: Permission[]): boolean => {
    return permissionList.some((p) => permissions[p]);
  };
  
  const hasAllPermissions = (permissionList: Permission[]): boolean => {
    return permissionList.every((p) => permissions[p]);
  };
  
  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    role,
    isAdmin: role === 'admin',
    loading,
  };
}

// Helper component for conditional rendering based on permissions
export function PermissionGuard({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { hasPermission } = usePermissions();
  
  if (hasPermission(permission)) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}
