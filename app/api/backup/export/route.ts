/**
 * Automated Backup API Endpoint
 * 
 * This endpoint is designed to be called by GitHub Actions for automated backups.
 * It exports Firestore data and uploads it to Backblaze B2.
 * 
 * Security: Requires a secret API key passed in the Authorization header
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import admin from 'firebase-admin';
import { uploadToB2, getLatestBackupTimestamp } from '@/lib/backblazeB2';
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
  backupType: 'daily' | 'monthly' | 'full';
}

// Truncate long strings to prevent Excel cell limit error (32767 characters)
const truncateLongValues = (data: any[]): any[] => {
  const MAX_LENGTH = 32000;
  
  return data.map(item => {
    const truncated: any = {};
    for (const key in item) {
      if (typeof item[key] === 'string' && item[key].length > MAX_LENGTH) {
        truncated[key] = item[key].substring(0, MAX_LENGTH) + '... [truncated]';
      } else if (typeof item[key] === 'object' && item[key] !== null) {
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

// Verify authorization
const verifyAuth = (request: NextRequest): boolean => {
  const authHeader = request.headers.get('Authorization');
  const expectedKey = process.env.BACKUP_API_KEY;
  
  if (!expectedKey) {
    console.error('BACKUP_API_KEY not configured');
    return false;
  }
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  const providedKey = authHeader.substring(7);
  return providedKey === expectedKey;
};

// Fetch data modified since a specific timestamp (for incremental backups)
const fetchModifiedData = async (collectionName: string, since?: Date): Promise<any[]> => {
  try {
    if (!db) {
      console.error('Firestore Admin not initialized');
      return [];
    }

    let query: admin.firestore.Query = db.collection(collectionName);

    if (since) {
      query = query.where('updatedAt', '>=', since.toISOString());
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error(`Error fetching ${collectionName}:`, error);
    return [];
  }
};

export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    if (!verifyAuth(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { 
      type = 'daily', 
      incremental = true,
      collections = ['members', 'loans', 'loanRequests', 'savings', 'users']
    } = body;

    console.log(`Starting ${type} backup... Incremental: ${incremental}`);

    // Determine if we should do incremental backup
    let since: Date | undefined;
    if (incremental && type === 'daily') {
      const lastBackup = await getLatestBackupTimestamp();
      if (lastBackup) {
        since = lastBackup;
        console.log(`Incremental backup: fetching data since ${since.toISOString()}`);
      }
    }

    // Fetch data from Firestore
    console.log('Fetching data from Firestore...');
    
    const backupData: BackupData = {
      members: collections.includes('members') ? await fetchModifiedData('members', since) : [],
      loans: collections.includes('loans') ? await fetchModifiedData('loans', since) : [],
      loanRequests: collections.includes('loanRequests') ? await fetchModifiedData('loanRequests', since) : [],
      savings: collections.includes('savings') ? await fetchModifiedData('savings', since) : [],
      users: collections.includes('users') ? await fetchModifiedData('users', since) : [],
      timestamp: new Date().toISOString(),
      version: '1.0',
      backupType: type,
    };

    // Calculate total records
    const totalRecords = 
      backupData.members.length + 
      backupData.loans.length + 
      backupData.loanRequests.length + 
      backupData.savings.length + 
      backupData.users.length;

    console.log(`Fetched ${totalRecords} records`);

    if (totalRecords === 0 && incremental) {
      // Save skipped log
      if (db) {
        await db.collection('backupLogs').add({
          type,
          status: 'skipped',
          fileName: null,
          downloadUrl: null,
          records: 0,
          incremental: true,
          since: since?.toISOString() || null,
          timestamp: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        });
      }
      return NextResponse.json({
        success: true,
        message: 'No new data to backup',
        records: 0,
        skipped: true,
      });
    }

    // Create ZIP file
    console.log('Creating ZIP file...');
    const zip = new JSZip();
    
    // Add metadata file
    zip.file('metadata.json', JSON.stringify({
      timestamp: backupData.timestamp,
      version: backupData.version,
      type: backupData.backupType,
      incremental: !!since,
      since: since?.toISOString(),
      recordCounts: {
        members: backupData.members.length,
        loans: backupData.loans.length,
        loanRequests: backupData.loanRequests.length,
        savings: backupData.savings.length,
        users: backupData.users.length,
      },
    }, null, 2));

    // Add Excel files to ZIP
    if (backupData.members.length > 0) {
      zip.file('Members.xlsx', convertToExcel(backupData.members, 'Members'));
    }
    if (backupData.loans.length > 0) {
      zip.file('Loans.xlsx', convertToExcel(backupData.loans, 'Loans'));
    }
    if (backupData.loanRequests.length > 0) {
      zip.file('LoanRequests.xlsx', convertToExcel(backupData.loanRequests, 'LoanRequests'));
    }
    if (backupData.savings.length > 0) {
      zip.file('Savings.xlsx', convertToExcel(backupData.savings, 'Savings'));
    }
    if (backupData.users.length > 0) {
      zip.file('Users.xlsx', convertToExcel(backupData.users, 'Users'));
    }

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    
    // Generate filename with timestamp
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-');
    const fileName = `backups/sampa-backup-${type}-${dateStr}_${timeStr}.zip`;

    console.log(`Uploading to B2: ${fileName}`);

    // Upload to Backblaze B2
    const uploadResult = await uploadToB2(zipBuffer, fileName, 'application/zip');

    if (!uploadResult.success) {
      console.error('B2 upload failed:', uploadResult.error);
      return NextResponse.json(
        { 
          success: false, 
          error: `Upload failed: ${uploadResult.error}`,
          records: totalRecords,
        },
        { status: 500 }
      );
    }

    console.log('Backup completed successfully');

    // Save backup log to Firestore
    if (db) {
      await db.collection('backupLogs').add({
        type,
        status: 'success',
        fileName,
        downloadUrl: uploadResult.downloadUrl || null,
        records: totalRecords,
        incremental: !!since,
        since: since?.toISOString() || null,
        timestamp: backupData.timestamp,
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      message: `${type} backup completed successfully`,
      fileName,
      fileId: uploadResult.fileId,
      downloadUrl: uploadResult.downloadUrl,
      records: totalRecords,
      incremental: !!since,
      since: since?.toISOString(),
      timestamp: backupData.timestamp,
    });

  } catch (error) {
    console.error('Backup API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// GET endpoint for health check
export async function GET(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Backup API is running',
    timestamp: new Date().toISOString(),
  });
}
