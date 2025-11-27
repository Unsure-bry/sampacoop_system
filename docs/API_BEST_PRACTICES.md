# API Best Practices for Ensuring JSON Responses

This document outlines the best practices for creating robust API routes in Next.js that always return JSON responses, even during error conditions.

## Core Principles

1. **Always Wrap Logic in Try/Catch Blocks**
2. **Never Return HTML, Even During Failures**
3. **Use Standardized Response Functions**
4. **Log Errors Properly Without Exposing Sensitive Details**
5. **Ensure Firebase Initialization Doesn't Fall Back to HTML Errors**

## Folder Structure

```
app/
└── api/
    ├── auth/
    │   └── route.ts          # Authentication endpoints
    ├── users/
    │   └── route.ts          # User management endpoints
    ├── members/
    │   └── route.ts          # Member-specific endpoints
    └── example/
        └── route.ts          # Example implementation
```

## Implementation Patterns

### 1. Route File Template

```typescript
import { adminFirestore } from "@/lib/firebaseAdmin";
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // Your business logic here
    
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

### 2. Firebase Initialization Safety

```typescript
// Utility function to ensure Firebase is properly initialized
async function ensureFirebaseInitialized() {
  try {
    if (!adminFirestore) {
      throw new Error('Firebase Admin not initialized');
    }
    return { success: true };
  } catch (error: any) {
    console.error('Firebase initialization check failed:', error);
    return { 
      success: false, 
      error: 'Service temporarily unavailable' 
    };
  }
}
```

### 3. Request Body Parsing with Error Handling

```typescript
// Parse request body with proper error handling
let body;
try {
  body = await req.json();
} catch (parseError) {
  console.error("Failed to parse request body:", parseError);
  return NextResponse.json(
    { success: false, error: "Invalid request format. Expected JSON." },
    { status: 400 }
  );
}
```

### 4. Firestore Operations with Error Handling

```typescript
// Example Firestore query with comprehensive error handling
const queryResult = await adminFirestore.queryDocuments("users", [
  { field: "email", operator: "==", value: email }
]);

// Handle Firestore query errors - always return JSON
if (!queryResult.success) {
  console.error("Firestore query failed:", queryResult.error);
  return NextResponse.json(
    { success: false, error: "Service temporarily unavailable" },
    { status: 500 }
  );
}
```

## Error Response Standards

### HTTP Status Codes

- **200**: Success
- **201**: Created
- **400**: Bad Request (validation errors)
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **405**: Method Not Allowed
- **409**: Conflict
- **500**: Internal Server Error
- **503**: Service Unavailable

### Response Format

All responses should follow this format:

```json
{
  "success": boolean,
  "data": {}, // For successful responses
  "error": "string" // For error responses
}
```

## Utility Functions for Consistent Responses

Create reusable utility functions to ensure consistent JSON responses:

```typescript
// Standardized success response
export function apiSuccess(data: any, status: number = 200) {
  return NextResponse.json(
    { success: true, ...data },
    { status }
  );
}

// Standardized error response
export function apiError(message: string, status: number = 500) {
  // Never expose internal error details to client
  const errorResponse = {
    success: false,
    error: status >= 500 ? "An unexpected error occurred" : message
  };
  
  // Log internal errors for debugging
  if (status >= 500) {
    console.error(`API Error ${status}:`, message);
  }
  
  return NextResponse.json(errorResponse, { status });
}
```

## Client-Side Error Handling

On the client side, always handle responses appropriately:

```typescript
try {
  const response = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    // Handle HTTP error status codes
    throw new Error(data.error || 'Authentication failed');
  }
  
  // Handle successful response
  if (data.success) {
    // Process successful authentication
  } else {
    // Handle application-level errors
    throw new Error(data.error);
  }
} catch (error) {
  // Handle network errors and other exceptions
  console.error('Authentication error:', error);
}
```

## Testing Your API Routes

1. Test successful scenarios
2. Test validation errors
3. Test database errors
4. Test internal server errors
5. Verify all responses are JSON format
6. Confirm appropriate HTTP status codes

## Common Pitfalls to Avoid

1. ❌ Returning HTML error pages
2. ❌ Exposing sensitive error details to clients
3. ❌ Not handling Firebase initialization failures
4. ❌ Not validating request bodies
5. ❌ Not handling asynchronous errors properly
6. ❌ Using inconsistent response formats

## Best Practices Checklist

- [ ] All routes wrapped in try/catch blocks
- [ ] Every code path returns `NextResponse.json()`
- [ ] Firebase initialization checked before use
- [ ] Request body parsing with error handling
- [ ] Firestore operations with error handling
- [ ] Proper HTTP status codes used
- [ ] User-friendly error messages
- [ ] Detailed error logging for debugging
- [ ] Consistent response format
- [ ] No sensitive information exposed to clients