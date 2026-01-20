# Firebase Authentication Troubleshooting Guide

## Common Firebase Authentication Issues and Solutions

### 1. "Unable to detect a Project Id" Error

**Symptoms:**
- Application fails to initialize Firebase
- Error message: "Unable to detect a Project Id in the current environment"

**Solution:**
1. Run the setup script: `npm run setup-firebase`
2. Follow the instructions to configure your Firebase credentials
3. Ensure all environment variables are properly set in `.env.local`

### 2. "Invalid Credentials" Error

**Symptoms:**
- Firebase Admin SDK fails to initialize
- Error codes: `invalid_grant`, `unauthorized_client`

**Solution:**
1. Generate a new service account key from Firebase Console
2. Go to Project Settings → Service Accounts → Generate new private key
3. Download the JSON file and extract the values
4. Update `.env.local` with the new credentials
5. Restart your development server

### 3. Firestore Query Requires Index Error

**Symptoms:**
- Error message containing a URL to create composite indexes
- Queries fail with "query requires an index" error

**Solution:**
1. Click the provided URL to create the required index automatically
2. Or manually create the index in Firebase Console:
   - Go to Firestore → Indexes → Create index
   - Add the required fields with proper sort orders
   - Wait for index to finish building (usually takes a few minutes)

### 4. "No member found for this user ID" Error

**Symptoms:**
- Login succeeds but member data cannot be found
- User authentication works but profile/transaction data is missing

**Solution:**
This has been addressed with the user-member linking system:
1. The system now automatically creates missing member records during login
2. Run the fix script if you have existing data inconsistencies:
   ```bash
   npm run fix-user-member-links
   ```

### 5. Authentication Flow Issues

**Symptoms:**
- Login redirects don't work properly
- Role-based dashboard routing fails
- Session persistence problems

**Solution:**
1. Check that the auth API route (`/api/auth`) is working correctly
2. Verify role assignments in the users collection
3. Ensure cookies are being set properly in the browser
4. Check browser console for JavaScript errors

## Testing Firebase Configuration

### Run Configuration Check
```bash
npm run setup-firebase
```

### Test Firebase Connectivity
```bash
npm run test-firebase
```

### Test Authentication Flow
```bash
# Start development server
npm run dev

# Then test login through the application UI
# Or use API testing tools like Postman
```

## Environment Variables Required

Ensure your `.env.local` file contains:

```env
# Firebase Admin SDK (required for server-side operations)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key-here\n-----END PRIVATE KEY-----\n"

# Firebase Client SDK (required for frontend operations)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=app-id
```

## Firebase Console Setup Steps

1. **Create/Select Project:**
   - Go to https://console.firebase.google.com/
   - Create new project or select existing one

2. **Enable Authentication:**
   - Go to Authentication → Sign-in method
   - Enable Email/Password provider

3. **Set up Firestore:**
   - Go to Firestore Database
   - Create database in locked mode
   - Set up security rules as needed

4. **Configure Service Account:**
   - Go to Project Settings → Service Accounts
   - Generate new private key
   - Download JSON file and extract credentials

5. **Add Web App (for client SDK):**
   - Go to Project Settings → General
   - Add web app
   - Copy configuration values

## Debugging Tips

1. **Check Server Logs:**
   - Look for Firebase initialization messages
   - Monitor authentication API route calls
   - Check for error stack traces

2. **Browser Developer Tools:**
   - Check Network tab for failed API requests
   - Look at Console for JavaScript errors
   - Verify cookies are being set correctly

3. **Firestore Rules:**
   - Test with relaxed rules during development
   - Gradually tighten security as needed
   - Use Firebase Simulator for testing rules

4. **Common Gotchas:**
   - Private key must keep `\n` escape sequences
   - Environment variables are case-sensitive
   - Restart development server after configuration changes
   - Check for typos in project IDs and email addresses

## Getting Help

If you continue to have issues:

1. Check the existing documentation files:
   - `FIREBASE_SETUP_INSTRUCTIONS.md`
   - `FIX_FIREBASE_ERROR.md`
   - `FIX_ROUTE_ERROR.md`

2. Run the diagnostic scripts:
   ```bash
   npm run setup-firebase
   npm run test-firebase
   ```

3. Review recent changes to authentication code:
   - Check `lib/firebaseAdmin.ts`
   - Review `app/api/auth/route.ts`
   - Examine `lib/auth.tsx`

Remember: Firebase credentials are sensitive information. Never commit `.env.local` files to version control, and never share your private keys publicly.