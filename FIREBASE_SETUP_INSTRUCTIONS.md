# Firebase Admin SDK Setup Instructions

## Steps to Fix the "Unable to detect a Project Id" Error

1. **Go to Firebase Console**
   - Visit https://console.firebase.google.com/
   - Select your SAMPA Coop project (or create one if it doesn't exist)

2. **Generate Service Account Key**
   - In Firebase Console, go to Project Settings (gear icon)
   - Click on the "Service Accounts" tab
   - Click "Generate new private key"
   - Click "Generate key" to download a JSON file

3. **Extract Values from the JSON File**
   Open the downloaded JSON file, it will look like this:
   ```json
   {
     "type": "service_account",
     "project_id": "your-actual-project-id",
     "private_key_id": "your-private-key-id",
     "private_key": "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n",
     "client_email": "firebase-adminsdk-uniqueid@your-project-id.iam.gserviceaccount.com",
     "client_id": "your-client-id",
     "auth_uri": "https://accounts.google.com/o/oauth2/auth",
     "token_uri": "https://oauth2.googleapis.com/token",
     "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
     "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-uniqueid%40your-project-id.iam.gserviceaccount.com"
   }
   ```

4. **Update Your .env.local File**
   Replace the placeholder values in `.env.local` with the actual values from the JSON:
   ```
   FIREBASE_PROJECT_ID=your-actual-project-id
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-uniqueid@your-project-id.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
   ```

5. **Important Notes**
   - Keep the quotes around the private key
   - Ensure `\n` characters are properly escaped in the private key
   - The entire private key should be on one line
   - Do NOT share these credentials with anyone

6. **Restart Your Development Server**
   After updating the environment variables:
   ```bash
   # Stop the current server (Ctrl+C)
   # Then start it again:
   npm run dev
   ```

7. **Test the Login**
   Try logging in again to verify the fix worked.

## Troubleshooting

If you still encounter issues:
- Double-check that all environment variables are set correctly
- Ensure there are no extra spaces or typos in the values
- Make sure you've restarted the development server after updating the environment variables
- Verify that the private key has the correct `\n` escape sequences