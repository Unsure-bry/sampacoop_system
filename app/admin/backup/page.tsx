'use client';

import { useState } from 'react';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { usePermissions } from '@/lib/rolePermissions';
import { Download, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

interface BackupData {
  members: any[];
  loans: any[];
  loanRequests: any[];
  savings: any[];
  users: any[];
  timestamp: string;
  version: string;
}

export default function BackupPage() {
  const { hasPermission } = usePermissions();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Check if user has manageSettings permission
  if (!hasPermission('manageSettings')) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">System Backup</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <h2 className="text-lg font-semibold text-red-800">Access Denied</h2>
              <p className="text-red-600">You do not have permission to access backup functionality.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Truncate long strings to prevent Excel cell limit error (32767 characters)
  const truncateLongValues = (data: any[]): any[] => {
    const MAX_LENGTH = 32000; // Leave some buffer below 32767
    
    return data.map(item => {
      const truncated: any = {};
      for (const key in item) {
        if (typeof item[key] === 'string' && item[key].length > MAX_LENGTH) {
          truncated[key] = item[key].substring(0, MAX_LENGTH) + '... [truncated]';
        } else if (typeof item[key] === 'object' && item[key] !== null) {
          // Handle nested objects
          truncated[key] = JSON.stringify(item[key]).length > MAX_LENGTH 
            ? JSON.stringify(item[key]).substring(0, MAX_LENGTH) + '... [truncated]'
            : item[key];
        } else {
          truncated[key] = item[key];
        }
      }
      return truncated;
    });
  };

  // Convert array to Excel worksheet
  const convertToExcel = (data: any[], sheetName: string): ArrayBuffer => {
    const processedData = truncateLongValues(data);
    const ws = XLSX.utils.json_to_sheet(processedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  };

  // Export all data from Firestore as ZIP with Excel files
  const handleExportBackup = async () => {
    try {
      setIsExporting(true);
      toast.loading('Preparing backup...', { id: 'export' });

      // Fetch all collections
      const [membersResult, loansResult, loanRequestsResult, savingsResult, usersResult] = await Promise.all([
        firestore.getCollection('members'),
        firestore.getCollection('loans'),
        firestore.getCollection('loanRequests'),
        firestore.getCollection('savings'),
        firestore.getCollection('users'),
      ]);

      const members = membersResult.success ? membersResult.data || [] : [];
      const loans = loansResult.success ? loansResult.data || [] : [];
      const loanRequests = loanRequestsResult.success ? loanRequestsResult.data || [] : [];
      const savings = savingsResult.success ? savingsResult.data || [] : [];
      const users = usersResult.success ? usersResult.data || [] : [];

      // Create ZIP file
      const zip = new JSZip();
      
      // Add Excel files to ZIP
      if (members.length > 0) {
        zip.file('Members.xlsx', convertToExcel(members, 'Members'));
      }
      if (loans.length > 0) {
        zip.file('Loans.xlsx', convertToExcel(loans, 'Loans'));
      }
      if (loanRequests.length > 0) {
        zip.file('LoanRequests.xlsx', convertToExcel(loanRequests, 'LoanRequests'));
      }
      if (savings.length > 0) {
        zip.file('Savings.xlsx', convertToExcel(savings, 'Savings'));
      }
      if (users.length > 0) {
        zip.file('Users.xlsx', convertToExcel(users, 'Users'));
      }

      // Generate ZIP file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sampa-backup-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Backup exported successfully!', { id: 'export' });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export backup', { id: 'export' });
    } finally {
      setIsExporting(false);
    }
  };

  // Convert Excel to JSON
  const excelToJson = (arrayBuffer: ArrayBuffer): any[] => {
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws);
  };

  // Handle file upload for restore
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      toast.loading('Reading backup file...', { id: 'import' });

      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      
      const backupData: BackupData = {
        members: [],
        loans: [],
        loanRequests: [],
        savings: [],
        users: [],
        timestamp: new Date().toISOString(),
        version: '1.0',
      };

      // Extract Excel files from ZIP
      const filePromises: Promise<void>[] = [];

      zip.forEach((relativePath, zipEntry) => {
        if (zipEntry.name.endsWith('.xlsx')) {
          const promise = zipEntry.async('arraybuffer').then((content) => {
            const data = excelToJson(content);
            const fileName = zipEntry.name.replace('.xlsx', '');
            
            switch (fileName) {
              case 'Members':
                backupData.members = data;
                break;
              case 'Loans':
                backupData.loans = data;
                break;
              case 'LoanRequests':
                backupData.loanRequests = data;
                break;
              case 'Savings':
                backupData.savings = data;
                break;
              case 'Users':
                backupData.users = data;
                break;
            }
          });
          filePromises.push(promise);
        }
      });

      await Promise.all(filePromises);

      // Validate backup data
      const totalRecords = backupData.members.length + backupData.loans.length + 
                          backupData.loanRequests.length + backupData.savings.length + 
                          backupData.users.length;
      
      if (totalRecords === 0) {
        throw new Error('No valid data found in backup file');
      }

      // Show confirmation dialog
      const confirmed = window.confirm(
        `This will restore data from backup.\n\n` +
        `Collections to restore:\n` +
        `- Members: ${backupData.members.length} records\n` +
        `- Loans: ${backupData.loans.length} records\n` +
        `- Loan Requests: ${backupData.loanRequests.length} records\n` +
        `- Savings: ${backupData.savings.length} records\n` +
        `- Users: ${backupData.users.length} records\n\n` +
        `WARNING: This will overwrite existing data. Are you sure?`
      );

      if (!confirmed) {
        toast.dismiss('import');
        setIsImporting(false);
        return;
      }

      toast.loading('Restoring data...', { id: 'import' });

      // Restore each collection
      const restorePromises = [];

      if (backupData.members.length > 0) {
        restorePromises.push(
          ...backupData.members.map((member: any) => {
            if (member.id) {
              return firestore.setDocument('members', member.id, member);
            } else {
              return firestore.addDocument('members', member);
            }
          })
        );
      }

      if (backupData.loans.length > 0) {
        restorePromises.push(
          ...backupData.loans.map((loan: any) => {
            if (loan.id) {
              return firestore.setDocument('loans', loan.id, loan);
            } else {
              return firestore.addDocument('loans', loan);
            }
          })
        );
      }

      if (backupData.loanRequests.length > 0) {
        restorePromises.push(
          ...backupData.loanRequests.map((request: any) => {
            if (request.id) {
              return firestore.setDocument('loanRequests', request.id, request);
            } else {
              return firestore.addDocument('loanRequests', request);
            }
          })
        );
      }

      if (backupData.savings.length > 0) {
        restorePromises.push(
          ...backupData.savings.map((saving: any) => {
            if (saving.id) {
              return firestore.setDocument('savings', saving.id, saving);
            } else {
              return firestore.addDocument('savings', saving);
            }
          })
        );
      }

      if (backupData.users.length > 0) {
        restorePromises.push(
          ...backupData.users.map((user: any) => {
            if (user.id) {
              return firestore.setDocument('users', user.id, user);
            } else {
              return firestore.addDocument('users', user);
            }
          })
        );
      }

      await Promise.all(restorePromises);

      toast.success('Data restored successfully!', { id: 'import' });
    } catch (error) {
      console.error('Restore error:', error);
      toast.error('Failed to restore backup: ' + (error instanceof Error ? error.message : 'Unknown error'), { id: 'import' });
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">System Backup</h1>
        <p className="text-gray-600">Export and restore your system data</p>
      </div>

      {/* Backup Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Backup Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Download className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Export Backup</h2>
              <p className="text-sm text-gray-600">Download all system data</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-gray-600 text-sm">
              Export a complete backup of your system including:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>• Members data</li>
              <li>• Loan records</li>
              <li>• Loan requests</li>
              <li>• Savings transactions</li>
              <li>• User accounts</li>
            </ul>

            <button
              onClick={handleExportBackup}
              disabled={isExporting}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                isExporting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  Export Backup
                </>
              )}
            </button>
          </div>
        </div>

        {/* Upload/Restore Backup Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-100 rounded-full">
              <Upload className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Restore Backup</h2>
              <p className="text-sm text-gray-600">Upload and restore data</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-gray-600 text-sm">
              Restore your system from a previously exported backup file.
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <svg className="h-5 w-5 text-yellow-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> Restoring from backup will overwrite existing data. This action cannot be undone.
                </p>
              </div>
            </div>

            <label
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                isImporting
                  ? 'bg-gray-300 text-gray-500'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isImporting ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Restoring...
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5" />
                  Upload Backup
                </>
              )}
              <input
                type="file"
                accept=".zip"
                onChange={handleFileUpload}
                disabled={isImporting}
                className="hidden"
              />
            </label>

            <p className="text-xs text-gray-500 text-center">
              Only .zip files exported from this system are supported
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
