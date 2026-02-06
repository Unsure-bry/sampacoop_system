import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { firestore } from './firebase';

/**
 * Generates a membership certificate for a newly registered member
 * @param memberData - The member's data to include in the certificate
 * @returns Promise with success status
 */
export async function generateMembershipCertificate(memberData: any): Promise<{ success: boolean; certificateUrl?: string; error?: string }> {
  try {
    // Create a new jsPDF instance
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Define dimensions
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Add decorative border
    doc.setDrawColor(128, 0, 0); // Dark red color
    doc.setLineWidth(2);
    doc.rect(5, 5, pageWidth - 10, pageHeight - 10);

    // Add header with cooperative name
    doc.setFontSize(22);
    doc.setTextColor(128, 0, 0); // Dark red
    doc.setFont(undefined as any, 'bold');
    const coopName = "SAMPA COOPERATIVE";
    const coopNameWidth = doc.getTextWidth(coopName);
    doc.text(coopName, (pageWidth - coopNameWidth) / 2, 30);

    // Add subtitle
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0); // Black
    doc.setFont(undefined as any, 'normal');
    const subtitle = "OFFICIAL MEMBERSHIP CERTIFICATE";
    const subtitleWidth = doc.getTextWidth(subtitle);
    doc.text(subtitle, (pageWidth - subtitleWidth) / 2, 40);

    // Add decorative line
    doc.setDrawColor(128, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(40, 45, pageWidth - 40, 45);

    // Add certificate body content
    doc.setFontSize(14);
    doc.setFont(undefined as any, 'normal');
    
    // Certificate text
    const certText = [
      "",
      "This is to certify that",
      "",
      `${memberData.firstName} ${memberData.middleName || ''} ${memberData.lastName} ${memberData.suffix || ''}`.trim(),
      "",
      "is a bonafide member of",
      "",
      "SAMPA COOPERATIVE",
      "",
      "with the following details:",
      ""
    ];

    // Add certificate text
    let yPos = 60;
    certText.forEach(text => {
      const textWidth = doc.getTextWidth(text);
      doc.text(text, (pageWidth - textWidth) / 2, yPos);
      yPos += 7;
    });

    // Add member details in a table format
    const details = [
      ['Membership ID', memberData.id || 'N/A'],
      ['Full Name', `${memberData.firstName} ${memberData.middleName || ''} ${memberData.lastName} ${memberData.suffix || ''}`.trim()],
      ['Role', memberData.role],
      ['Date of Registration', new Date(memberData.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })],
      ['Cooperative Name', 'SAMPA COOPERATIVE']
    ];

    // Draw the details table
    (doc as any).autoTable({
      startY: yPos,
      head: [['Detail', 'Information']],
      body: details,
      theme: 'grid',
      styles: { 
        fontSize: 12,
        cellPadding: 5
      },
      headStyles: { 
        fillColor: [128, 0, 0], // Dark red
        textColor: [255, 255, 255] // White text
      },
      margin: { left: 40, right: 40 }
    });

    // Add signature area
    const signatureYPos = (doc as any).lastAutoTable.finalY + 20;
    
    // Add seal placeholder
    doc.setFontSize(12);
    doc.setFont(undefined as any, 'italic');
    const sealText = "Official Seal";
    const sealTextWidth = doc.getTextWidth(sealText);
    doc.text(sealText, (pageWidth - sealTextWidth) / 2, signatureYPos + 25);
    
    // Add signature lines
    const signatureStartX = 60;
    const signatureEndX = pageWidth - 60;
    
    // Authorized signature
    doc.text("Authorized Signature", signatureStartX, signatureYPos + 35);
    doc.line(signatureStartX, signatureYPos + 30, signatureStartX + 60, signatureYPos + 30);
    
    // Date
    doc.text("Date", signatureEndX - 40, signatureYPos + 35);
    doc.line(signatureEndX - 40, signatureYPos + 30, signatureEndX, signatureYPos + 30);

    // Add footer
    doc.setFontSize(10);
    doc.setFont(undefined as any, 'italic');
    const footerText = "This certificate is valid upon verification from the SAMPA Cooperative registry.";
    const footerWidth = doc.getTextWidth(footerText);
    doc.text(footerText, (pageWidth - footerWidth) / 2, pageHeight - 20);

    // Save the PDF to a data URL
    const pdfDataUrl = doc.output('datauristring');

    // Extract the base64 portion of the data URL
    const base64Pdf = pdfDataUrl.replace('data:application/pdf;base64,', '');

    // Store the certificate in Firestore
    const certificateData = {
      memberId: memberData.id,
      fullName: `${memberData.firstName} ${memberData.middleName || ''} ${memberData.lastName} ${memberData.suffix || ''}`.trim(),
      role: memberData.role,
      registrationDate: memberData.createdAt,
      certificateUrl: `data:application/pdf;base64,${base64Pdf}`,
      createdAt: new Date().toISOString()
    };

    // Store certificate data in the member's document
    const updateResult = await firestore.updateDocument('members', memberData.id, {
      certificate: certificateData,
      certificateGenerated: true,
      certificateGeneratedAt: new Date().toISOString()
    });

    if (!updateResult.success) {
      console.error('Failed to save certificate data:', updateResult.error);
      return { success: false, error: 'Failed to save certificate data' };
    }

    return { 
      success: true, 
      certificateUrl: `data:application/pdf;base64,${base64Pdf}`,
      error: undefined
    };
  } catch (error) {
    console.error('Error generating certificate:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    };
  }
}

/**
 * Retrieves a member's certificate data
 * @param memberId - The ID of the member
 * @returns Promise with certificate data
 */
export async function getMemberCertificate(memberId: string): Promise<{ success: boolean; certificateData?: any; error?: string }> {
  try {
    const memberResult = await firestore.getDocument('members', memberId);
    
    if (!memberResult.success || !memberResult.data) {
      return { success: false, error: 'Member not found' };
    }

    const memberData = memberResult.data as any;
    
    if (!memberData.certificate) {
      return { success: false, error: 'Certificate not found for this member' };
    }

    return { 
      success: true, 
      certificateData: memberData.certificate 
    };
  } catch (error) {
    console.error('Error retrieving certificate:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    };
  }
}