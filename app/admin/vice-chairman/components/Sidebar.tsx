'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Users, 
  FileText, 
  DollarSign, 
  BarChart3, 
  User 
} from 'lucide-react';

export default function ViceChairmanSidebar({ 
  sidebarCollapsed 
}: { 
  sidebarCollapsed: boolean; 
}) {
  const pathname = usePathname();

  // Function to check if a link is active
  const isActive = (path: string) => pathname === path;

  return (
    <div className="flex flex-col h-full">
      {/* Sidebar header */}
      <div className="flex items-center justify-between p-4 border-b">
        {sidebarCollapsed && (
          <h1 className="text-xl font-bold text-red-600">Vice Chairman Panel</h1>
        )}
      </div>

      {/* Sidebar navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          <li>
            <Link
              href="/admin/vice-chairman/home"
              className={`flex items-center p-3 rounded-md transition-colors ${
                isActive('/admin/vice-chairman/home')
                  ? 'bg-red-600 text-white font-medium'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Home className="h-6 w-6" />
              {sidebarCollapsed && <span className="ml-3">Home</span>}
            </Link>
          </li>
          
          {/* Members section */}
          <li>
            <Link
              href="/admin/vice-chairman/members"
              className={`flex items-center p-3 rounded-md transition-colors ${
                isActive('/admin/vice-chairman/members')
                  ? 'bg-red-600 text-white font-medium'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Users className="h-6 w-6" />
              {sidebarCollapsed && <span className="ml-3">Members</span>}
            </Link>
          </li>
          
          {/* Loan Manager section */}
          <li>
            <Link
              href="/admin/vice-chairman/loans"
              className={`flex items-center p-3 rounded-md transition-colors ${
                isActive('/admin/vice-chairman/loans')
                  ? 'bg-red-600 text-white font-medium'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FileText className="h-6 w-6" />
              {sidebarCollapsed && <span className="ml-3">Loan Manager</span>}
            </Link>
          </li>
          
          <li>
            <Link
              href="/admin/vice-chairman/savings"
              className={`flex items-center p-3 rounded-md transition-colors ${
                isActive('/admin/vice-chairman/savings')
                  ? 'bg-red-600 text-white font-medium'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <DollarSign className="h-6 w-6" />
              {sidebarCollapsed && <span className="ml-3">Savings</span>}
            </Link>
          </li>
          
          <li>
            <Link
              href="/admin/vice-chairman/reports"
              className={`flex items-center p-3 rounded-md transition-colors ${
                isActive('/admin/vice-chairman/reports')
                  ? 'bg-red-600 text-white font-medium'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <BarChart3 className="h-6 w-6" />
              {sidebarCollapsed && <span className="ml-3">Reports</span>}
            </Link>
          </li>
          
          <li>
            <Link
              href="/admin/vice-chairman/profile"
              className={`flex items-center p-3 rounded-md transition-colors ${
                isActive('/admin/vice-chairman/profile')
                  ? 'bg-red-600 text-white font-medium'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <User className="h-6 w-6" />
              {sidebarCollapsed && <span className="ml-3">Profile</span>}
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}