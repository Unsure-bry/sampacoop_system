#!/usr/bin/env node

// Load environment variables
require('dotenv').config({ path: '.env.local' });

console.log('Deploying Activity Logs Firestore Indexes');
console.log('====================================');

// Initialize Firebase Admin
const admin = require('firebase-admin');

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  console.log('❌ ERROR: Missing required environment variables');
  console.log('Please ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set in your .env.local file');
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

  console.log('✅ Firebase Admin initialized successfully');
  
  // Get the Firestore API endpoint
  const { FirestoreAdminClient } = require('@google-cloud/firestore');
  const client = new FirestoreAdminClient();

  async function deployIndexes() {
    const indexes = [
      {
        collectionGroup: 'activityLogs',
        queryScope: 'COLLECTION',
        fields: [
          {
            fieldPath: 'userId',
            order: 'ASCENDING'
          },
          {
            fieldPath: 'timestamp',
            order: 'DESCENDING'
          }
        ]
      },
      {
        collectionGroup: 'activityLogs',
        queryScope: 'COLLECTION',
        fields: [
          {
            fieldPath: 'timestamp',
            order: 'ASCENDING'
          }
        ]
      }
    ];

    console.log('\n📋 Indexes to be deployed:');
    indexes.forEach((index, i) => {
      console.log(`  ${i + 1}. Collection: ${index.collectionGroup}`);
      console.log(`      Fields: ${index.fields.map(f => `${f.fieldPath}(${f.order})`).join(', ')}`);
      console.log(`      Scope: ${index.queryScope}`);
    });

    // Deploy each index
    for (const index of indexes) {
      try {
        const parent = client.databaseRootPath(projectId);
        console.log(`\n🔄 Creating index for collection: ${index.collectionGroup}`);
        
        const [operation] = await client.createIndex({
          parent,
          index: {
            queryScope: index.queryScope,
            fields: index.fields,
          },
        });

        console.log(`⏳ Waiting for operation to complete...`);
        await operation.promise();
        console.log(`✅ Index created successfully for ${index.collectionGroup}`);
      } catch (error) {
        if (error.code === 6) { // ALREADY_EXISTS
          console.log(`ℹ️  Index already exists for ${index.collectionGroup}`);
        } else {
          console.error(`❌ Error creating index for ${index.collectionGroup}:`, error.message);
        }
      }
    }

    console.log('\n🎉 All activity logs indexes have been processed!');
    console.log('💡 Note: It may take a few minutes for the indexes to become active.');
  }

  deployIndexes()
    .then(() => {
      console.log('\n✅ Activity logs indexes deployment completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error deploying indexes:', error);
      process.exit(1);
    });

} catch (error) {
  console.error('Firebase initialization error:', error);
  process.exit(1);
}