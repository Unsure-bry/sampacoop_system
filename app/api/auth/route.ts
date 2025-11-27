import { adminFirestore } from "@/lib/firebaseAdmin";
import { NextResponse } from 'next/server';

// Ensure all responses are JSON
export async function POST(req: Request) {
  try {
    console.log("Login route called");
    
    // Parse request body with proper error handling
    let body;
    try {
      body = await req.json();
      console.log("Request body parsed:", { email: body.email });
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid request format. Expected JSON." 
        }, 
        { status: 400 }
      );
    }
    
    const { email, password } = body || {};

    // Validate input
    if (!email || !password) {
      console.log("Missing email or password");
      return NextResponse.json(
        { 
          success: false, 
          error: "Missing email or password" 
        }, 
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log("Invalid email format:", email);
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid email format" 
        }, 
        { status: 400 }
      );
    }

    // Query Firestore for user using the improved utility function
    console.log("Querying Firestore for user with email:", email);
    const queryResult = await adminFirestore.queryDocuments("users", [
      { field: "email", operator: "==", value: email }
    ]);

    // Handle query errors - always return JSON
    if (!queryResult.success) {
      console.error("Firestore query failed:", queryResult.error);
      return NextResponse.json(
        { 
          success: false, 
          error: queryResult.error || "Database query failed" 
        }, 
        { status: 500 }
      );
    }

    // Check if user exists
    if (!queryResult.data || queryResult.data.length === 0) {
      console.log("Account not found for email:", email);
      return NextResponse.json(
        { 
          success: false, 
          error: "Account not found" 
        }, 
        { status: 404 }
      );
    }

    const userDoc = queryResult.data[0];
    const userData: any = userDoc;

    // Validate password (simple comparison for now, in production use proper hashing)
    if (userData.password !== password) {
      console.log("Incorrect password for user:", email);
      return NextResponse.json(
        { 
          success: false, 
          error: "Incorrect password" 
        }, 
        { status: 401 }
      );
    }

    // Validate that user has a role
    if (!userData.role) {
      console.log("User role not assigned for user:", email);
      return NextResponse.json(
        { 
          success: false, 
          error: "User role not assigned" 
        }, 
        { status: 400 }
      );
    }

    // Create user object for response
    const user = {
      uid: userDoc.id,
      email: userData.email,
      displayName: userData.displayName || null,
      role: userData.role,
      lastLogin: userData.lastLogin || null
    };

    console.log("Login successful for user:", user.email, "with role:", user.role);

    // Update last login timestamp
    try {
      console.log("Updating last login for user:", user.uid);
      const updateResult = await adminFirestore.updateDocument("users", user.uid, {
        lastLogin: new Date().toISOString()
      });
      
      if (!updateResult.success) {
        console.error("Failed to update last login:", updateResult.error);
      } else {
        console.log("Last login updated successfully for user:", user.uid);
      }
    } catch (updateError: any) {
      console.error("Failed to update last login:", updateError);
      // Don't fail the login if we can't update lastLogin
    }

    // Always return JSON success response
    return NextResponse.json(
      { 
        success: true, 
        user: user,
        role: user.role 
      }, 
      { status: 200 }
    );

  } catch (error: any) {
    // Catch any unexpected errors and return JSON
    console.error("LOGIN ERROR:", error);
    console.error("Error stack:", error.stack);
    
    // Always return JSON, never HTML
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal Server Error. Please try again later." 
      }, 
      { status: 500 }
    );
  }
}

// Handle other HTTP methods by returning JSON error
export async function GET() {
  return NextResponse.json(
    { 
      success: false, 
      error: "Method not allowed. Use POST to login." 
    }, 
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { 
      success: false, 
      error: "Method not allowed. Use POST to login." 
    }, 
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { 
      success: false, 
      error: "Method not allowed. Use POST to login." 
    }, 
    { status: 405 }
  );
}