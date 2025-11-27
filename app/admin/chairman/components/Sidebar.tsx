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

export default function ChairmanSidebar({ 
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
          <h1 className="text-xl font-bold text-red-600">Chairman Panel</h1>
        )}
      </div>

      {/* Sidebar navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          <li>
            <Link
              href="/admin/chairman/home"
              className={`flex items-center p-3 rounded-md transition-colors ${
                isActive('/admin/chairman/home')
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
            <div className={`flex items-center p-3 rounded-md transition-colors ${
              isActive('/admin/chairman/members') || isActive('/admin/chairman/members/records')
                ? 'bg-red-600 text-white font-medium'
                : 'text-gray-700 hover:bg-gray-200'
            }`}>
              <Users className="h-6 w-6" />
              {sidebarCollapsed && <span className="ml-3">Members</span>}
            </div>
            
            {sidebarCollapsed && (
              <ul className="ml-8 mt-1 space-y-1 border-l border-gray-200 pl-2">
                <li>
                  <Link
                    href="/admin/chairman/members/records"
                    className={`flex items-center p-2 rounded-md transition-colors ${
                      isActive('/admin/chairman/members/records')
                        ? 'bg-red-600 text-white font-medium'
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span className="ml-2">Member Records</span>
                  </Link>
                </li>
              </ul>
            )}
          </li>
          
          {/* Loan Manager section */}
          <li>
            <div className={`flex items-center p-3 rounded-md transition-colors ${
              isActive('/admin/chairman/loans') || isActive('/admin/chairman/loans/records')
                ? 'bg-red-600 text-white font-medium'
                : 'text-gray-700 hover:bg-gray-200'
            }`}>
              <FileText className="h-6 w-6" />
              {sidebarCollapsed && <span className="ml-3">Loan Manager</span>}
            </div>
            
            {sidebarCollapsed && (
              <ul className="ml-8 mt-1 space-y-1 border-l border-gray-200 pl-2">
                <li>
                  <Link
                    href="/admin/chairman/loans/records"
                    className={`flex items-center p-2 rounded-md transition-colors ${
                      isActive('/admin/chairman/loans/records')
                        ? 'bg-red-600 text-white font-medium'
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span className="ml-2">Loan Records</span>
                  </Link>
                </li>
              </ul>
            )}
          </li>
          
          <li>
            <Link
              href="/admin/chairman/savings"
              className={`flex items-center p-3 rounded-md transition-colors ${
                isActive('/admin/chairman/savings')
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
              href="/admin/chairman/reports"
              className={`flex items-center p-3 rounded-md transition-colors ${
                isActive('/admin/chairman/reports')
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
              href="/admin/chairman/profile"
              className={`flex items-center p-3 rounded-md transition-colors ${
                isActive('/admin/chairman/profile')
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