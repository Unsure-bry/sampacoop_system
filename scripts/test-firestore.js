// Simple Firestore test script
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  };

  if (serviceAccount.projectId && serviceAccount.clientEmail && serviceAccount.privateKey) {
    console.log('Initializing Firebase Admin with credentials...');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    console.log('Missing Firebase credentials. Using default initialization.');
    admin.initializeApp();
  }
}

const db = admin.firestore();

async function testFirestore() {
  try {
    console.log('Testing Firestore connection...');
    
    // Test: Get a document from the users collection
    const snapshot = await db.collection('users').limit(1).get();
    console.log(`Found ${snapshot.size} documents in users collection`);
    
    snapshot.forEach(doc => {
      console.log('Document ID:', doc.id);
      console.log('Document data:', doc.data());
    });
    
    console.log('Firestore connection test successful!');
  } catch (error) {
    console.error('Firestore test failed:', error);
  }
}

testFirestore();