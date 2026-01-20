#!/usr/bin/env node

/**
 * Firebase Connection Test Script
 * Tests Firebase Admin SDK connectivity and basic operations
 */

require('dotenv').config({ path: '.env.local' });

const admin = require('firebase-admin');

async function testFirebaseConnection() {
  console.log('🧪 Firebase Connection Test');
  console.log('==========================\n');
  
  // Check environment variables
  console.log('📋 Environment Variables Check:');
  const requiredVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL', 
    'FIREBASE_PRIVATE_KEY'
  ];
  
  let allPresent = true;
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value && !value.includes('REPLACE_WITH')) {
      console.log(`✅ ${varName}: Present`);
    } else {
      console.log(`❌ ${varName}: Missing or placeholder value`);
      allPresent = false;
    }
  });
  
  if (!allPresent) {
    console.log('\n⚠️  Firebase configuration is incomplete.');
    console.log('Please run: npm run setup-firebase');
    process.exit(1);
  }
  
  try {
    console.log('\n🔌 Initializing Firebase Admin SDK...');
    
    // Initialize Firebase Admin
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    }
    
    const db = admin.firestore();
    console.log('✅ Firebase Admin SDK initialized successfully');
    
    // Test basic Firestore operation
    console.log('\n📚 Testing Firestore Connection...');
    const testCollection = db.collection('test');
    const testDoc = testCollection.doc('connection-test');
    
    // Try to read (this will succeed even if document doesn't exist)
    await testDoc.get();
    console.log('✅ Firestore connection successful');
    
    // Test writing a temporary document
    console.log('\n✏️  Testing Firestore Write Operation...');
    await testDoc.set({
      timestamp: new Date().toISOString(),
      test: true
    });
    console.log('✅ Firestore write operation successful');
    
    // Clean up test document
    await testDoc.delete();
    console.log('✅ Test document cleaned up');
    
    console.log('\n🎉 All Firebase connection tests passed!');
    console.log('Firebase is properly configured and ready to use.');
    
  } catch (error) {
    console.error('\n❌ Firebase connection test failed:');
    console.error('Error:', error.message);
    
    if (error.code === 'invalid_grant') {
      console.error('\n🔧 Common Fix:');
      console.error('- The service account key may have expired');
      console.error('- Generate a new private key from Firebase Console');
      console.error('- Update .env.local with the new credentials');
    } else if (error.code === 'PROJECT_NOT_FOUND') {
      console.error('\n🔧 Common Fix:');
      console.error('- Check that FIREBASE_PROJECT_ID matches your Firebase project');
      console.error('- Verify the project exists in Firebase Console');
    }
    
    process.exit(1);
  }
}

// Run the test
testFirebaseConnection().catch(console.error);