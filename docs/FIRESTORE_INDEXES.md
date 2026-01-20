# Firestore Indexes Required for Loan Manager

## Overview
This document outlines the composite indexes required for the Loan Manager → Loan Requests functionality to work properly without Firestore query errors.

## Required Indexes

### 1. Pending Loan Requests Index
**Purpose**: Query pending loan requests sorted by creation date
```javascript
// Query pattern:
collection('loanRequests')
  .where('status', '==', 'pending')
  .orderBy('createdAt', 'desc')
```

**Index Configuration**:
- Collection: `loanRequests`
- Fields:
  1. `status` → ASCENDING
  2. `createdAt` → DESCENDING
  3. `__name__` → ASCENDING (for pagination)

### 2. Approved Loan Requests Index
**Purpose**: Query approved loan requests sorted by approval date
```javascript
// Query pattern:
collection('loanRequests')
  .where('status', '==', 'approved')
  .orderBy('approvedAt', 'desc')
```

**Index Configuration**:
- Collection: `loanRequests`
- Fields:
  1. `status` → ASCENDING
  2. `approvedAt` → DESCENDING
  3. `__name__` → ASCENDING (for pagination)

### 3. Rejected Loan Requests Index
**Purpose**: Query rejected loan requests sorted by rejection date
```javascript
// Query pattern:
collection('loanRequests')
  .where('status', '==', 'rejected')
  .orderBy('rejectedAt', 'desc')
```

**Index Configuration**:
- Collection: `loanRequests`
- Fields:
  1. `status` → ASCENDING
  2. `rejectedAt` → DESCENDING
  3. `__name__` → ASCENDING (for pagination)

## Deployment Instructions

### Method 1: Using Firebase Console
1. Navigate to Firebase Console → Firestore Database → Indexes
2. Click "Create index"
3. Select "Collection group" and enter `loanRequests`
4. Add the fields in the specified order with their sort directions
5. Set query scope to "Collection"
6. Click "Create"

### Method 2: Using Firebase CLI
1. Ensure you have the `firebase.indexes.json` file in your project root
2. Run: `firebase deploy --only firestore:indexes`
3. Wait for indexes to be built (usually takes a few minutes)

## Error Handling

The application includes graceful error handling for index-related errors:
- Catches `failed-precondition` errors specifically
- Displays user-friendly error messages
- Prevents UI crashes from snapshot listener failures
- Logs detailed error information for debugging

## Validation Checklist

After deploying indexes, verify that:

- [ ] Pending loan requests load without errors
- [ ] Approved requests move correctly to Loan Records
- [ ] Rejected requests display in the Rejected Loans table
- [ ] Pagination works across all loan tables (10 records per page)
- [ ] Real-time updates work properly for all status changes
- [ ] No Firestore query errors appear in the console

## Troubleshooting

### Common Issues:
1. **Index still building**: Wait for index status to show "Enabled" in Firebase Console
2. **Wrong field order**: Ensure fields are added in exact order specified
3. **Missing __name__ field**: Always include `__name__` as the last field for pagination support
4. **Query scope mismatch**: Use "Collection" scope, not "Collection group"

### Error Messages:
- `FirebaseError: [code=failed-precondition]`: Missing required composite index
- Solution: Deploy the indexes described above

## Future Considerations

When adding new query patterns to loan requests:
1. Check if existing indexes can accommodate the new query
2. Create new composite indexes if needed
3. Update this documentation
4. Test thoroughly before deployment

Last updated: January 12, 2026