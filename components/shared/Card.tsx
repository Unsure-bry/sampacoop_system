import React from 'react';

interface CardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export default function Card({ title, children, className = '' }: CardProps) {
  return (
    <div className={`bg-white rounded-xl shadow-md p-4 sm:p-6 transition-all duration-300 hover:shadow-lg ${className}`}>
      <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-800">{title}</h2>
      {children}
    </div>
  );
}