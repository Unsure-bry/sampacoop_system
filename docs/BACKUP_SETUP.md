# Automated Backup System Setup Guide

This guide walks you through setting up the automated backup system using GitHub Actions and Backblaze B2.

## Overview

The automated backup system:
- **Runs automatically** via GitHub Actions (no manual intervention needed)
- **Uploads to Backblaze B2** cloud storage (off-site redundancy)
- **Supports incremental backups** (only new/changed data)
- **Runs on schedule** (daily at 11:59 PM, monthly on 1st)

## Architecture

```
GitHub Actions (Scheduler)
    ↓ (HTTP POST)
Next.js API (/api/backup/export)
    ↓ (Firestore Query)
Firebase Firestore
    ↓ (Excel + ZIP)
Backblaze B2 Cloud Storage
```

## Step 1: Set Up Backblaze B2

### 1.1 Create a Backblaze Account
1. Go to [https://www.backblaze.com/b2/cloud-storage.html](https://www.backblaze.com/b2/cloud-storage.html)
2. Sign up for an account (10GB free, then $0.005/GB/month)

### 1.2 Create a Bucket
1. Log in to Backblaze B2
2. Click "Create a Bucket"
3. Bucket Name: `sampa-coop-backups` (or your preferred name)
4. Privacy: **Private**
5. Click "Create a Bucket"

### 1.3 Get API Credentials
1. Go to "App Keys" in the left sidebar
2. Click "Create Application Key"
3. Name: `sampa-backup-key`
4. Access: **Read and Write**
5. Bucket: Select your backup bucket
6. Click "Create Application Key"
7. **IMPORTANT**: Copy and save:
   - `keyID` (this is your B2_ACCOUNT_ID)
   - `applicationKey` (this is your B2_APPLICATION_KEY)
   - `bucketId` (this is your B2_BUCKET_ID)

## Step 2: Configure GitHub Secrets

### 2.1 Add Secrets to Your Repository

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click "New repository secret"

### 2.2 Required Secrets

Add these secrets one by one:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `APP_URL` | `https://sampacoop-system.vercel.app` | Your production app URL |
| `BACKUP_API_KEY` | Generate a random string | Secret key for API authentication |
| `B2_ACCOUNT_ID` | From Step 1.3 | Backblaze B2 keyID |
| `B2_APPLICATION_KEY` | From Step 1.3 | Backblaze B2 applicationKey |
| `B2_BUCKET_ID` | From Step 1.3 | Backblaze B2 bucketId |
| `B2_BUCKET_NAME` | `sampa-coop-backups` | Your B2 bucket name |

### 2.3 Generate BACKUP_API_KEY

Generate a secure random key (at least 32 characters):

```bash
# On Linux/Mac:
openssl rand -base64 32

# Or use any random string generator
# Example: sampa-backup-2024-secure-key-xyz789
```

## Step 3: Configure Environment Variables

### 3.1 Vercel Environment Variables

Add these to your Vercel project:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add the following:

| Name | Value |
|------|-------|
| `BACKUP_API_KEY` | Same as GitHub secret |
| `B2_ACCOUNT_ID` | Same as GitHub secret |
| `B2_APPLICATION_KEY` | Same as GitHub secret |
| `B2_BUCKET_ID` | Same as GitHub secret |
| `B2_BUCKET_NAME` | Same as GitHub secret |

### 3.2 Local Development (.env.local)

For testing locally, add to `.env.local`:

```env
# Backup Configuration
BACKUP_API_KEY=your-backup-api-key-here

# Backblaze B2 Configuration
B2_ACCOUNT_ID=your-b2-key-id
B2_APPLICATION_KEY=your-b2-application-key
B2_BUCKET_ID=your-b2-bucket-id
B2_BUCKET_NAME=sampa-coop-backups
```

## Step 4: Test the Setup

### 4.1 Test API Endpoint Locally

```bash
# Start your development server
npm run dev

# Test the backup endpoint
curl -X POST http://localhost:3000/api/backup/export \
  -H "Authorization: Bearer your-backup-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "daily",
    "incremental": false
  }'
```

### 4.2 Test via GitHub Actions (Manual Trigger)

1. Go to your GitHub repository
2. Click **Actions** tab
3. Select "Automated Firestore Backup"
4. Click "Run workflow"
5. Select backup type: `daily`, `monthly`, or `full`
6. Click "Run workflow"

### 4.3 Verify Backup in Backblaze B2

1. Log in to Backblaze B2
2. Go to your bucket
3. Check for files in the `backups/` folder
4. Download and verify the ZIP file

## Backup Schedule

The system runs automatically on this schedule:

| Backup Type | Schedule | Description |
|-------------|----------|-------------|
| **Daily** | Every day at 11:59 PM UTC | Incremental (only new data) |
| **Monthly** | 1st of every month at 12:00 AM UTC | Full backup (all data) |

### Cron Schedule Explanation

```yaml
# Daily at 23:59 UTC (11:59 PM)
- cron: '59 23 * * *'

# Monthly on 1st at 00:00 UTC (12:00 AM)
- cron: '0 0 1 * *'
```

To convert to your timezone:
- **Philippines (PHT)**: UTC+8
  - Daily: 7:59 AM PHT (next day)
  - Monthly: 8:00 AM PHT on 1st

## Backup File Structure

Each backup ZIP contains:

```
sampa-backup-{type}-{date}_{time}.zip
├── metadata.json          # Backup metadata (timestamp, counts, etc.)
├── Members.xlsx          # Members data
├── Loans.xlsx            # Loans data
├── LoanRequests.xlsx     # Loan requests data
├── Savings.xlsx          # Savings data
└── Users.xlsx            # Users data
```

### metadata.json Example

```json
{
  "timestamp": "2026-04-07T20:30:00.000Z",
  "version": "1.0",
  "type": "daily",
  "incremental": true,
  "since": "2026-04-06T20:30:00.000Z",
  "recordCounts": {
    "members": 5,
    "loans": 12,
    "loanRequests": 3,
    "savings": 25,
    "users": 8
  }
}
```

## Incremental Backup Logic

The system tracks the last backup time and only fetches records modified since then:

1. **First backup**: Full backup (all data)
2. **Daily backups**: Only records with `updatedAt >= lastBackupTime`
3. **Monthly backups**: Full backup (resets the baseline)

**Note**: For incremental backups to work, your Firestore documents should have an `updatedAt` field.

## Monitoring & Notifications

### GitHub Actions Notifications

GitHub automatically sends email notifications when:
- A workflow fails
- You can configure additional notifications in repository settings

### Viewing Backup History

1. Go to **Actions** tab in GitHub
2. Select "Automated Firestore Backup"
3. View run history and logs

### Troubleshooting Failed Backups

Check the GitHub Actions logs for:
- Authentication errors (wrong API key)
- B2 upload errors (wrong credentials)
- Firestore query errors

## Security Considerations

1. **API Key**: Never commit the BACKUP_API_KEY to git
2. **B2 Credentials**: Keep application keys secure and rotate periodically
3. **Backup Files**: Stored in private B2 bucket (not publicly accessible)
4. **HTTPS Only**: All API calls use HTTPS

## Cost Estimation (Backblaze B2)

| Component | Cost |
|-----------|------|
| Storage | $0.005/GB/month |
| Download | $0.01/GB |
| Upload | Free |
| Transactions | Free up to 2,500/day |

**Example**: 100MB backup daily = ~3GB/month = **$0.015/month**

## Restoring from Backup

To restore data from a backup:

1. Download the ZIP file from Backblaze B2
2. Go to your app's **Admin** → **Backup** page
3. Click "Upload Backup"
4. Select the downloaded ZIP file
5. Confirm the restore operation

## Support

If you encounter issues:

1. Check GitHub Actions logs for error details
2. Verify all secrets are correctly configured
3. Test the API endpoint locally first
4. Check Backblaze B2 bucket permissions

## Next Steps

After setup is complete:

1. ✅ Verify first automated backup runs successfully
2. ✅ Download and test a backup file
3. ✅ Test the restore process
4. ✅ Set up monitoring/alerting for failed backups
5. ✅ Document the restore procedure for your team
