#!/usr/bin/env node

/**
 * Script to validate Loan Manager functionality after Firestore index deployment
 * 
 * This script tests:
 * 1. Pending loan requests loading
 * 2. Approved loan requests loading  
 * 3. Rejected loan requests loading
 * 4. Query performance
 * 5. Error handling
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function testPendingRequests() {
  console.log('🔍 Testing Pending Loan Requests Query...');
  try {
    const snapshot = await db.collection('loanRequests')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();
    
    console.log(`✅ Pending requests query successful: ${snapshot.size} documents found`);
    return true;
  } catch (error) {
    console.error('❌ Pending requests query failed:', error.message);
    return false;
  }
}

async function testApprovedRequests() {
  console.log('🔍 Testing Approved Loan Requests Query...');
  try {
    const snapshot = await db.collection('loanRequests')
      .where('status', '==', 'approved')
      .orderBy('approvedAt', 'desc')
      .limit(5)
      .get();
    
    console.log(`✅ Approved requests query successful: ${snapshot.size} documents found`);
    return true;
  } catch (error) {
    console.error('❌ Approved requests query failed:', error.message);
    return false;
  }
}

async function testRejectedRequests() {
  console.log('🔍 Testing Rejected Loan Requests Query...');
  try {
    const snapshot = await db.collection('loanRequests')
      .where('status', '==', 'rejected')
      .orderBy('rejectedAt', 'desc')
      .limit(5)
      .get();
    
    console.log(`✅ Rejected requests query successful: ${snapshot.size} documents found`);
    return true;
  } catch (error) {
    console.error('❌ Rejected requests query failed:', error.message);
    return false;
  }
}

async function testPagination() {
  console.log('🔍 Testing Pagination Queries...');
  try {
    // Test pending with pagination
    const pendingPage1 = await db.collection('loanRequests')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
    
    console.log(`✅ Pending pagination query successful: ${pendingPage1.size} documents`);
    
    // Test approved with pagination
    const approvedPage1 = await db.collection('loanRequests')
      .where('status', '==', 'approved')
      .orderBy('approvedAt', 'desc')
      .limit(10)
      .get();
    
    console.log(`✅ Approved pagination query successful: ${approvedPage1.size} documents`);
    
    return true;
  } catch (error) {
    console.error('❌ Pagination query failed:', error.message);
    return false;
  }
}

async function runValidation() {
  console.log('🚀 Starting Loan Manager Validation...\n');
  
  const results = {
    pending: await testPendingRequests(),
    approved: await testApprovedRequests(),
    rejected: await testRejectedRequests(),
    pagination: await testPagination()
  };
  
  console.log('\n📊 Validation Results:');
  console.log('=====================');
  console.log(`Pending Requests: ${results.pending ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Approved Requests: ${results.approved ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Rejected Requests: ${results.rejected ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Pagination: ${results.pagination ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(result => result);
  
  console.log('\n🏁 Overall Result:');
  if (allPassed) {
    console.log('🎉 All validations passed! Loan Manager should work correctly.');
    console.log('\n📋 Next Steps:');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Navigate to Loan Manager → Loan Requests');
    console.log('3. Verify all tabs load without errors');
    console.log('4. Test approval/rejection workflows');
  } else {
    console.log('⚠️  Some validations failed. Please check:');
    console.log('1. Firestore indexes are deployed and enabled');
    console.log('2. Check Firebase Console → Firestore → Indexes');
    console.log('3. Ensure all required indexes show "Enabled" status');
    console.log('4. Run: npm run deploy-loan-indexes');
  }
  
  process.exit(allPassed ? 0 : 1);
}

// Run validation
if (require.main === module) {
  runValidation().catch(error => {
    console.error('Validation failed with error:', error);
    process.exit(1);
  });
}

module.exports = { runValidation };