import { NextResponse } from 'next/server';

// POST - Send email
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { to, subject, message } = body;
    
    // Validate required fields
    if (!to || !subject || !message) {
      return NextResponse.json(
        { 
          success: false, 
          error: "To, subject, and message are required" 
        }, 
        { status: 400 }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid email format" 
        }, 
        { status: 400 }
      );
    }
    
    // In a real implementation, you would integrate with an email service here
    // For now, we'll just log the email and return success
    console.log("Sending email:", { to, subject, message });
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return NextResponse.json(
      { 
        success: true, 
        message: "Email sent successfully"
      }, 
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error sending email:", error);
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
      error: "Method not allowed. Use POST to send emails." 
    }, 
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { 
      success: false, 
      error: "Method not allowed. Use POST to send emails." 
    }, 
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { 
      success: false, 
      error: "Method not allowed. Use POST to send emails." 
    }, 
    { status: 405 }
  );
}