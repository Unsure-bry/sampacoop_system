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

// GET all members
export async function GET() {
  try {
    console.log("Fetching all members");
    
    const result = await adminFirestore.getCollection("users");
    
    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || "Failed to fetch members" 
        }, 
        { status: 500 }
      );
    }
    
    // Filter out only members (not admin users)
    const members = (result.data || []).filter((user: any) => 
      user.role && ['member', 'driver', 'operator'].includes(user.role.toLowerCase())
    );
    
    return NextResponse.json(
      { 
        success: true, 
        data: members,
        count: members.length
      }, 
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching members:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal Server Error. Please try again later." 
      }, 
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, fullName, contactNumber, role = 'member', password } = body;
    
    // Validate required fields
    if (!email || !fullName || !contactNumber) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Email, full name, and contact number are required" 
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
    
    // Check if user already exists
    const queryResult = await adminFirestore.queryDocuments("users", [
      { field: "email", operator: "==", value: email }
    ]);
    
    if (queryResult.success && queryResult.data && queryResult.data.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: "User with this email already exists" 
        }, 
        { status: 409 }
      );
    }
    
    // Create user document
    const userData: any = {
      email,
      fullName,
      contactNumber,
      role: role.toLowerCase(),
      createdAt: new Date().toISOString(),
      isPasswordSet: !!password
    };
    
    // If password is provided, hash and store it properly
    if (password) {
      const { salt, hash } = await hashPassword(password);
      userData.passwordHash = hash;
      userData.salt = salt;
    }
    
    const userId = encodeURIComponent(email.toLowerCase());
    const setResult = await adminFirestore.setDocument("users", userId, userData);
    
    if (!setResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: setResult.error || "Failed to create member" 
        }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        success: true, 
        message: "Member created successfully",
        data: { id: userId, ...userData }
      }, 
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating member:", error);
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
export async function PUT() {
  return NextResponse.json(
    { 
      success: false, 
      error: "Method not allowed. Use POST to create or GET to fetch members." 
    }, 
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { 
      success: false, 
      error: "Method not allowed. Use POST to create or GET to fetch members." 
    }, 
    { status: 405 }
  );
}