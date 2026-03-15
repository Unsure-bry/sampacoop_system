// Role-based sidebar configuration
interface SidebarItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string; // Permission required to show this item
}

interface SidebarSection {
  title: string;
  items: SidebarItem[];
  permission?: string; // Permission required to show this section
}

interface RoleSidebarConfig {
  [role: string]: SidebarSection[];
}

// Import icons
import { 
  Home, 
  Users, 
  FileText, 
  DollarSign, 
  BarChart3, 
  User,
  Settings,
  Activity,
  UserCog,
  Shield
} from 'lucide-react';

// Define sidebar configuration for each role
export const roleSidebarConfig: RoleSidebarConfig = {
  // Admin role configuration
  'admin': [
    {
      title: 'Main',
      items: [
        { name: 'Dashboard', path: '/admin/dashboard', icon: Home },
      ],
    },
    {
      title: 'Members',
      permission: 'viewMembers',
      items: [
        { name: 'Members Record', path: '/admin/members/records', icon: Users, permission: 'viewMembers' },
      ],
    },
    {
      title: 'Loan Manager',
      permission: 'viewLoans',
      items: [
        { name: 'Loan Records', path: '/admin/loans/records', icon: FileText, permission: 'viewLoans' },
        { name: 'Loan Requests', path: '/admin/loans/requests', icon: FileText, permission: 'viewLoans' },
      ],
    },
    {
      title: 'Savings Manager',
      permission: 'viewSavings',
      items: [
        { name: 'Savings Record', path: '/admin/savings', icon: FileText, permission: 'viewSavings' },
      ],
    },
    {
      title: 'Documentation',
      permission: 'viewReports',
      items: [
        { name: 'Reports and Analytics', path: '/admin/reports', icon: BarChart3, permission: 'viewReports' },
      ],
    },
    {
      title: 'Admin Settings',
      permission: 'manageSettings',
      items: [
        { name: 'Role Permissions', path: '/admin/settings/permissions', icon: Settings, permission: 'manageSettings' },
        { name: 'Officer Management', path: '/admin/settings/officers', icon: Users, permission: 'manageSettings' },
        { name: 'Audit Logs', path: '/admin/profile/activity', icon: Activity, permission: 'manageSettings' },
        { name: 'System Settings', path: '/admin/settings/system', icon: Settings, permission: 'manageSettings' },
      ],
    },
    {
      title: 'Profile',
      items: [
        { name: 'My Account', path: '/admin/profile', icon: User },
        { name: 'Edit Profile', path: '/admin/profile/edit', icon: UserCog },
        { name: 'Security', path: '/admin/profile/security', icon: Shield },
      ],
    },
  ],

  // Secretary role configuration
  'secretary': [
    {
      title: 'Main',
      items: [
        { name: 'Home', path: '/admin/secretary/home', icon: Home },
      ],
    },
    {
      title: 'Members',
      permission: 'viewMembers',
      items: [
        { name: 'Member Records', path: '/admin/members/records', icon: Users, permission: 'viewMembers' },
      ],
    },
    {
      title: 'Loan Manager',
      permission: 'viewLoans',
      items: [
        { name: 'Loan Records', path: '/admin/loans/records', icon: FileText, permission: 'viewLoans' },
        { name: 'Loan Requests', path: '/admin/loans/requests', icon: FileText, permission: 'viewLoans' },
      ],
    },
    {
      title: 'Savings',
      permission: 'viewSavings',
      items: [
        { name: 'Savings', path: '/admin/savings', icon: DollarSign, permission: 'viewSavings' },
      ],
    },
    {
      title: 'Documentation',
      permission: 'viewReports',
      items: [
        { name: 'Reports and Analytics', path: '/admin/reports', icon: BarChart3, permission: 'viewReports' },
      ],
    },
    {
      title: 'Profile',
      items: [
        { name: 'My Account', path: '/admin/profile', icon: User },
        { name: 'Edit Profile', path: '/admin/profile/edit', icon: UserCog },
        { name: 'Security', path: '/admin/profile/security', icon: Shield },
      ],
    },
  ],

  // Chairman role configuration
  'chairman': [
    {
      title: 'Main',
      items: [
        { name: 'Home', path: '/admin/chairman/home', icon: Home },
      ],
    },
    {
      title: 'Members',
      permission: 'viewMembers',
      items: [
        { name: 'Members', path: '/admin/members/records', icon: Users, permission: 'viewMembers' },
      ],
    },
    {
      title: 'Loan Manager',
      permission: 'viewLoans',
      items: [
        { name: 'Loans', path: '/admin/loans/records', icon: FileText, permission: 'viewLoans' },
      ],
    },
    {
      title: 'Savings',
      permission: 'viewSavings',
      items: [
        { name: 'Savings', path: '/admin/savings', icon: DollarSign, permission: 'viewSavings' },
      ],
    },
    {
      title: 'Reports',
      permission: 'viewReports',
      items: [
        { name: 'Reports', path: '/admin/reports', icon: BarChart3, permission: 'viewReports' },
      ],
    },
    {
      title: 'Profile',
      items: [
        { name: 'My Account', path: '/admin/profile', icon: User },
        { name: 'Edit Profile', path: '/admin/profile/edit', icon: Settings },
        { name: 'Security', path: '/admin/profile/security', icon: Activity },
      ],
    },
  ],

  // Vice Chairman role configuration
  'vice chairman': [
    {
      title: 'Main',
      items: [
        { name: 'Home', path: '/admin/vice-chairman/home', icon: Home },
      ],
    },
    {
      title: 'Members',
      permission: 'viewMembers',
      items: [
        { name: 'Members', path: '/admin/members/records', icon: Users, permission: 'viewMembers' },
      ],
    },
    {
      title: 'Loan Manager',
      permission: 'viewLoans',
      items: [
        { name: 'Loans', path: '/admin/loans/records', icon: FileText, permission: 'viewLoans' },
      ],
    },
    {
      title: 'Savings',
      permission: 'viewSavings',
      items: [
        { name: 'Savings', path: '/admin/savings', icon: DollarSign, permission: 'viewSavings' },
      ],
    },
    {
      title: 'Reports',
      permission: 'viewReports',
      items: [
        { name: 'Reports', path: '/admin/reports', icon: BarChart3, permission: 'viewReports' },
      ],
    },
    {
      title: 'Profile',
      items: [
        { name: 'My Account', path: '/admin/profile', icon: User },
        { name: 'Edit Profile', path: '/admin/profile/edit', icon: Settings },
        { name: 'Security', path: '/admin/profile/security', icon: Activity },
      ],
    },
  ],

  // Manager role configuration
  'manager': [
    {
      title: 'Main',
      items: [
        { name: 'Home', path: '/admin/manager/home', icon: Home },
      ],
    },
    {
      title: 'Loan Manager',
      permission: 'viewLoans',
      items: [
        { name: 'Loans', path: '/admin/loans/records', icon: FileText, permission: 'viewLoans' },
      ],
    },
    {
      title: 'Savings',
      permission: 'viewSavings',
      items: [
        { name: 'Savings', path: '/admin/savings', icon: DollarSign, permission: 'viewSavings' },
      ],
    },
    {
      title: 'Reports',
      permission: 'viewReports',
      items: [
        { name: 'Reports', path: '/admin/reports', icon: BarChart3, permission: 'viewReports' },
      ],
    },
    {
      title: 'Profile',
      items: [
        { name: 'My Account', path: '/admin/profile', icon: User },
        { name: 'Edit Profile', path: '/admin/profile/edit', icon: Settings },
        { name: 'Security', path: '/admin/profile/security', icon: Activity },
      ],
    },
  ],

  // Treasurer role configuration
  'treasurer': [
    {
      title: 'Main',
      items: [
        { name: 'Home', path: '/admin/treasurer/home', icon: Home },
      ],
    },
    {
      title: 'Members',
      permission: 'viewMembers',
      items: [
        { name: 'Members', path: '/admin/members/records', icon: Users, permission: 'viewMembers' },
      ],
    },
    {
      title: 'Loan Manager',
      permission: 'viewLoans',
      items: [
        { name: 'Loans', path: '/admin/loans/records', icon: FileText, permission: 'viewLoans' },
      ],
    },
    {
      title: 'Savings',
      permission: 'viewSavings',
      items: [
        { name: 'Savings', path: '/admin/savings', icon: DollarSign, permission: 'viewSavings' },
      ],
    },
    {
      title: 'Reports',
      permission: 'viewReports',
      items: [
        { name: 'Reports', path: '/admin/reports', icon: BarChart3, permission: 'viewReports' },
      ],
    },
    {
      title: 'Profile',
      items: [
        { name: 'My Account', path: '/admin/profile', icon: User },
        { name: 'Edit Profile', path: '/admin/profile/edit', icon: Settings },
        { name: 'Security', path: '/admin/profile/security', icon: Activity },
      ],
    },
  ],

  // Board of Directors role configuration
  'board of directors': [
    {
      title: 'Main',
      items: [
        { name: 'Home', path: '/admin/bod/home', icon: Home },
      ],
    },
    {
      title: 'Members',
      permission: 'viewMembers',
      items: [
        { name: 'Members', path: '/admin/members/records', icon: Users, permission: 'viewMembers' },
      ],
    },
    {
      title: 'Loan Manager',
      permission: 'viewLoans',
      items: [
        { name: 'Loans', path: '/admin/loans/records', icon: FileText, permission: 'viewLoans' },
      ],
    },
    {
      title: 'Savings',
      permission: 'viewSavings',
      items: [
        { name: 'Savings', path: '/admin/savings', icon: DollarSign, permission: 'viewSavings' },
      ],
    },
    {
      title: 'Reports',
      permission: 'viewReports',
      items: [
        { name: 'Reports', path: '/admin/reports', icon: BarChart3, permission: 'viewReports' },
      ],
    },
    {
      title: 'Profile',
      items: [
        { name: 'My Account', path: '/admin/profile', icon: User },
        { name: 'Edit Profile', path: '/admin/profile/edit', icon: Settings },
        { name: 'Security', path: '/admin/profile/security', icon: Activity },
      ],
    },
  ],
};

// Get sidebar configuration for a specific role
export function getSidebarConfig(role: string): SidebarSection[] {
  const normalizedRole = role.toLowerCase();
  return roleSidebarConfig[normalizedRole] || roleSidebarConfig['admin'];
}

// Filter sidebar config based on user permissions
export function filterSidebarByPermissions(
  sections: SidebarSection[],
  userPermissions: Record<string, boolean>
): SidebarSection[] {
  return sections
    .map((section) => {
      // Filter items within the section based on their permissions
      const filteredItems = section.items.filter((item) => {
        // If no permission is required, always show
        if (!item.permission) return true;
        // Otherwise, check if user has the permission
        return userPermissions[item.permission] === true;
      });

      // Return section with filtered items
      return {
        ...section,
        items: filteredItems,
      };
    })
    .filter((section) => {
      // Only include sections that have at least one item
      // or sections that don't require a specific permission
      if (section.items.length === 0) return false;
      if (!section.permission) return true;
      return userPermissions[section.permission] === true;
    });
}