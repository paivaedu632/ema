import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export interface AuthenticatedUser {
  userId: string;
  sessionId: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
}

// Initialize Supabase client for server-side auth validation
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Authenticate a request using Supabase Auth JWT validation
 */
export async function authenticateRequest(request?: NextRequest): Promise<AuthResult> {
  try {
    if (!request) {
      return {
        success: false,
        error: 'Request object required for authentication'
      };
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'Authorization header missing or invalid'
      };
    }

    const token = authHeader.substring(7);

    try {
      // Create a temporary client with the user's token to validate it
      const userSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );

      // Verify JWT by attempting to get user with the token
      const { data: { user }, error } = await userSupabase.auth.getUser();

      if (error || !user) {
        console.error('Supabase auth error:', error);
        return {
          success: false,
          error: 'Invalid or expired token'
        };
      }

      // Decode the JWT to extract session information
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
      const sessionId = payload.session_id || payload.sid || `session_${payload.jti}`;

      return {
        success: true,
        user: {
          userId: user.id,
          sessionId: sessionId
        }
      };
    } catch (tokenError) {
      console.error('JWT validation failed:', tokenError);
      return {
        success: false,
        error: 'Token validation failed'
      };
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: 'Authentication service error'
    };
  }
}

/**
 * Create an authentication error response
 */
export function createAuthErrorResponse(message: string = 'Authentication required') {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: 'AUTH_REQUIRED'
    },
    { status: 401 }
  );
}

/**
 * Middleware wrapper for protected API routes
 */
export function withAuth<T extends unknown[]>(
  handler: (request: NextRequest, user: AuthenticatedUser, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const authResult = await authenticateRequest(request);

    if (!authResult.success || !authResult.user) {
      return createAuthErrorResponse(authResult.error);
    }

    return handler(request, authResult.user, ...args);
  };
}
