'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Users, 
  FileText, 
  DollarSign, 
  User 
} from 'lucide-react';

export default function SecretarySidebar({ 
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
          <h1 className="text-xl font-bold text-red-600">Secretary Panel</h1>
        )}
      </div>

      {/* Sidebar navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          <li>
            <Link
              href="/admin/secretary/home"
              className={`flex items-center p-3 rounded-md transition-colors ${
                isActive('/admin/secretary/home')
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
              isActive('/admin/secretary/members') || isActive('/admin/secretary/members/records') || isActive('/admin/secretary/members/membership')
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
                    href="/admin/secretary/members/records"
                    className={`flex items-center p-2 rounded-md transition-colors ${
                      isActive('/admin/secretary/members/records')
                        ? 'bg-red-600 text-white font-medium'
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span className="ml-2">Member Records</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin/secretary/members/membership"
                    className={`flex items-center p-2 rounded-md transition-colors ${
                      isActive('/admin/secretary/members/membership')
                        ? 'bg-red-600 text-white font-medium'
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span className="ml-2">Membership</span>
                  </Link>
                </li>
              </ul>
            )}
          </li>
          
          {/* Loan Manager section */}
          <li>
            <div className={`flex items-center p-3 rounded-md transition-colors ${
              isActive('/admin/secretary/loans') || isActive('/admin/secretary/loans/records') || isActive('/admin/secretary/loans/requests')
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
                    href="/admin/secretary/loans/records"
                    className={`flex items-center p-2 rounded-md transition-colors ${
                      isActive('/admin/secretary/loans/records')
                        ? 'bg-red-600 text-white font-medium'
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span className="ml-2">Loan Records</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin/secretary/loans/requests"
                    className={`flex items-center p-2 rounded-md transition-colors ${
                      isActive('/admin/secretary/loans/requests')
                        ? 'bg-red-600 text-white font-medium'
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span className="ml-2">Loan Requests</span>
                  </Link>
                </li>
              </ul>
            )}
          </li>
          
          <li>
            <Link
              href="/admin/secretary/savings"
              className={`flex items-center p-3 rounded-md transition-colors ${
                isActive('/admin/secretary/savings')
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
              href="/admin/secretary/profile"
              className={`flex items-center p-3 rounded-md transition-colors ${
                isActive('/admin/secretary/profile')
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