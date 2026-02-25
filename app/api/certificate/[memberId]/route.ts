import { NextRequest } from 'next/server';
import { firestore } from '@/lib/firebase';

export async function GET(request: NextRequest, { params }: { params: Promise<{ memberId: string }> }) {
  try {
    const { memberId } = await params;
    
    // Decode the member ID if it was encoded
    const decodedMemberId = decodeURIComponent(memberId);
    
    // Fetch member data from Firestore
    const memberResult = await firestore.getDocument('members', decodedMemberId);
    
    if (!memberResult.success || !memberResult.data) {
      return new Response(JSON.stringify({ error: 'Member not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const memberData = memberResult.data as any;
    
    // Check if certificate exists
    if (!memberData.certificate || !memberData.certificate.certificateUrl) {
      return new Response(JSON.stringify({ error: 'Certificate not found for this member' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Extract the certificate data URL
    const certificateUrl = memberData.certificate.certificateUrl;
    
    // Extract base64 data from data URL
    if (certificateUrl.startsWith('data:application/pdf')) {
      // Extract base64 data from data URL
      let base64Data = certificateUrl.split(',')[1];
      
      // If the data doesn't look like base64, it might already be the raw base64 string
      if (!base64Data) {
        base64Data = certificateUrl.replace('data:application/pdf;base64,', '');
      }
      
      const buffer = Buffer.from(base64Data, 'base64');
      
      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="membership-certificate-${decodedMemberId}.pdf"`,
          'Content-Length': buffer.length.toString(),
        },
      });
    } else {
      // If it's not a data URL, return an error
      return new Response(JSON.stringify({ error: 'Certificate format not supported' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Error fetching certificate:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}