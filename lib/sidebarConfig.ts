// Role-based sidebar configuration
interface SidebarItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SidebarSection {
  title: string;
  items: SidebarItem[];
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
  User 
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
      items: [
        { name: 'Members Record', path: '/admin/members/records', icon: Users },
      ],
    },
    {
      title: 'Loan Manager',
      items: [
        { name: 'Loan Records', path: '/admin/loans/records', icon: FileText },
        { name: 'Loan Requests', path: '/admin/loans/requests', icon: FileText },
        { name: 'Loan Plans', path: '/admin/loans/plans', icon: FileText },
      ],
    },
    {
      title: 'Savings Manager',
      items: [
        { name: 'Savings Record', path: '/admin/savings', icon: DollarSign },
      ],
    },
    {
      title: 'Documentation',
      items: [
        { name: 'Reports and Analytics', path: '/admin/reports', icon: BarChart3 },
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
      items: [
        { name: 'Member Records', path: '/admin/secretary/members/records', icon: Users },
      ],
    },
    {
      title: 'Loan Manager',
      items: [
        { name: 'Loan Records', path: '/admin/secretary/loans/records', icon: FileText },
        { name: 'Loan Requests', path: '/admin/secretary/loans/requests', icon: FileText },
      ],
    },
    {
      title: 'Savings',
      items: [
        { name: 'Savings', path: '/admin/secretary/savings', icon: DollarSign },
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
      items: [
        { name: 'Members', path: '/admin/chairman/members', icon: Users },
      ],
    },
    {
      title: 'Loan Manager',
      items: [
        { name: 'Loans', path: '/admin/chairman/loans', icon: FileText },
      ],
    },
    {
      title: 'Savings',
      items: [
        { name: 'Savings', path: '/admin/chairman/savings', icon: DollarSign },
      ],
    },
    {
      title: 'Reports',
      items: [
        { name: 'Reports', path: '/admin/chairman/reports', icon: BarChart3 },
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
      items: [
        { name: 'Members', path: '/admin/vice-chairman/members', icon: Users },
      ],
    },
    {
      title: 'Loan Manager',
      items: [
        { name: 'Loans', path: '/admin/vice-chairman/loans', icon: FileText },
      ],
    },
    {
      title: 'Savings',
      items: [
        { name: 'Savings', path: '/admin/vice-chairman/savings', icon: DollarSign },
      ],
    },
    {
      title: 'Reports',
      items: [
        { name: 'Reports', path: '/admin/vice-chairman/reports', icon: BarChart3 },
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
      items: [
        { name: 'Loans', path: '/admin/manager/loans', icon: FileText },
      ],
    },
    {
      title: 'Savings',
      items: [
        { name: 'Savings', path: '/admin/manager/savings', icon: DollarSign },
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
      items: [
        { name: 'Members', path: '/admin/treasurer/members', icon: Users },
      ],
    },
    {
      title: 'Loan Manager',
      items: [
        { name: 'Loans', path: '/admin/treasurer/loans', icon: FileText },
      ],
    },
    {
      title: 'Savings',
      items: [
        { name: 'Savings', path: '/admin/treasurer/savings', icon: DollarSign },
      ],
    },
    {
      title: 'Reports',
      items: [
        { name: 'Reports', path: '/admin/treasurer/reports', icon: BarChart3 },
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
      items: [
        { name: 'Members', path: '/admin/bod/members', icon: Users },
      ],
    },
    {
      title: 'Loan Manager',
      items: [
        { name: 'Loans', path: '/admin/bod/loans', icon: FileText },
      ],
    },
  ],
};

// Get sidebar configuration for a specific role
export function getSidebarConfig(role: string): SidebarSection[] {
  const normalizedRole = role.toLowerCase();
  return roleSidebarConfig[normalizedRole] || roleSidebarConfig['admin'];
}