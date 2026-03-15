import { NextRequest } from 'next/server';
import { firestore } from '@/lib/firebase';
import { updatePassword } from '@/lib/passwordUtils';

export async function POST(req: NextRequest) {
  try {
    const { email, currentPassword, newPassword } = await req.json();

    // Validate input
    if (!email || !currentPassword || !newPassword) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email, current password, and new password are required' 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate password requirements (8+ chars, uppercase, lowercase, number)
    if (newPassword.length < 8) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Password must be at least 8 characters long' 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    if (!/[A-Z]/.test(newPassword)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Password must contain at least one uppercase letter' 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    if (!/[a-z]/.test(newPassword)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Password must contain at least one lowercase letter' 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    if (!/[0-9]/.test(newPassword)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Password must contain at least one number' 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Fetch user from Firestore by email to get the user ID
    const usersQuery = await firestore.queryDocuments('users', [
      { field: 'email', operator: '==', value: email }
    ]);

    if (!usersQuery.success || !usersQuery.data || usersQuery.data.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'User not found' 
        }),
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const userData = usersQuery.data[0];
    const userId = userData.id;

    // Update the password using the password utility function
    const result = await updatePassword(userId, currentPassword, newPassword);

    if (!result.success) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.error || 'Failed to update password' 
        }),
        { 
          status: 401, // Use 401 for password verification failure
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Successfully changed password
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Password changed successfully' 
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error changing password:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}