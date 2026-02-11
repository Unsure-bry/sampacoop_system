'use client';

import { useState } from 'react';
import emailjs from '@emailjs/browser';
import { firestore } from '@/lib/firebase';

export default function TestEmailPage() {
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testEmailConfig = async () => {
    setLoading(true);
    setStatus('Fetching config from Firestore...');
    
    try {
      // Get config from Firestore
      const configResult = await firestore.getDocument('systemConfig', 'emailjs');
      
      if (!configResult.success || !configResult.data) {
        setStatus('❌ Config not found in Firestore');
        setLoading(false);
        return;
      }
      
      const config = configResult.data as any;
      setStatus(`✅ Config found: ${JSON.stringify({
        hasPublicKey: !!config.publicKey,
        hasServiceId: !!config.serviceId,
        hasTemplateId: !!config.receiptTemplateId
      }, null, 2)}`);
      
      // Initialize EmailJS
      emailjs.init(config.publicKey);
      
      setStatus(prev => prev + '\n\n📧 Sending test email...');
      
      // Send test email
      const response = await emailjs.send(
        config.serviceId,
        config.receiptTemplateId,
        {
          to_email: 'test@example.com',
          to_name: 'Test User',
          from_name: 'SAMPA Cooperative',
          message: 'This is a test email from SAMPA Cooperative.',
          subject: 'Test Email'
        }
      );
      
      setStatus(prev => prev + `\n\n✅ Email sent successfully!\nResponse: ${JSON.stringify(response, null, 2)}`);
    } catch (error: any) {
      setStatus(prev => prev + `\n\n❌ Error: ${error?.message || 'Unknown error'}\n${JSON.stringify(error, null, 2)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">EmailJS Test Page</h1>
      
      <button
        onClick={testEmailConfig}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test EmailJS Configuration'}
      </button>
      
      {status && (
        <pre className="mt-4 p-4 bg-gray-100 rounded overflow-auto whitespace-pre-wrap">
          {status}
        </pre>
      )}
    </div>
  );
}
