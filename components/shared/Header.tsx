import React from 'react';
import Link from 'next/link';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-red-600 text-white shadow-md z-50">
      <div className="container mx-auto px-4 h-full flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-bold hover:text-red-200 transition-colors">
          SAMPA COOP
        </Link>
        <nav className="hidden md:flex items-center space-x-4">
          <Link href="/dashboard" className="hover:text-red-200 transition-colors">Dashboard</Link>
          <Link href="/loan" className="hover:text-red-200 transition-colors">Loans</Link>
          <Link href="/savings" className="hover:text-red-200 transition-colors">Savings</Link>
          <Link href="/profile" className="hover:text-red-200 transition-colors">Profile</Link>
        </nav>
        {/* Mobile menu icon - visible only on small screens */}
        <div className="md:hidden">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </div>
      </div>
    </header>
  );
}