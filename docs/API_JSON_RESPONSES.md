# Ensuring JSON Responses in Next.js API Routes

This document explains how to ensure that all API routes in a Next.js application always return JSON responses, even during error conditions.

## Problem Statement

Sometimes server-side API routes return HTML error pages instead of JSON responses, causing client-side errors like:

```
"Unexpected token '<' — server returned an HTML page instead of JSON."
```

This happens when:
1. Errors are not properly caught and handled
2. Firebase initialization fails
3. Request body parsing fails
4. Database operations fail
5. Unexpected exceptions occur

## Solution Overview

We've implemented several strategies to ensure all API responses are JSON:

1. **Try/Catch Wrapping**: All route handlers are wrapped in try/catch blocks
2. **Standardized Response Functions**: Utility functions for consistent JSON responses
3. **Firebase Initialization Safety**: Robust Firebase Admin SDK initialization
4. **Request Body Parsing**: Safe JSON parsing with error handling
5. **Database Operation Handling**: Firestore operations with error handling
6. **Error Logging**: Proper server-side error logging without exposing sensitive details

## Implementation Details

### 1. Route Structure

All API routes follow this pattern:

```typescript
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // Business logic here
    
    // Always return JSON for success
    return NextResponse.json(
      { success: true, data: result },
      { status: 200 }
    );
  } catch (error: any) {
    // Log actual error for debugging
    console.error("ERROR:", error);
    
    // Always return JSON for errors
    return NextResponse.json(
      { success: false, error: "User-friendly error message" },
      { status: 500 }
    );
  }
}
```

### 2. Utility Functions

We created utility functions in [lib/apiUtils.ts](../lib/apiUtils.ts) for consistent responses:

- `apiSuccess(data, status)`: Standardized success responses
- `apiError(message, status)`: Standardized error responses
- `apiValidationError(message)`: Validation error responses
- And more for specific error types

### 3. Firebase Initialization Safety

Enhanced Firebase Admin SDK initialization in [lib/firebaseAdmin.ts](../lib/firebaseAdmin.ts):

- Tracks initialization status
- Prevents fallback to unsafe initialization modes
- Provides utility functions to check initialization status

### 4. Error Handling Best Practices

1. **Always use try/catch** around all async operations
2. **Never expose internal error details** to clients
3. **Log detailed errors** server-side for debugging
4. **Use appropriate HTTP status codes**
5. **Maintain consistent response format**

## Example Implementations

### Basic Route with Error Handling

See [app/api/example/route.ts](../app/api/example/route.ts) for a complete example.

### Authentication Route

See [app/api/auth/route.improved.ts](../app/api/auth/route.improved.ts) for an improved authentication route.

### Test Route

See [app/api/test-json/route.ts](../app/api/test-json/route.ts) for comprehensive error scenario testing.

## Testing

Use the test script [scripts/test-api-routes.js](../scripts/test-api-routes.js) to verify that all API routes return JSON responses:

```bash
node scripts/test-api-routes.js
```

## Key Improvements Made

1. **Enhanced Firebase Initialization**: Prevents fallback to unsafe modes
2. **Standardized Response Functions**: Ensures consistent JSON format
3. **Comprehensive Error Handling**: Catches all possible error scenarios
4. **TypeScript Safety**: Proper type handling to prevent runtime errors
5. **Documentation**: Clear guidelines for maintaining JSON responses

## Best Practices Checklist

- [x] All routes wrapped in try/catch
- [x] Every code path returns JSON
- [x] Firebase initialization properly checked
- [x] Request body parsing with error handling
- [x] Database operations with error handling
- [x] Proper HTTP status codes
- [x] User-friendly error messages
- [x] Detailed server-side logging
- [x] No sensitive information exposed
- [x] Consistent response format

## Common Pitfalls Avoided

1. ❌ Returning HTML error pages
2. ❌ Exposing stack traces to clients
3. ❌ Not handling Firebase initialization failures
4. ❌ Not validating request bodies
5. ❌ Not handling async errors properly
6. ❌ Inconsistent response formats

By following these patterns and using the provided utility functions, all API routes will consistently return JSON responses, preventing the "Unexpected token '<'" error on the client side.