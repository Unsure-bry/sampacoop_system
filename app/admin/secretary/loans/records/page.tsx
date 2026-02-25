'use client';

import PaginatedLoanRecords from '@/components/admin/PaginatedLoanRecords';

export default function SecretaryLoanRecordsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Loan Records</h1>
        <p className="text-gray-600">View and manage loan records</p>
      </div>
      
      <PaginatedLoanRecords />
    </div>
  );
}