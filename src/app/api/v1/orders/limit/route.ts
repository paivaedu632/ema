import { NextRequest } from 'next/server';
import { withAuth, AuthenticatedUser } from '@/lib/auth/middleware';
import { createSuccessResponse, ErrorResponses, withErrorHandling } from '@/lib/api';
import { withCors } from '@/lib/api';
import { validateRequestBody } from '@/lib/validations';
import { limitOrderSchema } from '@/lib/validations';
import { placeLimitOrder } from '@/lib/database/functions';

async function limitOrderHandler(request: NextRequest, user: AuthenticatedUser) {
  // Validate request body
  const validation = await validateRequestBody(request, limitOrderSchema);
  if (!validation.success) {
    return ErrorResponses.validationError(validation.error!);
  }

  const { side, amount, price, baseCurrency, quoteCurrency } = validation.data!;

  // Place limit order
  const result = await placeLimitOrder({
    user_id: user.databaseId,
    side,
    base_currency: baseCurrency,
    quote_currency: quoteCurrency,
    quantity: amount,
    price
  });

  if (!result.success) {
    // Handle specific error cases
    if (result.error?.includes('insufficient')) {
      return ErrorResponses.insufficientBalance(result.error);
    }

    return ErrorResponses.orderFailed(result.error || 'Order failed');
  }

  const orderData = result.data as { id?: string; status?: string; created_at?: string } | undefined;

  const responseData = {
    orderId: orderData?.id,
    userId: user.userId,
    orderType: 'limit' as const,
    side,
    baseCurrency,
    quoteCurrency,
    amount,
    price,
    status: orderData?.status || 'pending',
    createdAt: orderData?.created_at || new Date().toISOString(),
    orderDetails: orderData
  };

  return createSuccessResponse(responseData, 'Limit order placed successfully');
}

export const POST = withCors(withErrorHandling(withAuth(limitOrderHandler)));
