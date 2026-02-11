/**
 * Test script to verify EmailJS configuration
 * Run: node scripts/test-emailjs-config.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBAd3OwNBINoOY840jMGSrF74goXP39N3E",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "sampacoop-af786.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "sampacoop-af786",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "sampacoop-af786.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "907285132975",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:907285132975:web:a3c5eaace0b938c2f8065a"
};

async function testEmailJSConfig() {
  try {
    console.log('🔍 Testing EmailJS Configuration in Firestore...\n');
    
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    const configDoc = await getDoc(doc(db, 'systemConfig', 'emailjs'));
    
    if (!configDoc.exists()) {
      console.error('❌ ERROR: Document systemConfig/emailjs does NOT exist in Firestore!');
      console.log('\nTo fix this, run: node scripts/setup-emailjs-config.js');
      process.exit(1);
    }
    
    const data = configDoc.data();
    console.log('✅ Document exists in Firestore');
    console.log('\n📋 Configuration found:');
    console.log('  publicKey:', data.publicKey ? `${data.publicKey.substring(0, 10)}...` : '❌ MISSING');
    console.log('  serviceId:', data.serviceId || '❌ MISSING');
    console.log('  receiptTemplateId:', data.receiptTemplateId || '❌ MISSING');
    console.log('  updatedAt:', data.updatedAt || 'N/A');
    
    const missing = [];
    if (!data.publicKey) missing.push('publicKey');
    if (!data.serviceId) missing.push('serviceId');
    if (!data.receiptTemplateId) missing.push('receiptTemplateId');
    
    if (missing.length > 0) {
      console.error(`\n❌ ERROR: Missing fields: ${missing.join(', ')}`);
      console.log('\nTo fix this, update the script with your credentials and run:');
      console.log('  node scripts/setup-emailjs-config.js');
      process.exit(1);
    }
    
    console.log('\n✅ All EmailJS configuration fields are present!');
    console.log('\n⚠️  NOTE: This only checks Firestore configuration.');
    console.log('   If emails still fail, check:');
    console.log('   1. Your EmailJS template variables match the code');
    console.log('   2. Your EmailJS service is active');
    console.log('   3. Browser console for detailed error messages');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error testing configuration:', error);
    process.exit(1);
  }
}

testEmailJSConfig();
