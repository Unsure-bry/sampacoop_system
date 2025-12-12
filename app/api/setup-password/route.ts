import { adminFirestore } from "@/lib/firebaseAdmin";
import { NextResponse } from 'next/server';
import * as crypto from 'crypto';

// Utility function to create salt and hash password
async function hashPassword(password: string): Promise<{ salt: string; hash: string }> {
  // Create salt
  const salt = crypto.randomBytes(16);
  
  // Hash password with salt using PBKDF2
  const hash = await new Promise<Buffer>((resolve, reject) => {
    crypto.pbkdf2(password, salt, 100000, 32, 'sha256', (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
  
  // Convert to base64 for storage
  return {
    salt: salt.toString('base64'),
    hash: hash.toString('base64')
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;
    
    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Email and password are required" 
        }, 
        { status: 400 }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid email format" 
        }, 
        { status: 400 }
      );
    }
    
    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Password must be at least 8 characters long" 
        }, 
        { status: 400 }
      );
    }
    
    // Query Firestore for user
    const queryResult = await adminFirestore.queryDocuments("users", [
      { field: "email", operator: "==", value: email }
    ]);
    
    // Handle query errors
    if (!queryResult.success) {
      console.error("Firestore query failed:", queryResult.error);
      return NextResponse.json(
        { 
          success: false, 
          error: "Database query failed" 
        }, 
        { status: 500 }
      );
    }
    
    // Check if user exists
    if (!queryResult.data || queryResult.data.length === 0) {
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
    
    // Check if password is already set
    if (userData.isPasswordSet) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Password already set for this account" 
        }, 
        { status: 400 }
      );
    }
    
    // Hash the new password
    const { salt, hash } = await hashPassword(password);
    
    // Update user document with password hash and set isPasswordSet to true
    const updateResult = await adminFirestore.updateDocument("users", userDoc.id, {
      passwordHash: hash,
      salt: salt,
      isPasswordSet: true,
      updatedAt: new Date().toISOString()
    });
    
    // Handle update errors
    if (!updateResult.success) {
      console.error("Failed to update user document:", updateResult.error);
      return NextResponse.json(
        { 
          success: false, 
          error: "Failed to set password" 
        }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        success: true, 
        message: "Password set successfully"
      }, 
      { status: 200 }
    );
  } catch (error: any) {
    console.error("SETUP PASSWORD ERROR:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal Server Error. Please try again later." 
      }, 
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { 
      success: false, 
      error: "Method not allowed. Use POST to set up password." 
    }, 
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { 
      success: false, 
      error: "Method not allowed. Use POST to set up password." 
    }, 
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { 
      success: false, 
      error: "Method not allowed. Use POST to set up password." 
    }, 
    { status: 405 }
  );
}