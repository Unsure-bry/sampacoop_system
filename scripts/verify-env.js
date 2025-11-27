#!/usr/bin/env node

// Script to verify Firebase environment variables are set correctly
console.log('Firebase Environment Variables Verification');
console.log('========================================');

// Check environment variables
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

console.log('\nEnvironment Variables Status:');
console.log('FIREBASE_PROJECT_ID:', projectId ? 'SET' : 'MISSING');
console.log('FIREBASE_CLIENT_EMAIL:', clientEmail ? 'SET' : 'MISSING');
console.log('FIREBASE_PRIVATE_KEY:', privateKey ? 'SET' : 'MISSING');

if (projectId && clientEmail && privateKey) {
  console.log('\n✅ All required environment variables are set');
  
  // Check for placeholder values
  const hasPlaceholders = 
    projectId.includes('your-') || 
    clientEmail.includes('your-') || 
    clientEmail.includes('@example.com') ||
    privateKey.includes('YOUR_PRIVATE_KEY');
    
  if (hasPlaceholders) {
    console.log('⚠️  Warning: Placeholder values detected. Please update with real values.');
    console.log('   - FIREBASE_PROJECT_ID:', projectId);
    console.log('   - FIREBASE_CLIENT_EMAIL:', clientEmail);
    console.log('   - FIREBASE_PRIVATE_KEY length:', privateKey.length);
  } else {
    console.log('✅ Environment variables appear to have real values');
    console.log('   - Project ID:', projectId);
    console.log('   - Client Email:', clientEmail);
    console.log('   - Private Key length:', privateKey.length);
  }
} else {
  console.log('\n❌ Missing required environment variables');
  console.log('Please set the following in your .env.local file:');
  if (!projectId) console.log('  - FIREBASE_PROJECT_ID');
  if (!clientEmail) console.log('  - FIREBASE_CLIENT_EMAIL');
  if (!privateKey) console.log('  - FIREBASE_PRIVATE_KEY');
}

console.log('\nNext steps:');
console.log('1. Update .env.local with your actual Firebase credentials');
console.log('2. Restart your development server with: npm run dev');