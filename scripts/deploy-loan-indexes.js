#!/usr/bin/env node

/**
 * Script to deploy Firestore indexes required for Loan Manager functionality
 * 
 * This script helps automate the deployment of composite indexes needed for:
 * - Pending loan requests (status == 'pending' + orderBy createdAt)
 * - Approved loan requests (status == 'approved' + orderBy approvedAt)
 * - Rejected loan requests (status == 'rejected' + orderBy rejectedAt)
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Check if firebase-tools is installed
function checkFirebaseTools() {
  return new Promise((resolve, reject) => {
    exec('firebase --version', (error, stdout, stderr) => {
      if (error) {
        reject(new Error('Firebase CLI not found. Please install it with: npm install -g firebase-tools'));
      } else {
        console.log('✅ Firebase CLI version:', stdout.trim());
        resolve();
      }
    });
  });
}

// Check if user is logged in to Firebase
function checkFirebaseLogin() {
  return new Promise((resolve, reject) => {
    exec('firebase projects:list', (error, stdout, stderr) => {
      if (error) {
        reject(new Error('Not logged into Firebase. Please run: firebase login'));
      } else {
        console.log('✅ Firebase authentication verified');
        resolve();
      }
    });
  });
}

// Check if firebase.indexes.json exists
function checkIndexesFile() {
  const indexPath = path.join(__dirname, '..', 'firebase.indexes.json');
  if (!fs.existsSync(indexPath)) {
    throw new Error('firebase.indexes.json not found in project root');
  }
  console.log('✅ Found firebase.indexes.json');
  return indexPath;
}

// Deploy indexes
async function deployIndexes() {
  try {
    console.log('🚀 Starting Firestore index deployment...\n');
    
    // Check prerequisites
    await checkFirebaseTools();
    await checkFirebaseLogin();
    const indexPath = checkIndexesFile();
    
    console.log('\n📋 Required indexes:');
    console.log('1. loanRequests: status(ASC) + createdAt(DESC) + __name__(ASC)');
    console.log('2. loanRequests: status(ASC) + approvedAt(DESC) + __name__(ASC)');
    console.log('3. loanRequests: status(ASC) + rejectedAt(DESC) + __name__(ASC)');
    
    console.log('\n🔄 Deploying indexes...');
    
    // Deploy the indexes
    exec('firebase deploy --only firestore:indexes', (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Deployment failed:', error.message);
        console.error('stderr:', stderr);
        process.exit(1);
      }
      
      console.log('✅ Indexes deployed successfully!');
      console.log(stdout);
      
      console.log('\n📝 Next steps:');
      console.log('1. Check Firebase Console → Firestore → Indexes for build status');
      console.log('2. Wait for all indexes to show "Enabled" status (may take a few minutes)');
      console.log('3. Test Loan Manager functionality');
      console.log('4. Verify no query errors in browser console');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the deployment
if (require.main === module) {
  deployIndexes();
}

module.exports = { deployIndexes };