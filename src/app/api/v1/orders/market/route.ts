import { NextRequest } from 'next/server';
import { withAuth, AuthenticatedUser } from '@/lib/auth/middleware';
import { createSuccessResponse, ErrorResponses, withErrorHandling } from '@/lib/api';
import { withCors } from '@/lib/api';
import { validateRequestBody } from '@/lib/validations';
import { marketOrderSchema } from '@/lib/validations';
import { executeMarketOrder } from '@/lib/database/functions';

async function marketOrderHandler(request: NextRequest, user: AuthenticatedUser) {
  // Validate request body
  const validation = await validateRequestBody(request, marketOrderSchema);
  if (!validation.success) {
    return ErrorResponses.validationError(validation.error!);
  }

  const { side, amount, baseCurrency, quoteCurrency, slippageLimit = 0.05 } = validation.data!;

  // Execute market order
  const result = await executeMarketOrder({
    user_id: user.userId,
    side,
    base_currency: baseCurrency,
    quote_currency: quoteCurrency,
    quantity: amount,
    max_slippage_percent: slippageLimit * 100
  });

  if (!result.success) {
    // Handle specific error cases
    if (result.error?.includes('insufficient')) {
      return ErrorResponses.insufficientBalance(result.error);
    }
    if (result.error?.includes('slippage')) {
      return ErrorResponses.orderFailed('Order rejected due to slippage limit');
    }
    if (result.error?.includes('liquidity')) {
      return ErrorResponses.orderFailed('Insufficient market liquidity');
    }

    return ErrorResponses.orderFailed(result.error);
  }

  const orderData = result.data as { id?: string; executed_price?: number; executed_amount?: number; status?: string; created_at?: string; executed_at?: string } | undefined;

  const responseData = {
    orderId: orderData?.id,
    userId: user.userId,
    orderType: 'market' as const,
    side,
    baseCurrency,
    quoteCurrency,
    amount,
    slippageLimit,
    executedPrice: orderData?.executed_price,
    executedAmount: orderData?.executed_amount,
    status: orderData?.status || 'filled',
    createdAt: orderData?.created_at || new Date().toISOString(),
    executedAt: orderData?.executed_at || new Date().toISOString(),
    orderDetails: orderData
  };

  return createSuccessResponse(responseData, 'Market order executed successfully');
}

export const POST = withCors(withErrorHandling(withAuth(marketOrderHandler)));
