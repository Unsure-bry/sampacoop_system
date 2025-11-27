import { NextResponse } from 'next/server';
import { adminFirestore, getFirebaseInitializationStatus } from '@/lib/firebaseAdmin';
import { 
  apiSuccess, 
  apiError, 
  apiValidationError,
  ensureFirebaseInitialized,
  parseJsonBody,
  validateRequiredFields,
  validateEmailFormat
} from '@/lib/apiUtils';

/**
 * Test API Route - Demonstrates best practices for ensuring JSON responses
 * This route shows how to handle all possible error scenarios while ensuring
 * JSON responses in all cases.
 */

// GET - Test endpoint that always returns JSON
export async function GET() {
  try {
    console.log("Test GET route called");
    
    // Simulate a successful response
    return apiSuccess({
      message: "Test GET successful",
      timestamp: new Date().toISOString(),
      data: {
        test: true,
        purpose: "Demonstrate JSON response handling"
      }
    });
    
  } catch (error: any) {
    console.error("Unexpected error in GET /api/test-json:", error);
    // Even unexpected errors return JSON
    return apiError("Unexpected error occurred during test");
  }
}

// POST - Test endpoint with comprehensive validation
export async function POST(req: Request) {
  try {
    console.log("Test POST route called");
    
    // Test Firebase initialization check
    const firebaseStatus = getFirebaseInitializationStatus();
    if (!firebaseStatus.isInitialized) {
      console.log("Firebase not initialized:", firebaseStatus.initializationError);
      return apiError("Database service is not available", 503);
    }
    
    // Parse request body with error handling
    const parseResult = await parseJsonBody(req);
    if (!parseResult.success) {
      return apiValidationError(parseResult.error || 'Invalid JSON in request body');
    }
    
    const { email, name, action } = parseResult.data;
    
    // Validate required fields based on action
    if (action === 'create') {
      const validation = validateRequiredFields({ email, name }, ['email', 'name']);
      if (!validation.success) {
        return apiValidationError(validation.error || 'Required fields missing');
      }
      
      // Validate email format
      const emailValidation = validateEmailFormat(email);
      if (!emailValidation.success) {
        return apiValidationError(emailValidation.error || 'Invalid email format');
      }
    }
    
    // Simulate different actions
    switch (action) {
      case 'success':
        return apiSuccess({
          message: "Operation completed successfully",
          action: "success",
          data: { email, name }
        });
        
      case 'validation-error':
        return apiValidationError("This is a simulated validation error");
        
      case 'not-found':
        return apiError("Simulated not found error", 404);
        
      case 'unauthorized':
        return apiError("Simulated unauthorized error", 401);
        
      case 'server-error':
        return apiError("Simulated server error", 500);
        
      case 'firestore-error':
        // Simulate a Firestore error by trying to access a non-existent collection
        try {
          const result = await adminFirestore.getCollection("non_existent_collection_" + Date.now());
          if (!result.success) {
            return apiError("Simulated Firestore error: " + (result.error || "Unknown error"), 500);
          }
          return apiSuccess({ message: "Unexpected success", data: result.data });
        } catch (firestoreError: any) {
          return apiError("Simulated Firestore error: " + firestoreError.message, 500);
        }
        
      default:
        return apiSuccess({
          message: "Default test response",
          action: action || "none",
          receivedData: { email, name, action }
        });
    }
    
  } catch (error: any) {
    console.error("Unexpected error in POST /api/test-json:", {
      message: error.message,
      stack: error.stack
    });
    // Even unexpected errors return JSON
    return apiError("Unexpected error occurred during test operation");
  }
}

// Handle unsupported HTTP methods
export async function PUT() {
  return apiError("PUT method not supported on this endpoint", 405);
}

export async function DELETE() {
  return apiError("DELETE method not supported on this endpoint", 405);
}

export async function PATCH() {
  return apiError("PATCH method not supported on this endpoint", 405);
}