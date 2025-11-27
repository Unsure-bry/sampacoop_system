#!/usr/bin/env node

// Script to diagnose Firebase environment variables
console.log('Firebase Environment Variables Diagnosis');
console.log('=====================================');

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
    clientEmail.includes('xxxx') || 
    clientEmail.includes('@example.com') ||
    privateKey.includes('YOUR_PRIVATE_KEY');
  
  if (hasPlaceholders) {
    console.log('⚠️  WARNING: Some variables contain placeholder values');
    console.log('   Please replace placeholder values with actual Firebase credentials');
  } else {
    console.log('✅ Environment variables appear to contain actual values');
    
    // Check private key format
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      console.log('✅ Private key is properly quoted');
    } else {
      console.log('⚠️  WARNING: Private key should be wrapped in quotes');
    }
    
    // Check for escaped newlines
    if (privateKey.includes('\\n')) {
      console.log('✅ Private key contains escaped newlines');
    } else {
      console.log('⚠️  WARNING: Private key should contain escaped newlines (\\n)');
    }
  }
} else {
  console.log('\n❌ ERROR: Some required environment variables are missing');
  console.log('   Please set all required Firebase environment variables in .env.local');
}

console.log('\nInstructions:');
console.log('1. Open .env.local file in your project root');
console.log('2. Go to Firebase Console -> Project Settings -> Service Accounts');
console.log('3. Click "Generate new private key" and download the JSON file');
console.log('4. Extract values from the JSON file:');
console.log('   - project_id -> FIREBASE_PROJECT_ID');
console.log('   - client_email -> FIREBASE_CLIENT_EMAIL');
console.log('   - private_key -> FIREBASE_PRIVATE_KEY (keep the quotes and \\n escapes)');
console.log('5. Replace the placeholder values in .env.local with your actual values');
console.log('6. Save the file and restart your development server');