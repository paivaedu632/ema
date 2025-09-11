import { NextRequest } from 'next/server';
import { withAuth, AuthenticatedUser } from '@/lib/auth/middleware';
import { createSuccessResponse, withErrorHandling } from '@/lib/api';
import { withCors } from '@/lib/api';

async function meHandler(request: NextRequest, user: AuthenticatedUser) {
  // Get user information from Clerk
  const userData = {
    userId: user.userId,
    sessionId: user.sessionId,
    authenticated: true,
    timestamp: new Date().toISOString()
  };

  return createSuccessResponse(userData, 'User authenticated successfully');
}

export const GET = withCors(withErrorHandling(withAuth(meHandler)));
