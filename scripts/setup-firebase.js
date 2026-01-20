#!/usr/bin/env node

/**
 * Firebase Configuration Setup Script
 * Helps configure Firebase credentials for the SAMPA Coop application
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Firebase Configuration Setup');
console.log('================================\n');

// Check if .env.local exists
const envPath = path.join(__dirname, '..', '.env.local');
let envContent = '';

if (fs.existsSync(envPath)) {
  console.log('✅ Found existing .env.local file');
  envContent = fs.readFileSync(envPath, 'utf8');
} else {
  console.log('ℹ️  Creating new .env.local file');
  // Create basic template
  envContent = `# Firebase Admin SDK Configuration
FIREBASE_PROJECT_ID=REPLACE_WITH_YOUR_PROJECT_ID
FIREBASE_CLIENT_EMAIL=REPLACE_WITH_YOUR_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nREPLACE_WITH_YOUR_PRIVATE_KEY\\n-----END PRIVATE KEY-----\\n"

# Firebase Client SDK Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=REPLACE_WITH_YOUR_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=REPLACE_WITH_YOUR_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID=REPLACE_WITH_YOUR_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=REPLACE_WITH_YOUR_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=REPLACE_WITH_YOUR_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=REPLACE_WITH_YOUR_APP_ID
`;
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created .env.local file with placeholders');
}

// Check current configuration status
console.log('\n📋 Current Configuration Status:');
const configChecks = [
  { key: 'FIREBASE_PROJECT_ID', label: 'Project ID' },
  { key: 'FIREBASE_CLIENT_EMAIL', label: 'Client Email' },
  { key: 'FIREBASE_PRIVATE_KEY', label: 'Private Key' },
];

let needsConfiguration = false;

configChecks.forEach(check => {
  const regex = new RegExp(`${check.key}\\s*=\\s*(.+)$`, 'm');
  const match = envContent.match(regex);
  
  if (match && match[1] && !match[1].includes('REPLACE_WITH')) {
    console.log(`✅ ${check.label}: Configured`);
  } else {
    console.log(`❌ ${check.label}: Needs configuration`);
    needsConfiguration = true;
  }
});

if (needsConfiguration) {
  console.log('\n🔧 Setup Instructions:');
  console.log('1. Go to Firebase Console: https://console.firebase.google.com/');
  console.log('2. Select your project or create a new one');
  console.log('3. Go to Project Settings (gear icon) → Service Accounts');
  console.log('4. Click "Generate new private key"');
  console.log('5. Download the JSON file');
  console.log('6. Open the JSON file and copy the values:');
  console.log('   - projectId → FIREBASE_PROJECT_ID');
  console.log('   - client_email → FIREBASE_CLIENT_EMAIL');
  console.log('   - private_key → FIREBASE_PRIVATE_KEY (keep \\n characters)');
  console.log('7. Update .env.local with your actual values');
  console.log('8. Restart your development server: npm run dev');
  
  console.log('\n📝 Example of properly formatted private key:');
  console.log('FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\\n-----END PRIVATE KEY-----\\n"');
  
  console.log('\n⚠️  Important Notes:');
  console.log('- Keep the quotes around the private key');
  console.log('- Keep the \\n escape sequences (do not replace with actual newlines)');
  console.log('- The entire private key should be on one line');
  console.log('- Do NOT share these credentials with anyone');
} else {
  console.log('\n🎉 Firebase is properly configured!');
  console.log('You can now start your development server with: npm run dev');
}

console.log('\nFor additional help, refer to:');
console.log('- FIREBASE_SETUP_INSTRUCTIONS.md');
console.log('- FIX_FIREBASE_ERROR.md');
console.log('- FIX_ROUTE_ERROR.md');