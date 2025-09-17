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
    user_id: user.databaseId,
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
      return ErrorResponses.orderFailed('SLIPPAGE_EXCEEDED: Order rejected due to slippage limit');
    }
    if (result.error?.includes('liquidity')) {
      return ErrorResponses.orderFailed('INSUFFICIENT_LIQUIDITY: Insufficient market liquidity');
    }

    return ErrorResponses.orderFailed(result.error || 'Order failed');
  }

  // Parse the database function response with proper typing
  const orderData = result.data as {
    order_id?: string;
    status?: string;
    filled_quantity?: number;
    average_fill_price?: number;
    total_cost?: number;
    slippage_percent?: number;
    message?: string;
    created_at?: string;
    executed_at?: string;
  } | undefined;

  // Check if the order was actually rejected by the database
  if (orderData?.status === 'rejected') {
    // Handle specific rejection cases based on the message
    const message = orderData.message || 'Market order was rejected';

    if (message.includes('No liquidity available')) {
      return ErrorResponses.orderFailed('INSUFFICIENT_LIQUIDITY: No liquidity available for this currency pair');
    }
    if (message.includes('Slippage exceeds maximum') || message.includes('slippage')) {
      return ErrorResponses.orderFailed('SLIPPAGE_EXCEEDED: Order rejected due to slippage limit');
    }
    if (message.includes('could not be filled')) {
      return ErrorResponses.orderFailed('EXECUTION_FAILED: Market order could not be filled');
    }

    // Generic rejection error
    return ErrorResponses.orderFailed(`ORDER_REJECTED: ${message}`);
  }

  // Only proceed with success response if order was actually filled
  if (orderData?.status !== 'filled') {
    return ErrorResponses.orderFailed('UNEXPECTED_STATUS: Market order did not complete successfully');
  }

  const responseData = {
    orderId: orderData.order_id,
    userId: user.userId,
    orderType: 'market' as const,
    side,
    baseCurrency,
    quoteCurrency,
    amount,
    slippageLimit,
    executedPrice: orderData.average_fill_price,
    executedAmount: orderData.filled_quantity,
    status: orderData.status,
    createdAt: orderData.created_at || new Date().toISOString(),
    executedAt: orderData.executed_at || new Date().toISOString(),
    orderDetails: {
      totalCost: orderData.total_cost,
      slippagePercent: orderData.slippage_percent,
      message: orderData.message
    }
  };

  return createSuccessResponse(responseData, 'Market order executed successfully');
}

export const POST = withCors(withErrorHandling(withAuth(marketOrderHandler)));
