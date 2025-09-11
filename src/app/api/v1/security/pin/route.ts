import { NextRequest } from 'next/server';
import { withAuth, AuthenticatedUser } from '@/lib/auth/middleware';
import { createSuccessResponse, ErrorResponses, withErrorHandling } from '@/lib/api';
import { withCors } from '@/lib/api';
import { validateRequestBody } from '@/lib/validations';
import { pinSetSchema } from '@/lib/validations';
import { setUserPin } from '@/lib/database/functions';
import { createHash } from 'crypto';

async function pinSetHandler(request: NextRequest, user: AuthenticatedUser) {
  // Validate request body
  const validation = await validateRequestBody(request, pinSetSchema);
  if (!validation.success) {
    return ErrorResponses.validationError(validation.error!);
  }

  const { pin, confirmPin } = validation.data!;

  // Double-check PIN confirmation (schema already validates this)
  if (pin !== confirmPin) {
    return ErrorResponses.validationError("PINs don't match");
  }

  try {
    // Set/update user PIN (database function handles hashing)
    const result = await setUserPin({
      user_id: user.userId,
      pin: pin
    });

    if (!result.success) {
      return ErrorResponses.databaseError(result.error);
    }

    const responseData = {
      userId: user.userId,
      pinSet: true,
      timestamp: new Date().toISOString()
    };

    return createSuccessResponse(responseData, 'PIN set successfully');

  } catch (error) {
    console.error('PIN set error:', error);
    return ErrorResponses.internalError('Failed to set PIN');
  }
}

export const POST = withCors(withErrorHandling(withAuth(pinSetHandler)));
