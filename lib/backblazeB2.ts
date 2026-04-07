/**
 * Backblaze B2 Upload Utility
 * Handles uploading backup files to Backblaze B2 cloud storage
 */

interface B2UploadResult {
  success: boolean;
  fileId?: string;
  fileName?: string;
  downloadUrl?: string;
  error?: string;
}

interface B2AuthResponse {
  authorizationToken: string;
  apiUrl: string;
  downloadUrl: string;
  recommendedPartSize: number;
}

/**
 * Authenticate with Backblaze B2
 */
async function authenticateB2(): Promise<B2AuthResponse | null> {
  try {
    const accountId = process.env.B2_ACCOUNT_ID;
    const applicationKey = process.env.B2_APPLICATION_KEY;

    if (!accountId || !applicationKey) {
      console.error('B2 credentials not configured');
      return null;
    }

    const authString = Buffer.from(`${accountId}:${applicationKey}`).toString('base64');

    const response = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('B2 authentication failed:', error);
      return null;
    }

    const data = await response.json();
    return {
      authorizationToken: data.authorizationToken,
      apiUrl: data.apiUrl,
      downloadUrl: data.downloadUrl,
      recommendedPartSize: data.recommendedPartSize,
    };
  } catch (error) {
    console.error('B2 authentication error:', error);
    return null;
  }
}

/**
 * Get upload URL for a bucket
 */
async function getUploadUrl(auth: B2AuthResponse, bucketId: string): Promise<{ uploadUrl: string; uploadAuthorizationToken: string } | null> {
  try {
    const response = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
      method: 'POST',
      headers: {
        'Authorization': auth.authorizationToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bucketId }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to get upload URL:', error);
      return null;
    }

    const data = await response.json();
    return {
      uploadUrl: data.uploadUrl,
      uploadAuthorizationToken: data.authorizationToken,
    };
  } catch (error) {
    console.error('Get upload URL error:', error);
    return null;
  }
}

/**
 * Upload a file to Backblaze B2
 */
export async function uploadToB2(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string = 'application/zip'
): Promise<B2UploadResult> {
  try {
    const bucketId = process.env.B2_BUCKET_ID;
    
    if (!bucketId) {
      return {
        success: false,
        error: 'B2_BUCKET_ID not configured',
      };
    }

    // Authenticate
    const auth = await authenticateB2();
    if (!auth) {
      return {
        success: false,
        error: 'Failed to authenticate with B2',
      };
    }

    // Get upload URL
    const uploadUrlData = await getUploadUrl(auth, bucketId);
    if (!uploadUrlData) {
      return {
        success: false,
        error: 'Failed to get upload URL',
      };
    }

    // Calculate SHA1 hash of file
    const crypto = await import('crypto');
    const sha1Hash = crypto.createHash('sha1').update(fileBuffer).digest('hex');

    // Upload file
    const response = await fetch(uploadUrlData.uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': uploadUrlData.uploadAuthorizationToken,
        'X-Bz-File-Name': encodeURIComponent(fileName),
        'Content-Type': contentType,
        'X-Bz-Content-Sha1': sha1Hash,
        'Content-Length': fileBuffer.length.toString(),
      },
      body: fileBuffer,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('B2 upload failed:', error);
      return {
        success: false,
        error: `Upload failed: ${error}`,
      };
    }

    const data = await response.json();
    
    // Construct download URL
    const bucketName = process.env.B2_BUCKET_NAME;
    const downloadUrl = bucketName 
      ? `${auth.downloadUrl}/file/${bucketName}/${encodeURIComponent(fileName)}`
      : undefined;

    return {
      success: true,
      fileId: data.fileId,
      fileName: data.fileName,
      downloadUrl,
    };
  } catch (error) {
    console.error('B2 upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * List files in B2 bucket (for incremental backup logic)
 */
export async function listB2Files(prefix?: string): Promise<{ fileName: string; uploadTimestamp: number }[]> {
  try {
    const bucketId = process.env.B2_BUCKET_ID;
    
    if (!bucketId) {
      console.error('B2_BUCKET_ID not configured');
      return [];
    }

    const auth = await authenticateB2();
    if (!auth) {
      console.error('Failed to authenticate with B2');
      return [];
    }

    const response = await fetch(`${auth.apiUrl}/b2api/v2/b2_list_file_names`, {
      method: 'POST',
      headers: {
        'Authorization': auth.authorizationToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bucketId,
        prefix: prefix || '',
        maxFileCount: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to list files:', error);
      return [];
    }

    const data = await response.json();
    return data.files.map((file: any) => ({
      fileName: file.fileName,
      uploadTimestamp: file.uploadTimestamp,
    }));
  } catch (error) {
    console.error('List B2 files error:', error);
    return [];
  }
}

/**
 * Get the latest backup timestamp from B2
 */
export async function getLatestBackupTimestamp(): Promise<Date | null> {
  const files = await listB2Files('backups/');
  
  if (files.length === 0) {
    return null;
  }

  // Sort by upload timestamp (newest first)
  files.sort((a, b) => b.uploadTimestamp - a.uploadTimestamp);
  
  return new Date(files[0].uploadTimestamp);
}
