import { NextResponse } from 'next/server';

/**
 * Utility functions for consistent API error handling
 * Ensures all API responses are JSON and never HTML
 */

// Standardized success response
export function apiSuccess(data: any, status: number = 200) {
  return NextResponse.json(
    { 
      success: true, 
      ...data 
    }, 
    { status }
  );
}

// Standardized error response
export function apiError(message: string | undefined, status: number = 500) {
  // Never expose internal error details to client
  const errorMessage = message || "An unexpected error occurred. Please try again later.";
  const errorResponse = {
    success: false,
    error: status >= 500 ? "An unexpected error occurred. Please try again later." : errorMessage
  };
  
  // Log internal errors for debugging
  if (status >= 500) {
    console.error(`API Error ${status}:`, message);
  }
  
  return NextResponse.json(errorResponse, { status });
}

// Standardized validation error
export function apiValidationError(message: string | undefined) {
  return apiError(message, 400);
}

// Standardized not found error
export function apiNotFoundError(message: string | undefined = "Resource not found") {
  return apiError(message, 404);
}

// Standardized unauthorized error
export function apiUnauthorizedError(message: string | undefined = "Unauthorized access") {
  return apiError(message, 401);
}

// Standardized forbidden error
export function apiForbiddenError(message: string | undefined = "Access forbidden") {
  return apiError(message, 403);
}

// Standardized method not allowed error
export function apiMethodNotAllowed(message: string | undefined = "Method not allowed") {
  return apiError(message, 405);
}

// Ensure Firebase is initialized
export async function ensureFirebaseInitialized(adminFirestore: any) {
  try {
    if (!adminFirestore) {
      throw new Error('Firebase Admin not initialized');
    }
    return { success: true };
  } catch (error: any) {
    console.error('Firebase initialization check failed:', error);
    return { 
      success: false, 
      error: 'Service temporarily unavailable. Please try again later.' 
    };
  }
}

// Parse JSON body with error handling
export async function parseJsonBody(req: Request) {
  try {
    const body = await req.json();
    return { success: true, data: body };
  } catch (error: any) {
    return { 
      success: false, 
      error: "Invalid JSON format in request body" 
    };
  }
}

// Validate required fields
export function validateRequiredFields(obj: any, requiredFields: string[]) {
  const missingFields = requiredFields.filter(field => !obj[field]);
  if (missingFields.length > 0) {
    return {
      success: false,
      error: `Missing required fields: ${missingFields.join(', ')}`
    };
  }
  return { success: true };
}

// Validate email format
export function validateEmailFormat(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: "Invalid email format" };
  }
  return { success: true };
}