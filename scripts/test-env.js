#!/usr/bin/env node

// Simple test to check if environment variables are loaded
console.log('Testing environment variable loading...');

// Load dotenv manually to see if it helps
require('dotenv').config({ path: '.env.local' });

console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);
console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL);
console.log('FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? 'SET' : 'NOT SET');