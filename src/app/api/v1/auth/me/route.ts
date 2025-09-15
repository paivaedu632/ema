import { NextRequest } from 'next/server';
import { createSuccessResponse, errorResponse, withErrorHandling, withCors } from '@/lib/api';
import { createServerSupabaseClient } from '@/lib/supabase/server';

async function meHandler(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('No authorization token provided', 401);
    }

    const token = authHeader.substring(7);

    // Create Supabase client
    const supabase = createServerSupabaseClient();

    // Get user from token
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('Auth error:', error);
      return errorResponse('Invalid or expired token', 401);
    }

    // Return user data
    const userData = {
      userId: user.id,
      sessionId: token,
      authenticated: true,
      timestamp: new Date().toISOString(),
      email: user.email,
      emailVerified: user.email_confirmed_at !== null,
    };

    return createSuccessResponse(userData, 'User authenticated successfully');

  } catch (error) {
    console.error('Unexpected auth error:', error);
    return errorResponse('Internal server error', 500);
  }
}

export const GET = withCors(withErrorHandling(meHandler));
