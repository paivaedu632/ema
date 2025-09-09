import { NextRequest } from 'next/server';
import { withAuth, AuthenticatedUser } from '@/lib/auth/middleware';
import { createSuccessResponse, ErrorResponses, withErrorHandling } from '@/lib/api/responses';
import { withCors } from '@/lib/api/cors';
import { validateRequestBody } from '@/lib/validation/helpers';
import { pinVerifySchema } from '@/lib/validation/schemas';
import { verifyUserPin } from '@/lib/database/functions';

async function pinVerifyHandler(request: NextRequest, user: AuthenticatedUser) {
  // Validate request body
  const validation = await validateRequestBody(request, pinVerifySchema);
  if (!validation.success) {
    return ErrorResponses.validationError(validation.error!);
  }

  const { pin } = validation.data!;

  try {
    // Verify user PIN
    const result = await verifyUserPin({
      user_id: user.userId,
      pin
    });

    if (!result.success) {
      // Check if it's a PIN verification failure vs system error
      if (result.error?.includes('Invalid PIN') || result.error?.includes('incorrect')) {
        return ErrorResponses.invalidPin('Invalid PIN');
      }
      return ErrorResponses.databaseError(result.error);
    }

    const pinData = result.data as { valid?: boolean } | boolean | undefined;
    const isValid = result.data === true || (typeof pinData === 'object' && pinData?.valid === true);

    if (!isValid) {
      return ErrorResponses.invalidPin('Invalid PIN');
    }

    const responseData = {
      userId: user.userId,
      pinValid: true,
      timestamp: new Date().toISOString()
    };

    return createSuccessResponse(responseData, 'PIN verified successfully');

  } catch (error) {
    console.error('PIN verify error:', error);
    return ErrorResponses.internalError('Failed to verify PIN');
  }
}

export const POST = withCors(withErrorHandling(withAuth(pinVerifyHandler)));
