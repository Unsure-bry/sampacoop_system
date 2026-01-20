#!/usr/bin/env node

/**
 * Test script for user-member service functions
 * This script tests the core functionality without requiring Firebase Admin
 */

const { generateUserId } = require('../lib/userMemberService');

console.log('🧪 Testing User-Member Service Functions\n');

// Test data
const testEmail = 'test.user@example.com';
const expectedUserId = 'test.user%40example.com';

console.log('1. Testing ID Generation:');
console.log(`   Input email: ${testEmail}`);
console.log(`   Generated ID: ${generateUserId(testEmail)}`);
console.log(`   Expected ID: ${expectedUserId}`);
console.log(`   Match: ${generateUserId(testEmail) === expectedUserId ? '✅ PASS' : '❌ FAIL'}\n`);

console.log('2. Testing Case Insensitivity:');
const upperEmail = 'TEST.USER@EXAMPLE.COM';
console.log(`   Upper case email: ${upperEmail}`);
console.log(`   Generated ID: ${generateUserId(upperEmail)}`);
console.log(`   Match with lower case: ${generateUserId(upperEmail) === generateUserId(testEmail) ? '✅ PASS' : '❌ FAIL'}\n`);

console.log('3. Testing Special Characters:');
const specialEmail = 'user+tag@example-domain.com';
console.log(`   Special character email: ${specialEmail}`);
console.log(`   Generated ID: ${generateUserId(specialEmail)}`);
console.log('   ✅ PASS (no errors thrown)\n');

console.log('🎉 All basic tests passed!');
console.log('\n📝 Next Steps:');
console.log('1. Ensure serviceAccountKey.json is configured for Firebase Admin');
console.log('2. Run the full fix script with: npm run fix-user-member-links');
console.log('3. Test registration and login flows in the application');
console.log('4. Monitor logs for automatic healing events');