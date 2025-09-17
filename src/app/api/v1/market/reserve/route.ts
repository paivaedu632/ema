import { NextRequest } from 'next/server';
import { withAuth, AuthenticatedUser } from '@/lib/auth/middleware';
import { createSuccessResponse, ErrorResponses, withErrorHandling } from '@/lib/api';
import { withCors } from '@/lib/api';
import { execute_sql_supabase } from '@/lib/database/functions';

async function reserveLiquidityHandler(request: NextRequest, user: AuthenticatedUser) {
  const { searchParams } = new URL(request.url);
  
  const side = searchParams.get('side');
  const baseCurrency = searchParams.get('baseCurrency');
  const quoteCurrency = searchParams.get('quoteCurrency');
  const quantity = searchParams.get('quantity');
  const maxSlippage = searchParams.get('maxSlippage') || '5.0';
  const reservationDuration = parseInt(searchParams.get('reservationDuration') || '30');

  // Validate required parameters
  if (!side || !baseCurrency || !quoteCurrency || !quantity) {
    return ErrorResponses.validationError('Missing required parameters: side, baseCurrency, quoteCurrency, quantity');
  }

  // Validate parameter values
  if (!['buy', 'sell'].includes(side)) {
    return ErrorResponses.validationError('Invalid side. Must be buy or sell');
  }

  if (!['EUR', 'AOA'].includes(baseCurrency) || !['EUR', 'AOA'].includes(quoteCurrency)) {
    return ErrorResponses.validationError('Invalid currency. Must be EUR or AOA');
  }

  const quantityNum = parseFloat(quantity);
  const maxSlippageNum = parseFloat(maxSlippage);

  if (isNaN(quantityNum) || quantityNum <= 0) {
    return ErrorResponses.validationError('Invalid quantity. Must be a positive number');
  }

  if (isNaN(maxSlippageNum) || maxSlippageNum < 0) {
    return ErrorResponses.validationError('Invalid maxSlippage. Must be a non-negative number');
  }

  if (reservationDuration < 10 || reservationDuration > 300) {
    return ErrorResponses.validationError('Invalid reservationDuration. Must be between 10 and 300 seconds');
  }

  try {
    // Call the reservation function
    const result = await execute_sql_supabase(
      'kjqcfedvilcnwzfjlqtq',
      `SELECT * FROM check_and_reserve_liquidity($1, $2, $3, $4, $5, $6, $7)`,
      [user.databaseId, side, baseCurrency, quoteCurrency, quantityNum, maxSlippageNum, reservationDuration]
    );

    if (!result.success) {
      console.error('Liquidity reservation failed:', result.error);
      return ErrorResponses.internalError('Failed to reserve liquidity');
    }

    const reservationData = result.data?.[0] as {
      has_liquidity: boolean;
      available_quantity: string;
      estimated_price: string;
      estimated_slippage: string;
      message: string;
      reservation_id: string;
      expires_at: string;
    };

    if (!reservationData) {
      console.error('No reservation data returned');
      return ErrorResponses.internalError('No reservation data returned');
    }

    const responseData = {
      hasLiquidity: reservationData.has_liquidity,
      availableQuantity: reservationData.available_quantity,
      estimatedPrice: reservationData.estimated_price,
      estimatedSlippage: reservationData.estimated_slippage,
      message: reservationData.message,
      canExecuteMarketOrder: reservationData.has_liquidity,
      reservationId: reservationData.reservation_id,
      expiresAt: reservationData.expires_at,
      reservationDurationSeconds: reservationDuration
    };

    return createSuccessResponse(responseData, 'Liquidity reservation completed');
  } catch (error) {
    console.error('Liquidity reservation error:', error);
    return ErrorResponses.internalError('Failed to reserve liquidity');
  }
}

export const POST = withCors(withErrorHandling(withAuth(reserveLiquidityHandler)));
