#!/usr/bin/env node

// Load environment variables
require('dotenv').config({ path: '.env.local' });

console.log('Testing Firestore Connection...');
console.log('==============================');

// Check environment variables
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

console.log('Environment Variables:');
console.log('FIREBASE_PROJECT_ID:', projectId ? 'SET' : 'MISSING');
console.log('FIREBASE_CLIENT_EMAIL:', clientEmail ? 'SET' : 'MISSING');
console.log('FIREBASE_PRIVATE_KEY:', privateKey ? 'SET' : 'MISSING');

if (!projectId || !clientEmail || !privateKey) {
  console.log('\n❌ ERROR: Missing required environment variables');
  process.exit(1);
}

// Initialize Firebase Admin
const admin = require('firebase-admin');

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: projectId,
        clientEmail: clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
  }

  const db = admin.firestore();
  console.log('\n✅ Firebase Admin initialized successfully');

  // Test connection by listing collections
  db.listCollections()
    .then(collections => {
      console.log('\n📋 Collections in Firestore:');
      collections.forEach(collection => {
        console.log(`  - ${collection.id}`);
      });
      
      // Try to fetch members data
      console.log('\n🔍 Trying to fetch members data...');
      return db.collection('users').get();
    })
    .then(snapshot => {
      console.log(`\n👥 Found ${snapshot.size} documents in 'users' collection`);
      
      if (snapshot.empty) {
        console.log('  No documents found in users collection');
      } else {
        console.log('  Sample documents:');
        let count = 0;
        snapshot.forEach(doc => {
          if (count < 5) { // Show first 5 documents
            const data = doc.data();
            console.log(`    - ${doc.id}: ${data.email || data.displayName || 'No name'}`);
            count++;
          }
        });
      }
      
      // Also check 'members' collection
      console.log('\n🔍 Trying to fetch members collection...');
      return db.collection('members').get();
    })
    .then(snapshot => {
      console.log(`\n👥 Found ${snapshot.size} documents in 'members' collection`);
      
      if (snapshot.empty) {
        console.log('  No documents found in members collection');
      } else {
        console.log('  Sample documents:');
        let count = 0;
        snapshot.forEach(doc => {
          if (count < 5) { // Show first 5 documents
            const data = doc.data();
            console.log(`    - ${doc.id}: ${data.email || data.displayName || 'No name'}`);
            count++;
          }
        });
      }
      
      console.log('\n✅ Firestore connection test completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Error accessing Firestore:', error.message);
      process.exit(1);
    });

} catch (error) {
  console.error('\n❌ Error initializing Firebase Admin:', error.message);
  process.exit(1);
}