import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { uploadToB2 } from '@/lib/backblazeB2';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileName = formData.get('fileName') as string;
    const type = (formData.get('type') as string) || 'manual';
    const records = Number(formData.get('records') || 0);

    if (!file || !fileName) {
      return NextResponse.json({ error: 'Missing file or fileName' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadResult = await uploadToB2(buffer, fileName, 'application/zip');

    const timestamp = new Date().toISOString();

    if (db) {
      await db.collection('backupLogs').add({
        type,
        status: uploadResult.success ? 'success' : 'failed',
        fileName: uploadResult.success ? fileName : null,
        downloadUrl: uploadResult.downloadUrl || null,
        records,
        incremental: false,
        since: null,
        timestamp,
        createdAt: timestamp,
      });
    }

    if (!uploadResult.success) {
      return NextResponse.json({ error: uploadResult.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, fileName, downloadUrl: uploadResult.downloadUrl });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
