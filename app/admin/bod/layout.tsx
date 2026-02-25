import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BOD Dashboard - SAMPA Cooperative',
  description: 'Board of Directors Dashboard',
};

export default function BODLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      {children}
    </div>
  );
}
