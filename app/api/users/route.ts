import { adminFirestore } from "@/lib/firebaseAdmin";
import { 
  apiSuccess, 
  apiError, 
  apiValidationError, 
  apiNotFoundError,
  ensureFirebaseInitialized,
  parseJsonBody,
  validateRequiredFields,
  validateEmailFormat
} from "@/lib/apiUtils";

/**
 * Users API Route
 * Demonstrates best practices for ensuring JSON responses in all scenarios
 */

// GET - Fetch all users
export async function GET() {
  try {
    console.log("GET /api/users called");
    
    // Ensure Firebase is properly initialized
    const firebaseCheck = await ensureFirebaseInitialized(adminFirestore);
    if (!firebaseCheck.success) {
      return apiError(firebaseCheck.error || 'Service unavailable', 503);
    }
    
    // Query Firestore for all users
    const result = await adminFirestore.getCollection("users");
    
    if (!result.success) {
      return apiError("Failed to fetch users. Please try again later.", 500);
    }
    
    // Return success response with users data
    return apiSuccess({
      data: result.data || [],
      count: (result.data || []).length
    });
    
  } catch (error: any) {
    console.error("Unexpected error in GET /api/users:", error);
    return apiError("An unexpected error occurred while fetching users.");
  }
}

// POST - Create a new user
export async function POST(req: Request) {
  try {
    console.log("POST /api/users called");
    
    // Ensure Firebase is properly initialized
    const firebaseCheck = await ensureFirebaseInitialized(adminFirestore);
    if (!firebaseCheck.success) {
      return apiError(firebaseCheck.error || 'Service unavailable', 503);
    }
    
    // Parse request body
    const parseResult = await parseJsonBody(req);
    if (!parseResult.success) {
      return apiValidationError(parseResult.error || 'Invalid request data');
    }
    
    const { email, fullName, role } = parseResult.data;
    
    // Validate required fields
    const validation = validateRequiredFields({ email, fullName }, ['email', 'fullName']);
    if (!validation.success) {
      return apiValidationError(validation.error || 'Validation failed');
    }
    
    // Validate email format
    const emailValidation = validateEmailFormat(email);
    if (!emailValidation.success) {
      return apiValidationError(emailValidation.error || 'Invalid email format');
    }
    
    // Check if user already exists
    const queryResult = await adminFirestore.queryDocuments("users", [
      { field: "email", operator: "==", value: email }
    ]);
    
    if (!queryResult.success) {
      return apiError("Failed to check if user exists. Please try again later.", 500);
    }
    
    if (queryResult.data && queryResult.data.length > 0) {
      return apiError("User with this email already exists.", 409);
    }
    
    // Create user document
    const userData = {
      email,
      fullName,
      role: role || 'member',
      createdAt: new Date().toISOString()
    };
    
    const userId = encodeURIComponent(email.toLowerCase());
    const setResult = await adminFirestore.setDocument("users", userId, userData);
    
    if (!setResult.success) {
      return apiError("Failed to create user. Please try again later.", 500);
    }
    
    // Return success response
    return apiSuccess({
      message: "User created successfully",
      data: { id: userId, ...userData }
    }, 201);
    
  } catch (error: any) {
    console.error("Unexpected error in POST /api/users:", error);
    return apiError("An unexpected error occurred while creating user.");
  }
}

// Handle unsupported methods
export async function PUT() {
  return apiError("PUT method not supported. Use POST to create or GET to fetch users.", 405);
}

export async function DELETE() {
  return apiError("DELETE method not supported. Use POST to create or GET to fetch users.", 405);
}