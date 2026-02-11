/**
 * Script to setup EmailJS configuration in Firestore
 * Run this script to configure EmailJS credentials in the database
 * 
 * Usage: node scripts/setup-emailjs-config.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

// Firebase configuration - uses same config as your app
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBAd3OwNBINoOY840jMGSrF74goXP39N3E",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "sampacoop-af786.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "sampacoop-af786",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "sampacoop-af786.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "907285132975",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:907285132975:web:a3c5eaace0b938c2f8065a"
};

// EmailJS Configuration - UPDATE THESE VALUES with your actual EmailJS credentials
const emailJSConfig = {
  publicKey: process.env.EMAILJS_PUBLIC_KEY || '1zNtc1vGZQ13xf7ha',
  serviceId: process.env.EMAILJS_SERVICE_ID || 'service_owmjs2c',
  receiptTemplateId: process.env.EMAILJS_RECEIPT_TEMPLATE_ID || 'template_i3ulnnq'
};

async function setupEmailJSConfig() {
  try {
    console.log('Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('Setting up EmailJS configuration in Firestore...');
    
    // Check if using placeholder values
    if (emailJSConfig.publicKey.includes('YOUR_') || 
        emailJSConfig.serviceId.includes('YOUR_') || 
        emailJSConfig.receiptTemplateId.includes('YOUR_')) {
      console.warn('\n⚠️  WARNING: You are using placeholder values!');
      console.warn('Please update the emailJSConfig object in this script with your actual EmailJS credentials.');
      console.warn('\nTo get your EmailJS credentials:');
      console.warn('1. Go to https://www.emailjs.com/');
      console.warn('2. Sign in to your account');
      console.warn('3. Get your Public Key from Account > API Keys');
      console.warn('4. Get your Service ID from Email Services');
      console.warn('5. Get your Template ID from Email Templates');
      console.warn('\nOr set environment variables:');
      console.warn('  EMAILJS_PUBLIC_KEY, EMAILJS_SERVICE_ID, EMAILJS_RECEIPT_TEMPLATE_ID\n');
    }
    
    // Save configuration to Firestore
    await setDoc(doc(db, 'systemConfig', 'emailjs'), {
      publicKey: emailJSConfig.publicKey,
      serviceId: emailJSConfig.serviceId,
      receiptTemplateId: emailJSConfig.receiptTemplateId,
      updatedAt: new Date().toISOString(),
      updatedBy: 'setup-script'
    });
    
    console.log('✅ EmailJS configuration saved to Firestore successfully!');
    console.log('\nConfiguration saved:');
    console.log('  Collection: systemConfig');
    console.log('  Document: emailjs');
    console.log('  Fields:');
    console.log('    - publicKey:', emailJSConfig.publicKey.substring(0, 10) + '...');
    console.log('    - serviceId:', emailJSConfig.serviceId);
    console.log('    - receiptTemplateId:', emailJSConfig.receiptTemplateId);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up EmailJS configuration:', error);
    process.exit(1);
  }
}

// Run the setup
setupEmailJSConfig();
