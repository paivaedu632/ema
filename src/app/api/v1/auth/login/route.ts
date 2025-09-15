import { NextRequest } from 'next/server';
import { createSuccessResponse, errorResponse, withErrorHandling, withCors } from '@/lib/api';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validateRequestBody } from '@/lib/validations';
import { z } from 'zod';

// Login validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

async function loginHandler(request: NextRequest) {
  try {
    // Validate request body
    const validation = await validateRequestBody(request, loginSchema);
    if (!validation.success) {
      return errorResponse(validation.error!, 400);
    }

    const { email, password } = validation.data!;

    // Create Supabase client
    const supabase = createServerSupabaseClient();

    // Attempt to sign in with email and password
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Login error:', error);
      return errorResponse(error.message, 401);
    }

    if (!data.user || !data.session) {
      return errorResponse('Login failed - no user or session returned', 401);
    }

    // Return user data and session info
    const responseData = {
      token: data.session.access_token,
      user: {
        userId: data.user.id,
        sessionId: data.session.access_token,
        authenticated: true,
        timestamp: new Date().toISOString(),
        email: data.user.email,
        emailVerified: data.user.email_confirmed_at !== null,
      }
    };

    return createSuccessResponse(responseData, 'Login successful');

  } catch (error) {
    console.error('Unexpected login error:', error);
    return errorResponse('Internal server error', 500);
  }
}

export const POST = withCors(withErrorHandling(loginHandler));
