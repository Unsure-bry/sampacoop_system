'use client';

import { useState, useEffect } from 'react';
import LoanRequestsTable from '@/components/admin/LoanRequestsTable';

export default function LoanRequestsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Loan Requests</h1>
        <p className="text-gray-600">Manage and review loan requests</p>
      </div>
      
      <LoanRequestsTable />
    </div>
  );
}