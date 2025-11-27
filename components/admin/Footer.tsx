/**
 * Admin Footer Component
 * 
 * Provides a fixed footer for the admin panel with:
 * - Copyright information
 * - Current year
 */
export default function AdminFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-blue-600 text-white py-4 px-6">
      <div className="flex items-center justify-between">
        <div className="text-sm">
          &copy; {currentYear} SAMPA COOP. All rights reserved.
        </div>
        <div className="text-sm">
          Admin Panel v1.0
        </div>
      </div>
    </footer>
  );
}