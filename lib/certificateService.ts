import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { firestore } from './firebase';
import { sendCertificateNotificationEmail } from './emailService';

/**
 * Generates a share certificate for a cooperative member
 * @param memberData - The member's data to include in the certificate
 * @param shareDetails - Share certificate specific details
 * @returns Promise with success status
 */
export async function generateShareCertificate(
  memberData: any,
  shareDetails: {
    certificateNumber: string;
    shares: string;
    shareCapital: string;
    cooperativeName: string;
    day: string;
    month: string;
    year: string;
    secretaryName: string;
    chairmanName: string;
  }
): Promise<{ success: boolean; certificateUrl?: string; error?: string }> {
  try {
    // Create a new jsPDF instance
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Define dimensions
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Green color scheme for share certificate
    const greenDark = [0, 100, 0]; // Dark green
    const greenMedium = [34, 139, 34]; // Forest green
    const greenLight = [144, 238, 144]; // Light green

    // Add outer decorative border
    doc.setDrawColor(greenDark[0], greenDark[1], greenDark[2]);
    doc.setLineWidth(3);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

    // Add inner decorative border
    doc.setDrawColor(greenMedium[0], greenMedium[1], greenMedium[2]);
    doc.setLineWidth(1.5);
    doc.rect(15, 15, pageWidth - 30, pageHeight - 30);

    // Add corner decorations
    const cornerSize = 20;
    // Top left corner
    doc.line(15, 15 + cornerSize, 15, 15);
    doc.line(15, 15, 15 + cornerSize, 15);
    // Top right corner
    doc.line(pageWidth - 15 - cornerSize, 15, pageWidth - 15, 15);
    doc.line(pageWidth - 15, 15, pageWidth - 15, 15 + cornerSize);
    // Bottom left corner
    doc.line(15, pageHeight - 15 - cornerSize, 15, pageHeight - 15);
    doc.line(15, pageHeight - 15, 15 + cornerSize, pageHeight - 15);
    // Bottom right corner
    doc.line(pageWidth - 15 - cornerSize, pageHeight - 15, pageWidth - 15, pageHeight - 15);
    doc.line(pageWidth - 15, pageHeight - 15 - cornerSize, pageWidth - 15, pageHeight - 15);

    // Header section with incorporation info
    doc.setFontSize(8);
    doc.setTextColor(greenDark[0], greenDark[1], greenDark[2]);
    doc.setFont(undefined as any, 'bold');
    const headerText = "INCORPORATED UNDER THE LAWS OF THE PHILIPPINES";
    const headerWidth = doc.getTextWidth(headerText);
    doc.text(headerText, (pageWidth - headerWidth) / 2, 30);

    doc.setFontSize(7);
    doc.setFont(undefined as any, 'normal');
    const subHeaderText = "The Philippine Cooperative Code - RA 9520";
    const subHeaderWidth = doc.getTextWidth(subHeaderText);
    doc.text(subHeaderText, (pageWidth - subHeaderWidth) / 2, 35);

    const authCapitalText = "AUTHORIZED CAPITAL";
    const authCapitalWidth = doc.getTextWidth(authCapitalText);
    doc.text(authCapitalText, (pageWidth - authCapitalWidth) / 2, 40);

    // Certificate Number and Shares boxes
    doc.setDrawColor(greenDark[0], greenDark[1], greenDark[2]);
    doc.setLineWidth(1);
    
    // Number box
    doc.rect(40, 50, 50, 20);
    doc.setFontSize(8);
    doc.setFont(undefined as any, 'bold');
    doc.text("NUMBER", 45, 58);
    doc.setFontSize(12);
    doc.text(shareDetails.certificateNumber, 45, 66);

    // Shares box
    doc.rect(pageWidth - 90, 50, 50, 20);
    doc.setFontSize(8);
    doc.setFont(undefined as any, 'bold');
    doc.text("SHARES", pageWidth - 85, 58);
    doc.setFontSize(12);
    doc.text(shareDetails.shares, pageWidth - 85, 66);

    // Main certificate title
    doc.setFontSize(24);
    doc.setFont(undefined as any, 'bold');
    doc.setTextColor(greenDark[0], greenDark[1], greenDark[2]);
    const titleText = "This Certifies that";
    const titleWidth = doc.getTextWidth(titleText);
    doc.text(titleText, (pageWidth - titleWidth) / 2, 90);

    // Member name with underline
    const fullName = `${memberData.firstName} ${memberData.middleName || ''} ${memberData.lastName} ${memberData.suffix || ''}`.trim();
    doc.setFontSize(20);
    doc.setFont(undefined as any, 'bold');
    const nameWidth = doc.getTextWidth(fullName);
    doc.text(fullName, (pageWidth - nameWidth) / 2, 110);
    
    // Underline for name
    doc.setDrawColor(greenDark[0], greenDark[1], greenDark[2]);
    doc.setLineWidth(0.5);
    doc.line((pageWidth - nameWidth) / 2 - 10, 112, (pageWidth + nameWidth) / 2 + 10, 112);

    // Certificate body text
    doc.setFontSize(12);
    doc.setFont(undefined as any, 'normal');
    doc.setTextColor(0, 0, 0);
    
    const bodyText1 = "is the owner of";
    const bodyText1Width = doc.getTextWidth(bodyText1);
    doc.text(bodyText1, (pageWidth - bodyText1Width) / 2, 125);

    // Shares and capital info
    doc.setFontSize(14);
    doc.setFont(undefined as any, 'bold');
    const sharesText = `${shareDetails.shares} ${shareDetails.shareCapital}`;
    const sharesTextWidth = doc.getTextWidth(sharesText);
    doc.text(sharesText, (pageWidth - sharesTextWidth) / 2, 140);

    // Cooperative name
    doc.setFontSize(16);
    doc.setFont(undefined as any, 'bold');
    const coopName = shareDetails.cooperativeName;
    const coopNameWidth = doc.getTextWidth(coopName);
    doc.text(coopName, (pageWidth - coopNameWidth) / 2, 155);

    // Legal text
    doc.setFontSize(9);
    doc.setFont(undefined as any, 'italic');
    const legalText = "transferable only on the books of the Cooperative by the holder hereof in person or by Attorney";
    const legalText2 = "upon surrender of this Certificate properly endorsed.";
    const legalTextWidth = doc.getTextWidth(legalText);
    const legalText2Width = doc.getTextWidth(legalText2);
    doc.text(legalText, (pageWidth - legalTextWidth) / 2, 170);
    doc.text(legalText2, (pageWidth - legalText2Width) / 2, 176);

    // Witness clause
    doc.setFontSize(9);
    doc.setFont(undefined as any, 'italic');
    const witnessText = "In Witness Whereof, the said Cooperative has caused this Certificate to be signed by its duly";
    const witnessText2 = "authorized officers and so be sealed with the Seal of the Cooperative this";
    const witnessWidth = doc.getTextWidth(witnessText);
    const witness2Width = doc.getTextWidth(witnessText2);
    doc.text(witnessText, (pageWidth - witnessWidth) / 2, 190);
    doc.text(witnessText2, (pageWidth - witness2Width) / 2, 196);

    // Date line
    doc.setFontSize(11);
    doc.setFont(undefined as any, 'normal');
    const dateText = `${shareDetails.day} day of ${shareDetails.month} A.D. 20${shareDetails.year.slice(-2)}`;
    const dateWidth = doc.getTextWidth(dateText);
    doc.text(dateText, (pageWidth - dateWidth) / 2, 208);

    // Signatures
    const signatureY = pageHeight - 50;
    
    // Secretary signature
    doc.setDrawColor(greenDark[0], greenDark[1], greenDark[2]);
    doc.setLineWidth(0.5);
    doc.line(60, signatureY, 140, signatureY);
    doc.setFontSize(10);
    doc.setFont(undefined as any, 'bold');
    doc.text(shareDetails.secretaryName.toUpperCase(), 60, signatureY + 5);
    doc.setFontSize(9);
    doc.setFont(undefined as any, 'normal');
    doc.text("SECRETARY", 60, signatureY + 12);

    // Official Seal (circle)
    doc.setDrawColor(greenMedium[0], greenMedium[1], greenMedium[2]);
    doc.setLineWidth(2);
    doc.circle(pageWidth / 2, signatureY - 5, 20);
    doc.setFillColor(greenLight[0], greenLight[1], greenLight[2]);
    doc.circle(pageWidth / 2, signatureY - 5, 18, 'F');
    doc.setFontSize(8);
    doc.setFont(undefined as any, 'bold');
    doc.setTextColor(greenDark[0], greenDark[1], greenDark[2]);
    const sealText = "OFFICIAL";
    const sealText2 = "SEAL";
    const sealWidth = doc.getTextWidth(sealText);
    const seal2Width = doc.getTextWidth(sealText2);
    doc.text(sealText, (pageWidth - sealWidth) / 2, signatureY - 8);
    doc.text(sealText2, (pageWidth - seal2Width) / 2, signatureY - 2);

    // Chairman signature
    doc.setDrawColor(greenDark[0], greenDark[1], greenDark[2]);
    doc.setLineWidth(0.5);
    doc.line(pageWidth - 140, signatureY, pageWidth - 60, signatureY);
    doc.setFontSize(10);
    doc.setFont(undefined as any, 'bold');
    doc.text(shareDetails.chairmanName.toUpperCase(), pageWidth - 140, signatureY + 5);
    doc.setFontSize(9);
    doc.setFont(undefined as any, 'normal');
    doc.text("CHAIRMAN", pageWidth - 140, signatureY + 12);

    // Footer with shares info
    doc.setDrawColor(greenDark[0], greenDark[1], greenDark[2]);
    doc.setLineWidth(1);
    doc.line(40, pageHeight - 25, pageWidth - 40, pageHeight - 25);
    
    doc.setFontSize(9);
    doc.setFont(undefined as any, 'bold');
    doc.text("SHARES", 60, pageHeight - 18);
    doc.text(shareDetails.shares, 60, pageHeight - 12);
    
    doc.text("EACH", pageWidth - 80, pageHeight - 18);
    doc.text("PHP 100.00", pageWidth - 80, pageHeight - 12);

    // Save the PDF to a data URL
    const pdfDataUrl = doc.output('datauristring');

    // Extract the base64 portion of the data URL
    const base64Pdf = pdfDataUrl.replace('data:application/pdf;base64,', '');

    // Store the certificate in Firestore
    const certificateData = {
      memberId: memberData.id,
      fullName: fullName,
      role: memberData.role,
      certificateType: 'share_certificate',
      certificateNumber: shareDetails.certificateNumber,
      shares: shareDetails.shares,
      shareCapital: shareDetails.shareCapital,
      cooperativeName: shareDetails.cooperativeName,
      issueDate: `${shareDetails.year}-${shareDetails.month}-${shareDetails.day}`,
      secretaryName: shareDetails.secretaryName,
      chairmanName: shareDetails.chairmanName,
      certificateUrl: `data:application/pdf;base64,${base64Pdf}`,
      createdAt: new Date().toISOString()
    };

    // Store certificate data in the member's document
    // Try to find the member by ID first, if that fails, try by email
    let updateResult = await firestore.updateDocument('members', memberData.id, {
      shareCertificate: certificateData,
      shareCertificateGenerated: true,
      shareCertificateGeneratedAt: new Date().toISOString()
    });

    // If update failed, try to find member by email and update using that ID
    if (!updateResult.success && memberData.email) {
      const memberQuery = await firestore.queryDocuments('members', [
        { field: 'email', operator: '==', value: memberData.email }
      ]);
      
      if (memberQuery.success && memberQuery.data && memberQuery.data.length > 0) {
        const actualMemberId = memberQuery.data[0].id;
        updateResult = await firestore.updateDocument('members', actualMemberId, {
          shareCertificate: certificateData,
          shareCertificateGenerated: true,
          shareCertificateGeneratedAt: new Date().toISOString()
        });
      }
    }

    if (!updateResult.success) {
      console.error('Failed to save certificate data:', updateResult.error);
      return { success: false, error: 'Failed to save certificate data - Member not found' };
    }

    return { 
      success: true, 
      certificateUrl: `data:application/pdf;base64,${base64Pdf}`,
      error: undefined
    };
  } catch (error) {
    console.error('Error generating share certificate:', error);
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

/**
 * Generates and sends share certificate with email notification
 * @param memberData - The member's data
 * @param certificateDetails - Share certificate specific details
 * @returns Promise with success status
 */
export async function generateAndSendCertificate(
  memberData: any,
  certificateDetails: {
    certificateNumber: string;
    shares: string;
    shareCapital: string;
    cooperativeName: string;
    day: string;
    month: string;
    year: string;
    secretaryName: string;
    chairmanName: string;
  }
): Promise<{ success: boolean; certificateUrl?: string; error?: string }> {
  try {
    // Generate the share certificate
    const result = await generateShareCertificate(memberData, certificateDetails);
    
    if (!result.success || !result.certificateUrl) {
      return { success: false, error: result.error || 'Failed to generate certificate' };
    }

    // Create certificate record in member_certificates collection
    const certificateRecord = {
      memberId: memberData.id,
      certificateNumber: certificateDetails.certificateNumber,
      certificateType: 'share_certificate',
      certificateSnapshotData: {
        fullName: `${memberData.firstName} ${memberData.middleName || ''} ${memberData.lastName} ${memberData.suffix || ''}`.trim(),
        shares: certificateDetails.shares,
        shareCapital: certificateDetails.shareCapital,
        cooperativeName: certificateDetails.cooperativeName,
        issueDate: `${certificateDetails.year}-${certificateDetails.month}-${certificateDetails.day}`,
        secretaryName: certificateDetails.secretaryName,
        chairmanName: certificateDetails.chairmanName,
        email: memberData.email,
        phoneNumber: memberData.phoneNumber
      },
      generatedAt: new Date().toISOString(),
      filePath: `/api/certificate/${memberData.id}`,
      sentAt: null,
      status: 'generated'
    };

    // Save to member_certificates collection
    await firestore.setDocument('member_certificates', certificateRecord.certificateNumber, certificateRecord);

    // Send email notification with certificate link
    const certificateDownloadUrl = `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/certificate/${memberData.id}`;
    
    const emailSent = await sendCertificateNotificationEmail(
      memberData.email,
      `${memberData.firstName} ${memberData.lastName}`,
      certificateDetails.certificateNumber,
      certificateDownloadUrl
    );

    if (emailSent) {
      // Update sentAt timestamp
      await firestore.updateDocument('member_certificates', certificateRecord.certificateNumber, {
        sentAt: new Date().toISOString(),
        status: 'sent'
      });
    }

    return {
      success: true,
      certificateUrl: result.certificateUrl
    };
  } catch (error) {
    console.error('Error in generateAndSendCertificate:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}