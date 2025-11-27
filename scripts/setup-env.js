#!/usr/bin/env node

// Script to help set up Firebase environment variables
const fs = require('fs');
const path = require('path');

console.log('Firebase Environment Setup Helper');
console.log('================================');

// Check if .env.local exists
const envLocalPath = path.join(__dirname, '..', '.env.local');
const envExamplePath = path.join(__dirname, '..', '.env.local.example');

if (!fs.existsSync(envLocalPath)) {
  console.log('\n.env.local file not found. Creating from example...');
  
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envLocalPath);
    console.log('Created .env.local from .env.local.example');
  } else {
    // Create a basic template
    const template = `# Firebase Admin SDK Credentials
# Replace these with your actual Firebase Admin SDK credentials

FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\\\nYOURKEYLINES\\\\n-----END PRIVATE KEY-----\\\\n"

# IMPORTANT:
# If your private key has line breaks, convert them to \\\\n or the server will crash.
# The private key should be in one line with \\\\n characters instead of actual line breaks.
`;
    fs.writeFileSync(envLocalPath, template);
    console.log('Created basic .env.local template');
  }
}

console.log('\nTo set up your Firebase credentials:');
console.log('1. Go to Firebase Console (https://console.firebase.google.com/)');
console.log('2. Select your project or create a new one');
console.log('3. Go to Project Settings -> Service Accounts');
console.log('4. Click "Generate new private key"');
console.log('5. Download the JSON file');
console.log('6. Open the JSON file and copy the values:');
console.log('   - projectId -> FIREBASE_PROJECT_ID');
console.log('   - client_email -> FIREBASE_CLIENT_EMAIL');
console.log('   - private_key -> FIREBASE_PRIVATE_KEY (replace line breaks with \\n)');
console.log('7. Update .env.local with your actual values');
console.log('8. Restart your development server');

console.log('\nExample of a properly formatted private key:');
console.log('FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\\\\n-----END PRIVATE KEY-----\\\\n"');

console.log('\nAfter updating .env.local, restart your development server with:');
console.log('npm run dev');