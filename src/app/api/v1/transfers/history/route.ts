import { NextRequest } from 'next/server';
import { withAuth, AuthenticatedUser } from '@/lib/auth/middleware';
import { createSuccessResponse, ErrorResponses, withErrorHandling } from '@/lib/api';
import { withCors } from '@/lib/api';
import { validateSearchParams } from '@/lib/validations';
import { transferHistorySchema } from '@/lib/validations';
import { getTransferHistory } from '@/lib/database/functions';

async function transferHistoryHandler(request: NextRequest, user: AuthenticatedUser) {
  // Validate search parameters
  const { searchParams } = new URL(request.url);
  const validation = validateSearchParams(searchParams, transferHistorySchema);
  if (!validation.success) {
    return ErrorResponses.validationError(validation.error!);
  }

  const { page = 1, limit = 20, currency } = validation.data!;

  // Get transfer history
  const result = await getTransferHistory({
    user_id: user.userId,
    page,
    limit,
    ...(currency && { currency })
  });

  if (!result.success) {
    return ErrorResponses.databaseError(result.error || 'Database operation failed');
  }

  const transfers = Array.isArray(result.data) ? result.data : [];

  // Format transfer data for response
  const formattedTransfers = transfers.map((transfer: {
    id: string;
    transaction_type: string;
    amount: number;
    currency: string;
    description?: string;
    status: string;
    created_at: string;
    recipient_id?: string;
    sender_id?: string;
    reference_id?: string;
  }) => ({
    id: transfer.id,
    type: transfer.transaction_type,
    amount: transfer.amount,
    currency: transfer.currency,
    description: transfer.description,
    status: transfer.status,
    createdAt: transfer.created_at,
    recipientId: transfer.recipient_id,
    senderId: transfer.sender_id,
    referenceId: transfer.reference_id
  }));

  const responseData = {
    transfers: formattedTransfers,
    pagination: {
      page,
      limit,
      total: formattedTransfers.length,
      hasMore: formattedTransfers.length === limit
    },
    userId: user.userId,
    currency,
    timestamp: new Date().toISOString()
  };

  return createSuccessResponse(responseData, 'Transfer history retrieved successfully');
}

export const GET = withCors(withErrorHandling(withAuth(transferHistoryHandler)));
