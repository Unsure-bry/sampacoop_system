#!/usr/bin/env node

// Load environment variables
require('dotenv').config({ path: '.env.local' });

console.log('Detailed Member Records Diagnostic');
console.log('=================================');

// Initialize Firebase Admin
const admin = require('firebase-admin');

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  console.log('❌ ERROR: Missing required environment variables');
  process.exit(1);
}

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
  console.log('✅ Firebase Admin initialized successfully');

  // Check members collection
  console.log('\n--- MEMBERS COLLECTION ---');
  db.collection('members').get()
    .then(snapshot => {
      console.log(`Found ${snapshot.size} documents in 'members' collection`);
      
      if (snapshot.empty) {
        console.log('  No documents found');
        return Promise.resolve();
      }
      
      console.log('\nDocument details:');
      let count = 0;
      const membersData = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        membersData.push({
          id: doc.id,
          ...data
        });
        
        console.log(`\nDocument #${++count}: ${doc.id}`);
        console.log(`  First Name: ${data.firstName || 'MISSING'}`);
        console.log(`  Last Name: ${data.lastName || 'MISSING'}`);
        console.log(`  Full Name: ${data.fullName || 'MISSING'}`);
        console.log(`  Email: ${data.email || 'MISSING'}`);
        console.log(`  Role: ${data.role || 'MISSING'}`);
        console.log(`  Phone: ${data.phoneNumber || data.contactNumber || 'MISSING'}`);
        console.log(`  Archived: ${data.archived || false}`);
      });
      
      return Promise.resolve(membersData);
    })
    .then(membersData => {
      // Check users collection
      console.log('\n--- USERS COLLECTION ---');
      return db.collection('users').get();
    })
    .then(snapshot => {
      console.log(`Found ${snapshot.size} documents in 'users' collection`);
      
      if (snapshot.empty) {
        console.log('  No documents found');
        return Promise.resolve();
      }
      
      console.log('\nDocument details:');
      let count = 0;
      const usersData = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        usersData.push({
          id: doc.id,
          ...data
        });
        
        console.log(`\nDocument #${++count}: ${doc.id}`);
        console.log(`  First Name: ${data.firstName || 'MISSING'}`);
        console.log(`  Last Name: ${data.lastName || 'MISSING'}`);
        console.log(`  Full Name: ${data.fullName || 'MISSING'}`);
        console.log(`  Email: ${data.email || 'MISSING'}`);
        console.log(`  Role: ${data.role || 'MISSING'}`);
        console.log(`  Phone: ${data.phoneNumber || data.contactNumber || 'MISSING'}`);
        console.log(`  Archived: ${data.archived || false}`);
      });
      
      // Filter users with member roles
      console.log('\n--- FILTERED MEMBER USERS ---');
      const memberUsers = usersData.filter(user => {
        const role = user.role ? user.role.toLowerCase() : '';
        return role && ['member', 'driver', 'operator'].includes(role);
      });
      
      console.log(`Found ${memberUsers.length} users with member roles:`);
      memberUsers.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.email} (${user.role || 'No role'})`);
      });
      
      return Promise.resolve();
    })
    .then(() => {
      console.log('\n✅ Diagnostic completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error during diagnostic:', error.message);
      process.exit(1);
    });

} catch (error) {
  console.error('❌ Error initializing Firebase Admin:', error.message);
  process.exit(1);
}