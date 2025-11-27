import { adminFirestore } from "@/lib/firebaseAdmin";
import { NextResponse } from 'next/server';

// GET all loans
export async function GET() {
  try {
    console.log("Fetching all loans");
    
    const result = await adminFirestore.getCollection("loans");
    
    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || "Failed to fetch loans" 
        }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        success: true, 
        data: result.data || [],
        count: (result.data || []).length
      }, 
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching loans:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal Server Error. Please try again later." 
      }, 
      { status: 500 }
    );
  }
}

// POST - Create a new loan
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { memberId, amount, interestRate, term, startDate } = body;
    
    // Validate required fields
    if (!memberId || !amount || !interestRate || !term || !startDate) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Member ID, amount, interest rate, term, and start date are required" 
        }, 
        { status: 400 }
      );
    }
    
    // Validate numeric fields
    if (isNaN(parseFloat(amount)) || isNaN(parseFloat(interestRate)) || isNaN(parseInt(term))) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Amount, interest rate, and term must be valid numbers" 
        }, 
        { status: 400 }
      );
    }
    
    // Create loan document
    const loanData = {
      memberId,
      amount: parseFloat(amount),
      interestRate: parseFloat(interestRate),
      term: parseInt(term),
      startDate,
      status: "pending",
      createdAt: new Date().toISOString()
    };
    
    // Generate a unique loan ID
    const loanId = `loan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const setResult = await adminFirestore.setDocument("loans", loanId, loanData);
    
    if (!setResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: setResult.error || "Failed to create loan" 
        }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        success: true, 
        message: "Loan created successfully",
        data: { id: loanId, ...loanData }
      }, 
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating loan:", error);
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
      error: "Method not allowed. Use POST to create or GET to fetch loans." 
    }, 
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { 
      success: false, 
      error: "Method not allowed. Use POST to create or GET to fetch loans." 
    }, 
    { status: 405 }
  );
}