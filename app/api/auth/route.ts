import { adminFirestore } from "@/lib/firebaseAdmin";
import { NextResponse } from 'next/server';

// Timing-safe string comparison utility
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

// Utility function to verify hashed password
async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  try {
    // Import crypto module dynamically for server-side only
    const crypto = await import('crypto');
    
    // Convert base64 salt back to buffer
    const saltBuffer = Buffer.from(salt, 'base64');
    
    // Derive key using PBKDF2
    const derivedKey = await new Promise<Buffer>((resolve, reject) => {
      crypto.pbkdf2(password, saltBuffer, 100000, 32, 'sha256', (err, key) => {
        if (err) reject(err);
        else resolve(key);
      });
    });
    
    // Convert derived key to base64 for comparison
    const derivedKeyB64 = derivedKey.toString('base64');
    
    // Use timing-safe comparison
    return timingSafeEqual(derivedKeyB64, hash);
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

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

    // Check if password is set
    if (!userData.isPasswordSet) {
      console.log("Account exists but password not set for user:", email);
      // Instead of just returning an error, indicate that password setup is needed
      return NextResponse.json(
        { 
          success: false, 
          error: "Account exists but no password set. Please complete sign-up.",
          needsPasswordSetup: true
        }, 
        { status: 400 }
      );
    }

    // Validate password - check both hashed and plain text for backward compatibility
    let isValidPassword = false;
    
    // Check if we have a password hash (newer format)
    if (userData.passwordHash && userData.salt) {
      isValidPassword = await verifyPassword(password, userData.passwordHash, userData.salt);
    } 
    // Fallback to plain text comparison for older accounts (not recommended for production)
    else if (userData.password) {
      isValidPassword = timingSafeEqual(password, userData.password);
    }

    if (!isValidPassword) {
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
          error: "User role not assigned. Please contact administrator." 
        }, 
        { status: 400 }
      );
    }

    // Validate that user role is valid
    const validRoles = [
      'admin', 'secretary', 'chairman', 'vice chairman', 'manager', 
      'treasurer', 'board of directors', 'member', 'driver', 'operator'
    ];
    const normalizedRole = userData.role.toLowerCase().trim();
    if (!validRoles.includes(normalizedRole)) {
      console.log("Invalid user role for user:", email, "Role:", userData.role);
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid user role: ${userData.role}. Please contact administrator.` 
        }, 
        { status: 400 }
      );
    }

    // Create user object for response
    const user = {
      uid: userDoc.id,
      email: userData.email,
      displayName: userData.displayName || null,
      role: userData.role, // Return the original role as stored in DB
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
        role: user.role // Include role in response for client-side routing
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