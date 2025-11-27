# How to Fix the "Unable to detect a Project Id" Error

## Current Issue
The Firebase Admin SDK cannot initialize because it's using placeholder values instead of actual Firebase credentials.

## Solution Steps

### Step 1: Get Your Firebase Credentials

1. Go to the Firebase Console: https://console.firebase.google.com/
2. Select your SAMPA Coop project (or create one if it doesn't exist)
3. Click the gear icon (Project Settings)
4. Go to the "Service Accounts" tab
5. Click "Generate new private key"
6. Click "Generate key" to download a JSON file
7. Save this file - you'll need the values from it

### Step 2: Update Your Environment Variables

Open the `.env.local` file in your project and replace the placeholder values:

**Before (placeholder values):**
```
FIREBASE_PROJECT_ID=REPLACE_WITH_YOUR_ACTUAL_PROJECT_ID
FIREBASE_CLIENT_EMAIL=REPLACE_WITH_YOUR_SERVICE_ACCOUNT_EMAIL
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nREPLACE_WITH_YOUR_ACTUAL_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
```

**After (with actual values from your JSON file):**
```
FIREBASE_PROJECT_ID=your-actual-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-uniqueid@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7...\n-----END PRIVATE KEY-----\n"
```

### Step 3: Important Notes for the Private Key

1. **Keep the quotes** around the private key value
2. **Keep the \n escapes** - do not replace them with actual newlines
3. **The entire private key should be on one line**
4. **Example format:**
   ```
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7...\n-----END PRIVATE KEY-----\n"
   ```

### Step 4: Restart Your Development Server

1. Stop the current server (Ctrl+C in the terminal)
2. Start it again:
   ```bash
   npm run dev
   ```

### Step 5: Verify the Fix

You can check if your configuration is correct by visiting:
http://localhost:3000/api/firebase-config-check

If everything is set up correctly, you should see:
```json
{
  "isConfigured": true,
  "isUsingPlaceholders": false
}
```

## Common Issues and Troubleshooting

1. **Still getting "Unable to detect a Project Id" error:**
   - Double-check that you've replaced ALL placeholder values
   - Ensure the private key has proper \n escape sequences
   - Make sure you've restarted the development server

2. **Invalid private key format:**
   - Make sure the private key starts with `-----BEGIN PRIVATE KEY-----`
   - Make sure it ends with `-----END PRIVATE KEY-----`
   - Keep all the \n escape sequences intact

3. **Invalid project ID:**
   - Make sure the project ID matches your Firebase project
   - It should not contain spaces or special characters

## Need Help?

If you're still having issues:
1. Check the detailed instructions in `FIREBASE_SETUP_INSTRUCTIONS.md`
2. Verify your Firebase project exists and is properly configured
3. Make sure you're using the correct service account credentials