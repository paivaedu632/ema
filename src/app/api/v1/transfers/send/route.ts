import { NextRequest } from 'next/server';
import { withAuth, AuthenticatedUser } from '@/lib/auth/middleware';
import { createSuccessResponse, ErrorResponses, withErrorHandling } from '@/lib/api';
import { withCors } from '@/lib/api';
import { validateRequestBody } from '@/lib/validations';
import { transferSendSchema } from '@/lib/validations';
import { sendP2PTransfer } from '@/lib/database/functions';

async function transferSendHandler(request: NextRequest, user: AuthenticatedUser) {
  // Validate request body
  const validation = await validateRequestBody(request, transferSendSchema);
  if (!validation.success) {
    return ErrorResponses.validationError(validation.error!);
  }

  const { recipientId, amount, currency, pin, description } = validation.data!;

  // Send P2P transfer
  const result = await sendP2PTransfer({
    sender_id: user.userId,
    recipient_identifier: recipientId,
    currency,
    amount,
    pin,
    ...(description && { description })
  });

  if (!result.success) {
    // Handle specific error cases
    if (result.error?.includes('insufficient')) {
      return ErrorResponses.insufficientBalance(result.error);
    }
    if (result.error?.includes('PIN')) {
      return ErrorResponses.invalidPin(result.error);
    }
    if (result.error?.includes('not found')) {
      return ErrorResponses.userNotFound('Recipient not found');
    }

    return ErrorResponses.transferFailed(result.error || 'Transfer failed');
  }

  const transferData = result.data as { reference_id?: string; id?: string; status?: string } | undefined;

  const responseData = {
    transferId: transferData?.reference_id || transferData?.id,
    senderId: user.userId,
    recipientId,
    amount,
    currency,
    description,
    status: transferData?.status || 'completed',
    timestamp: new Date().toISOString(),
    transactionDetails: transferData
  };

  return createSuccessResponse(responseData, 'Transfer completed successfully');
}

export const POST = withCors(withErrorHandling(withAuth(transferSendHandler)));
