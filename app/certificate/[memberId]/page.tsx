'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';

export default function CertificateDownloadPage() {
  const params = useParams();
  // Decode the memberId in case it contains special characters like @ (encoded as %40)
  const memberId = decodeURIComponent(params.memberId as string);
  const [certificateUrl, setCertificateUrl] = useState<string | null>(null);
  const [memberName, setMemberName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (memberId) {
      fetchCertificate();
    }
  }, [memberId]);

  const fetchCertificate = async () => {
    try {
      setLoading(true);
      
      // Fetch member data
      const memberResult = await firestore.getDocument('members', memberId);
      if (memberResult.success && memberResult.data) {
        const memberData = memberResult.data as any;
        setMemberName(memberData.fullName || `${memberData.firstName || ''} ${memberData.lastName || ''}`.trim());
      }

      // Fetch certificate from member's subcollection
      const certResult = await firestore.getCollection(`members/${memberId}/certificates`);
      if (certResult.success && certResult.data && certResult.data.length > 0) {
        // Get the most recent certificate
        const latestCert = certResult.data[certResult.data.length - 1] as any;
        if (latestCert.certificateUrl || latestCert.downloadUrl) {
          setCertificateUrl(latestCert.certificateUrl || latestCert.downloadUrl);
        }
      }
    } catch (error) {
      console.error('Error fetching certificate:', error);
      toast.error('Failed to load certificate');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (certificateUrl) {
      // Create a temporary link to trigger download
      const link = document.createElement('a');
      link.href = certificateUrl;
      link.download = `SAMPA_Certificate_${memberName.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Certificate download started!');
    }
  };

  const handleSaveImage = async () => {
    if (certificateUrl) {
      try {
        // Fetch the certificate as blob
        const response = await fetch(certificateUrl);
        const blob = await response.blob();
        
        // Create object URL
        const url = window.URL.createObjectURL(blob);
        
        // Create download link
        const link = document.createElement('a');
        link.href = url;
        link.download = `SAMPA_Certificate_${memberName.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Cleanup
        window.URL.revokeObjectURL(url);
        toast.success('Certificate saved to your device!');
      } catch (error) {
        console.error('Error saving certificate:', error);
        toast.error('Failed to save certificate. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading certificate...</p>
        </div>
      </div>
    );
  }

  if (!certificateUrl) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">📄</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Certificate Not Found</h1>
          <p className="text-gray-600 mb-4">
            Sorry, we couldn&apos;t find your certificate. Please contact support or try again later.
          </p>
          <a 
            href="/login" 
            className="inline-block px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
              Your Membership Certificate
            </h1>
            <p className="text-gray-600">
              Hello {memberName || 'Member'}, your certificate is ready!
            </p>
          </div>
        </div>

        {/* Certificate Preview */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="relative w-full" style={{ height: '600px' }}>
            <iframe
              src={certificateUrl}
              className="w-full h-full border-0 rounded"
              title="Certificate Preview"
            />
          </div>
        </div>

        {/* Download Buttons */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 text-center">
            Download Your Certificate
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download PDF
            </button>
            
            <button
              onClick={handleSaveImage}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Save to Device
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2">How to save on your phone:</h3>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Tap the certificate preview above</li>
              <li>Tap and hold on the certificate image</li>
              <li>Select &quot;Save Image&quot; or &quot;Download Image&quot;</li>
              <li>The certificate will be saved to your Photos/Gallery</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-gray-500 text-sm">
          <p>SAMPA Cooperative Membership Certificate</p>
          <p className="mt-1">If you have any issues, please contact support.</p>
        </div>
      </div>
    </div>
  );
}
