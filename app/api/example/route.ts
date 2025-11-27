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
      error: 'Database service unavailable. Please check server configuration.' 
    };
  }
}

// GET handler - Fetch example data with error-safe JSON response
export async function GET() {
  try {
    console.log("Example GET route called");
    
    // Ensure Firebase is properly initialized
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
    
    // Example Firestore query with comprehensive error handling
    console.log("Querying example collection");
    const queryResult = await adminFirestore.getCollection("example_collection");
    
    // Handle Firestore query errors - always return JSON
    if (!queryResult.success) {
      console.error("Firestore query failed:", queryResult.error);
      return NextResponse.json(
        { 
          success: false, 
          error: "Data retrieval failed. Please try again later." 
        }, 
        { status: 500 }
      );
    }
    
    // Success response - always JSON
    return NextResponse.json(
      { 
        success: true, 
        data: queryResult.data,
        count: queryResult.data?.length || 0,
        timestamp: new Date().toISOString()
      }, 
      { status: 200 }
    );
    
  } catch (error: any) {
    // Log the actual error for debugging (never expose to client)
    console.error("UNEXPECTED ERROR in GET /api/example:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Always return JSON, never HTML
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error occurred. Please try again later." 
      }, 
      { status: 500 }
    );
  }
}

// POST handler - Create example data with error-safe JSON response
export async function POST(req: Request) {
  try {
    console.log("Example POST route called");
    
    // Ensure Firebase is properly initialized
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
    
    // Parse request body with proper error handling
    let body;
    try {
      body = await req.json();
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
    
    const { name, description } = body || {};
    
    // Validate input
    if (!name) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Name is required" 
        }, 
        { status: 400 }
      );
    }
    
    // Example Firestore operation with comprehensive error handling
    const documentData = {
      name,
      description: description || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const docId = `example_${Date.now()}`;
    const setResult = await adminFirestore.setDocument("example_collection", docId, documentData);
    
    // Handle Firestore operation errors - always return JSON
    if (!setResult.success) {
      console.error("Firestore set operation failed:", setResult.error);
      return NextResponse.json(
        { 
          success: false, 
          error: "Data storage failed. Please try again later." 
        }, 
        { status: 500 }
      );
    }
    
    // Success response - always JSON
    return NextResponse.json(
      { 
        success: true, 
        message: "Data created successfully",
        data: { id: docId, ...documentData }
      }, 
      { status: 201 }
    );
    
  } catch (error: any) {
    // Log the actual error for debugging (never expose to client)
    console.error("UNEXPECTED ERROR in POST /api/example:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Always return JSON, never HTML
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error occurred. Please try again later." 
      }, 
      { status: 500 }
    );
  }
}

// Handle unsupported HTTP methods
export async function PUT() {
  return NextResponse.json(
    { 
      success: false, 
      error: "Method not allowed. Use POST to create or GET to fetch data." 
    }, 
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { 
      success: false, 
      error: "Method not allowed. Use POST to create or GET to fetch data." 
    }, 
    { status: 405 }
  );
}