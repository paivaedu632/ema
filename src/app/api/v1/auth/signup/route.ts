import { NextRequest } from 'next/server';
import { createSuccessResponse, errorResponse, withErrorHandling, withCors } from '@/lib/api';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validateRequestBody } from '@/lib/validations';
import { z } from 'zod';

// Signup validation schema
const signupSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

async function signupHandler(request: NextRequest) {
  try {
    // Validate request body
    const validation = await validateRequestBody(request, signupSchema);
    if (!validation.success) {
      return errorResponse(validation.error!, 400);
    }

    const { email, password, firstName, lastName } = validation.data!;

    // Create Supabase client
    const supabase = createServerSupabaseClient();

    // Attempt to sign up with email and password
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          full_name: firstName && lastName ? `${firstName} ${lastName}` : undefined,
        }
      }
    });

    if (error) {
      console.error('Signup error:', error);
      return errorResponse(error.message, 400);
    }

    if (!data.user) {
      return errorResponse('Signup failed - no user returned', 400);
    }

    // Check if user needs email confirmation
    if (!data.session) {
      return createSuccessResponse({
        userId: data.user.id,
        email: data.user.email,
        emailConfirmationRequired: true,
        message: 'Please check your email for confirmation link'
      }, 'Signup successful - email confirmation required');
    }

    // User is immediately signed in (email confirmation disabled)
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

    return createSuccessResponse(responseData, 'Signup successful');

  } catch (error) {
    console.error('Unexpected signup error:', error);
    return errorResponse('Internal server error', 500);
  }
}

export const POST = withCors(withErrorHandling(signupHandler));
