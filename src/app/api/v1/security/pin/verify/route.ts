import { NextRequest } from 'next/server';
import { withAuth, AuthenticatedUser } from '@/lib/auth/middleware';
import { createSuccessResponse, ErrorResponses, withErrorHandling } from '@/lib/api';
import { withCors } from '@/lib/api';
import { validateRequestBody } from '@/lib/validations';
import { pinVerifySchema } from '@/lib/validations';
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
      return ErrorResponses.databaseError(result.error || 'Database operation failed');
    }

    // Parse the JSON response from the database function
    const pinData = result.data as { valid: boolean; locked: boolean; attempts_remaining: number; message: string };

    if (!pinData.valid) {
      if (pinData.locked) {
        return ErrorResponses.invalidPin(pinData.message);
      }
      return ErrorResponses.invalidPin(pinData.message);
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
