/**
 * Admin Card Component
 * 
 * A reusable card component for the admin panel with:
 * - Optional title
 * - Consistent styling
 * - Responsive design
 * 
 * Props:
 * - title: string (optional) - Card title
 * - children: React.ReactNode - Card content
 * - className: string (optional) - Additional CSS classes
 */
export default function AdminCard({ 
  title, 
  children, 
  className = '' 
}: { 
  title?: string; 
  children: React.ReactNode; 
  className?: string; 
}) {
  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-800">{title}</h3>
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}