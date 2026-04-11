/**
 * Backblaze B2 Upload Utility
 * Uses native B2 API (b2_authorize_account, b2_get_upload_url, b2_upload_file)
 */

interface B2AuthResponse {
  authorizationToken: string;
  apiUrl: string;
  downloadUrl: string;
}

interface B2UploadResult {
  success: boolean;
  fileId?: string;
  fileName?: string;
  downloadUrl?: string;
  error?: string;
}

async function authenticateB2(): Promise<B2AuthResponse | null> {
  try {
    const keyId = process.env.B2_KEY_ID;
    const appKey = process.env.B2_APP_KEY;

    if (!keyId || !appKey) {
      console.error('B2_KEY_ID or B2_APP_KEY not configured');
      return null;
    }

    const authString = Buffer.from(`${keyId}:${appKey}`).toString('base64');

    const response = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      method: 'GET',
      headers: { 'Authorization': `Basic ${authString}` },
    });

    if (!response.ok) {
      console.error('B2 auth failed:', await response.text());
      return null;
    }

    const data = await response.json();
    return {
      authorizationToken: data.authorizationToken,
      apiUrl: data.apiUrl,
      downloadUrl: data.downloadUrl,
    };
  } catch (error) {
    console.error('B2 auth error:', error);
    return null;
  }
}

async function getUploadUrl(auth: B2AuthResponse): Promise<{ uploadUrl: string; uploadAuthorizationToken: string } | null> {
  try {
    const bucketId = process.env.B2_BUCKET_ID;
    if (!bucketId) {
      console.error('B2_BUCKET_ID not configured');
      return null;
    }

    const response = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
      method: 'POST',
      headers: {
        'Authorization': auth.authorizationToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bucketId }),
    });

    if (!response.ok) {
      console.error('Failed to get upload URL:', await response.text());
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

export async function uploadToB2(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string = 'application/zip'
): Promise<B2UploadResult> {
  try {
    const auth = await authenticateB2();
    if (!auth) return { success: false, error: 'Failed to authenticate with B2' };

    const uploadUrlData = await getUploadUrl(auth);
    if (!uploadUrlData) return { success: false, error: 'Failed to get upload URL' };

    const crypto = await import('crypto');
    const sha1Hash = crypto.createHash('sha1').update(fileBuffer).digest('hex');

    const response = await fetch(uploadUrlData.uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': uploadUrlData.uploadAuthorizationToken,
        'X-Bz-File-Name': encodeURIComponent(fileName),
        'Content-Type': contentType,
        'X-Bz-Content-Sha1': sha1Hash,
        'Content-Length': fileBuffer.length.toString(),
      },
      body: new Uint8Array(fileBuffer),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('B2 upload failed:', error);
      return { success: false, error: `Upload failed: ${error}` };
    }

    const data = await response.json();
    const bucketName = process.env.B2_BUCKET_NAME;
    const downloadUrl = bucketName
      ? `${auth.downloadUrl}/file/${bucketName}/${encodeURIComponent(fileName)}`
      : undefined;

    return { success: true, fileId: data.fileId, fileName: data.fileName, downloadUrl };
  } catch (error) {
    console.error('B2 upload error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function listB2Files(prefix?: string): Promise<{ fileName: string; uploadTimestamp: number }[]> {
  try {
    const bucketId = process.env.B2_BUCKET_ID;
    if (!bucketId) return [];

    const auth = await authenticateB2();
    if (!auth) return [];

    const response = await fetch(`${auth.apiUrl}/b2api/v2/b2_list_file_names`, {
      method: 'POST',
      headers: {
        'Authorization': auth.authorizationToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bucketId, prefix: prefix || '', maxFileCount: 1000 }),
    });

    if (!response.ok) return [];

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

export async function getLatestBackupTimestamp(): Promise<Date | null> {
  const files = await listB2Files('backups/');
  if (files.length === 0) return null;
  files.sort((a, b) => b.uploadTimestamp - a.uploadTimestamp);
  return new Date(files[0].uploadTimestamp);
}
