#!/usr/bin/env node

// Test the frontend Firestore implementation
console.log('Testing Frontend Firestore Implementation');
console.log('======================================');

// Simulate the frontend Firestore implementation
const { initializeApp, getApp, getApps } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBAd3OwNBINoOY840jMGSrF74goXP39N3E",
  authDomain: "sampacoop-af786.firebaseapp.com",
  projectId: "sampacoop-af786",
  storageBucket: "sampacoop-af786.firebasestorage.app",
  messagingSenderId: "907285132975",
  appId: "1:907285132975:web:a3c5eaace0b938c2f8065a",
  measurementId: "G-6C6EPXM3GN"
};

// Initialize Firebase - only initialize once
let app;
let db = null;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);
  console.log('✅ Firebase client initialized successfully');
} catch (error) {
  console.error('❌ Firebase client initialization failed:', error.message);
  process.exit(1);
}

// Test fetching members collection
async function testMembersCollection() {
  try {
    console.log('\n--- Testing Members Collection Access ---');
    const querySnapshot = await getDocs(collection(db, 'members'));
    const documents = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`✅ Successfully retrieved ${documents.length} documents from 'members' collection`);
    
    if (documents.length > 0) {
      console.log('\nSample documents:');
      documents.slice(0, 3).forEach((doc, index) => {
        console.log(`  ${index + 1}. ${doc.id}:`);
        console.log(`     First Name: ${doc.firstName || 'MISSING'}`);
        console.log(`     Last Name: ${doc.lastName || 'MISSING'}`);
        console.log(`     Email: ${doc.email || 'MISSING'}`);
        console.log(`     Role: ${doc.role || 'MISSING'}`);
      });
    }
    
    return documents;
  } catch (error) {
    console.error('❌ Error fetching members collection:', error.message);
    if (error.message.includes('PERMISSION_DENIED')) {
      console.log('   This usually means Firestore security rules are blocking access');
      console.log('   Make sure your Firestore rules allow read access to the members collection');
    }
    return [];
  }
}

// Test fetching users collection
async function testUsersCollection() {
  try {
    console.log('\n--- Testing Users Collection Access ---');
    const querySnapshot = await getDocs(collection(db, 'users'));
    const documents = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`✅ Successfully retrieved ${documents.length} documents from 'users' collection`);
    
    if (documents.length > 0) {
      console.log('\nSample documents:');
      documents.slice(0, 3).forEach((doc, index) => {
        console.log(`  ${index + 1}. ${doc.id}:`);
        console.log(`     First Name: ${doc.firstName || 'MISSING'}`);
        console.log(`     Last Name: ${doc.lastName || 'MISSING'}`);
        console.log(`     Email: ${doc.email || 'MISSING'}`);
        console.log(`     Role: ${doc.role || 'MISSING'}`);
      });
    }
    
    return documents;
  } catch (error) {
    console.error('❌ Error fetching users collection:', error.message);
    if (error.message.includes('PERMISSION_DENIED')) {
      console.log('   This usually means Firestore security rules are blocking access');
      console.log('   Make sure your Firestore rules allow read access to the users collection');
    }
    return [];
  }
}

// Run tests
async function runTests() {
  try {
    const members = await testMembersCollection();
    const users = await testUsersCollection();
    
    console.log('\n--- SUMMARY ---');
    console.log(`Members collection: ${members.length} documents`);
    console.log(`Users collection: ${users.length} documents`);
    
    if (members.length > 0 || users.length > 0) {
      console.log('\n✅ Frontend Firestore connection is working!');
      console.log('If member records are not showing in the UI, the issue is likely in the data processing logic.');
    } else {
      console.log('\n⚠️  Firestore connection works but no data found.');
      console.log('Check if your collections have the expected data.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Tests failed:', error.message);
    process.exit(1);
  }
}

runTests();