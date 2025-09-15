import { NextRequest } from 'next/server';
import { withAuth, AuthenticatedUser } from '@/lib/auth/middleware';
import { createSuccessResponse, ErrorResponses, withErrorHandling } from '@/lib/api';
import { withCors } from '@/lib/api';
import { validateSearchParams } from '@/lib/validations';
import { userSearchSchema } from '@/lib/validations';
import { findUserForTransfer } from '@/lib/database/functions';

async function userSearchHandler(request: NextRequest, user: AuthenticatedUser) {
  // Validate search parameters
  const { searchParams } = new URL(request.url);
  const validation = validateSearchParams(searchParams, userSearchSchema);
  if (!validation.success) {
    return ErrorResponses.validationError(validation.error!);
  }

  const { query } = validation.data!;

  // Search for users using the correct function signature
  const result = await findUserForTransfer({
    p_identifier: query
  });

  if (!result.success) {
    return ErrorResponses.databaseError(result.error || 'Database operation failed');
  }

  // Filter out sensitive information and current user
  const users = Array.isArray(result.data) ? result.data : [];
  const filteredUsers = users
    .filter((foundUser: { user_id: string }) => foundUser.user_id !== user.userId)
    .map((foundUser: { user_id: string; email: string; phone?: string; full_name?: string; identifier_type: string }) => ({
      id: foundUser.user_id,
      email: foundUser.email,
      phone: foundUser.phone,
      fullName: foundUser.full_name,
      identifierType: foundUser.identifier_type
    }));

  return createSuccessResponse(filteredUsers, 'Users found successfully');
}

export const GET = withCors(withErrorHandling(withAuth(userSearchHandler)));
