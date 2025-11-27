import { adminFirestore } from "@/lib/firebaseAdmin";
import { NextResponse } from 'next/server';

// Utility function to ensure Firebase is properly initialized
async function ensureFirebaseInitialized() {
  try {
    // This will throw if Firebase isn't properly initialized
    if (!adminFirestore) {
      throw new Error('Firebase Admin not initialized');
    }
    return { success: true };
  } catch (error: any) {
    console.error('Firebase initialization check failed:', error);
    return { 
      success: false, 
      error: 'Authentication service temporarily unavailable. Please try again later.' 
    };
  }
}

// POST handler for login with comprehensive error handling
export async function POST(req: Request) {
  try {
    console.log("=== AUTH LOGIN ROUTE CALLED ===");
    
    // Ensure Firebase is properly initialized before proceeding
    const firebaseCheck = await ensureFirebaseInitialized();
    if (!firebaseCheck.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: firebaseCheck.error 
        }, 
        { status: 503 }
      );
    }
    
    // Parse request body with comprehensive error handling
    let body;
    try {
      body = await req.json();
      console.log("Request body parsed successfully");
    } catch (parseError: any) {
      console.error("Failed to parse request body:", parseError.message);
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid request format. Expected JSON payload." 
        }, 
        { status: 400 }
      );
    }
    
    const { email, password } = body || {};
    console.log("Processing login for email:", email ? `${email.substring(0, 3)}***@***.com` : 'undefined');

    // Validate input presence
    if (!email || !password) {
      console.log("Missing required fields - email:", !!email, "password:", !!password);
      return NextResponse.json(
        { 
          success: false, 
          error: "Both email and password are required for authentication" 
        }, 
        { status: 400 }
      );
    }

    // Validate email format with comprehensive regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log("Invalid email format provided");
      return NextResponse.json(
        { 
          success: false, 
          error: "Please provide a valid email address format" 
        }, 
        { status: 400 }
      );
    }

    // Query Firestore for user with comprehensive error handling
    console.log("Querying Firestore for user:", email);
    const queryResult = await adminFirestore.queryDocuments("users", [
      { field: "email", operator: "==", value: email }
    ]);

    // Handle Firestore query errors - always return JSON
    if (!queryResult.success) {
      console.error("Firestore query failed:", queryResult.error);
      return NextResponse.json(
        { 
          success: false, 
          error: "Authentication service temporarily unavailable. Please try again later." 
        }, 
        { status: 500 }
      );
    }

    // Check if user exists
    if (!queryResult.data || queryResult.data.length === 0) {
      console.log("No account found for email:", email);
      // Security: Generic error message to prevent user enumeration
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid credentials provided" 
        }, 
        { status: 401 }
      );
    }

    const userDoc = queryResult.data[0];
    const userData: any = userDoc;

    // Validate password (in production, use proper hashing)
    if (userData.password !== password) {
      console.log("Incorrect password for user:", email);
      // Security: Generic error message to prevent user enumeration
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid credentials provided" 
        }, 
        { status: 401 }
      );
    }

    // Validate that user has a role assigned
    if (!userData.role) {
      console.log("User role not assigned for user:", email);
      return NextResponse.json(
        { 
          success: false, 
          error: "Account configuration error. Please contact administrator." 
        }, 
        { status: 400 }
      );
    }

    // Create sanitized user object for response
    const user = {
      uid: userDoc.id,
      email: userData.email,
      displayName: userData.displayName || null,
      role: userData.role,
      lastLogin: userData.lastLogin || null
    };

    console.log("Login successful for user:", user.email, "with role:", user.role);

    // Update last login timestamp (non-blocking)
    try {
      console.log("Updating last login timestamp for user:", user.uid);
      const updateResult = await adminFirestore.updateDocument("users", user.uid, {
        lastLogin: new Date().toISOString()
      });
      
      if (!updateResult.success) {
        console.error("Failed to update last login timestamp:", updateResult.error);
        // Note: We don't fail the login if we can't update the timestamp
      } else {
        console.log("Last login timestamp updated successfully for user:", user.uid);
      }
    } catch (updateError: any) {
      console.error("Non-critical error updating last login:", updateError.message);
      // Don't fail the login if we can't update lastLogin
    }

    // Always return JSON success response
    return NextResponse.json(
      { 
        success: true, 
        user: user,
        role: user.role,
        message: "Authentication successful"
      }, 
      { status: 200 }
    );

  } catch (error: any) {
    // Log the complete error for debugging (never expose to client)
    console.error("=== UNEXPECTED AUTHENTICATION ERROR ===");
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    // Always return JSON, never HTML - even for unexpected errors
    return NextResponse.json(
      { 
        success: false, 
        error: "Authentication service encountered an unexpected error. Please try again later." 
      }, 
      { status: 500 }
    );
  }
}

// Handle other HTTP methods with proper JSON responses
export async function GET() {
  return NextResponse.json(
    { 
      success: false, 
      error: "Method not allowed. Use POST method for authentication." 
    }, 
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { 
      success: false, 
      error: "Method not allowed. Use POST method for authentication." 
    }, 
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { 
      success: false, 
      error: "Method not allowed. Use POST method for authentication." 
    }, 
    { status: 405 }
  );
}