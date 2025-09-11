import { NextRequest } from 'next/server';
import { withAuth, AuthenticatedUser } from '@/lib/auth/middleware';
import { createSuccessResponse, ErrorResponses, withErrorHandling } from '@/lib/api';
import { withCors } from '@/lib/api';
import { validateSearchParams } from '@/lib/validations';
import { orderHistorySchema } from '@/lib/validations';
import { getUserOrderHistory } from '@/lib/database/functions';

async function orderHistoryHandler(request: NextRequest, user: AuthenticatedUser) {
  // Validate search parameters
  const validation = validateSearchParams(request, orderHistorySchema);
  if (!validation.success) {
    return ErrorResponses.validationError(validation.error!);
  }

  const { page = 1, limit = 20, status } = validation.data!;

  // Get order history
  const result = await getUserOrderHistory({
    user_id: user.userId,
    page,
    limit,
    ...(status && { status })
  });

  if (!result.success) {
    return ErrorResponses.databaseError(result.error);
  }

  // The database function returns a JSON object with orders and pagination
  const orderData = result.data as { orders: any[]; pagination: any } | undefined;
  const orders = orderData?.orders || [];
  const pagination = orderData?.pagination || { total: 0, limit, offset: 0, hasMore: false };

  const responseData = {
    orders,
    pagination: {
      page,
      limit,
      total: pagination.total,
      hasMore: pagination.hasMore
    },
    userId: user.userId,
    timestamp: new Date().toISOString()
  };

  return createSuccessResponse(responseData, 'Order history retrieved successfully');
}

export const GET = withCors(withErrorHandling(withAuth(orderHistoryHandler)));
