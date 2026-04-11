import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const fileName = request.nextUrl.searchParams.get('file');
  if (!fileName) {
    return NextResponse.json({ error: 'Missing file parameter' }, { status: 400 });
  }

  try {
    const keyId = process.env.B2_KEY_ID!;
    const appKey = process.env.B2_APP_KEY!;
    const authString = Buffer.from(`${keyId}:${appKey}`).toString('base64');

    // Authenticate
    const authRes = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      method: 'GET',
      headers: { 'Authorization': `Basic ${authString}` },
    });

    if (!authRes.ok) {
      return NextResponse.json({ error: 'B2 auth failed' }, { status: 500 });
    }

    const auth = await authRes.json();
    const bucketName = process.env.B2_BUCKET_NAME!;
    const downloadUrl = `${auth.downloadUrl}/file/${bucketName}/${encodeURIComponent(fileName)}`;

    // Fetch the file from B2
    const fileRes = await fetch(downloadUrl, {
      headers: { 'Authorization': auth.authorizationToken },
    });

    if (!fileRes.ok) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const buffer = await fileRes.arrayBuffer();
    const shortName = fileName.split('/').pop() || 'backup.zip';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${shortName}"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
}
