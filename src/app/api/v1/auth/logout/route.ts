import { NextRequest } from 'next/server';
import { createSuccessResponse, errorResponse, withErrorHandling, withCors } from '@/lib/api';
import { createServerSupabaseClient } from '@/lib/supabase/server';

async function logoutHandler(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('No authorization token provided', 401);
    }

    const token = authHeader.substring(7);

    // Create Supabase client
    const supabase = createServerSupabaseClient();

    // Set the session for this request
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: token,
      refresh_token: '', // We don't have refresh token in this context
    });

    if (sessionError) {
      console.warn('Session error during logout:', sessionError);
      // Continue with logout even if session setting fails
    }

    // Sign out the user
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout error:', error);
      return errorResponse(error.message, 400);
    }

    return createSuccessResponse(
      { 
        message: 'Logged out successfully',
        timestamp: new Date().toISOString()
      }, 
      'Logout successful'
    );

  } catch (error) {
    console.error('Unexpected logout error:', error);
    return errorResponse('Internal server error', 500);
  }
}

export const POST = withCors(withErrorHandling(logoutHandler));
