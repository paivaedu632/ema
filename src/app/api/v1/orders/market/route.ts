import { NextRequest } from 'next/server';
import { withAuth, AuthenticatedUser } from '@/lib/auth/middleware';
import { createSuccessResponse, ErrorResponses, withErrorHandling } from '@/lib/api';
import { withCors } from '@/lib/api';
import { validateRequestBody } from '@/lib/validations';
import { marketOrderSchema } from '@/lib/validations';
import { executeHybridMarketOrder } from '@/lib/database/functions';

async function marketOrderHandler(request: NextRequest, user: AuthenticatedUser) {
  // Validate request body
  const validation = await validateRequestBody(request, marketOrderSchema);
  if (!validation.success) {
    return ErrorResponses.validationError(validation.error!);
  }

  const { side, amount, baseCurrency, quoteCurrency, slippageLimit = 0.05 } = validation.data!;

  // Execute hybrid market order (partial execution + automatic limit order)
  const result = await executeHybridMarketOrder({
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

  // Parse the hybrid execution response with proper typing
  // Database function returns an array with a single row
  const hybridDataArray = result.data as Array<{
    market_order_id?: string;
    limit_order_id?: string;
    market_status?: string;
    limit_status?: string;
    market_filled_quantity?: number;
    limit_quantity?: number;
    market_avg_price?: number;
    limit_price?: number;
    market_total_cost?: number;
    slippage_percent?: number;
    message?: string;
  }> | undefined;

  const hybridData = hybridDataArray?.[0];

  // Check if the hybrid execution was completely rejected
  if (hybridData?.market_status === 'rejected' && !hybridData?.limit_order_id) {
    // Handle complete rejection cases based on the message
    const message = hybridData.message || 'Market order was rejected';

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

  // Hybrid execution is considered successful if either market portion executed or limit order was created
  const isHybridSuccess = (hybridData?.market_status === 'filled' && hybridData?.market_filled_quantity > 0) ||
                         (hybridData?.limit_order_id && hybridData?.limit_status === 'pending');

  if (!isHybridSuccess) {
    return ErrorResponses.orderFailed('EXECUTION_FAILED: Hybrid market order could not be processed');
  }

  // Determine execution type for response message
  const isHybridExecution = hybridData?.market_filled_quantity > 0 && hybridData?.limit_quantity > 0;
  const isFullMarketExecution = hybridData?.market_filled_quantity > 0 && hybridData?.limit_quantity === 0;

  let successMessage = 'Market order executed successfully';
  if (isHybridExecution) {
    successMessage = 'Hybrid execution completed: partial market execution + limit order created';
  } else if (isFullMarketExecution) {
    successMessage = 'Market order executed completely';
  } else {
    successMessage = 'Order placed as limit order';
  }

  const responseData = {
    // Primary order information
    orderId: hybridData?.market_order_id || hybridData?.limit_order_id,
    userId: user.userId,
    orderType: 'hybrid_market' as const,
    side,
    baseCurrency,
    quoteCurrency,
    amount,
    slippageLimit,

    // Execution details
    executedPrice: hybridData?.market_avg_price,
    executedAmount: hybridData?.market_filled_quantity || 0,
    status: isHybridExecution ? 'hybrid_executed' : (isFullMarketExecution ? 'filled' : 'pending'),
    createdAt: new Date().toISOString(),
    executedAt: hybridData?.market_filled_quantity > 0 ? new Date().toISOString() : undefined,

    // Hybrid execution specific details
    hybridExecution: {
      marketOrderId: hybridData?.market_order_id,
      limitOrderId: hybridData?.limit_order_id,
      marketStatus: hybridData?.market_status,
      limitStatus: hybridData?.limit_status,
      marketFilledQuantity: hybridData?.market_filled_quantity || 0,
      limitQuantity: hybridData?.limit_quantity || 0,
      marketAvgPrice: hybridData?.market_avg_price,
      limitPrice: hybridData?.limit_price,
      marketTotalCost: hybridData?.market_total_cost,
      isHybrid: isHybridExecution,
      message: hybridData?.message
    },

    // Legacy compatibility
    orderDetails: {
      totalCost: hybridData?.market_total_cost,
      slippagePercent: hybridData?.slippage_percent,
      message: hybridData?.message
    }
  };

  return createSuccessResponse(responseData, successMessage);
}

export const POST = withCors(withErrorHandling(withAuth(marketOrderHandler)));
