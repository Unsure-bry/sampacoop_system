import { NextResponse } from 'next/server';

// GET - Test API endpoint
export async function GET() {
  return NextResponse.json(
    { 
      success: true, 
      message: "API is working correctly",
      timestamp: new Date().toISOString()
    }, 
    { status: 200 }
  );
}

// POST - Test API endpoint
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    return NextResponse.json(
      { 
        success: true, 
        message: "POST request received successfully",
        data: body,
        timestamp: new Date().toISOString()
      }, 
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to parse request body"
      }, 
      { status: 400 }
    );
  }
}

// Handle unsupported methods
export async function PUT() {
  return NextResponse.json(
    { 
      success: false, 
      error: "Method not allowed. Use GET or POST for testing." 
    }, 
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { 
      success: false, 
      error: "Method not allowed. Use GET or POST for testing." 
    }, 
    { status: 405 }
  );
}