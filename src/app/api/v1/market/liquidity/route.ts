import { NextRequest } from 'next/server';
import { withAuth, AuthenticatedUser } from '@/lib/auth/middleware';
import { createSuccessResponse, ErrorResponses, withErrorHandling } from '@/lib/api';
import { withCors } from '@/lib/api';
import { createServerSupabaseClient } from '@/lib/supabase/server';

async function liquidityCheckHandler(request: NextRequest, user: AuthenticatedUser) {
  const { searchParams } = new URL(request.url);

  const side = searchParams.get('side');
  const baseCurrency = searchParams.get('baseCurrency');
  const quoteCurrency = searchParams.get('quoteCurrency');
  const quantity = searchParams.get('quantity');
  const maxSlippage = searchParams.get('maxSlippage') || '5.0';
  const reserve = searchParams.get('reserve') === 'true'; // New parameter
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
    // Use Supabase RPC to call the cross-user liquidity check function
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase.rpc('check_cross_user_market_liquidity', {
      p_user_id: user.databaseId,
      p_side: side,
      p_base_currency: baseCurrency,
      p_quote_currency: quoteCurrency,
      p_quantity: quantityNum,
      p_max_slippage_percent: maxSlippageNum
    });

    if (error) {
      console.error('Liquidity check failed:', error);
      return ErrorResponses.internalError('Failed to check market liquidity');
    }

    const liquidityData = data as {
      has_liquidity: boolean;
      available_quantity: string;
      best_price: string;
      worst_price: string;
      estimated_slippage: string;
      message: string;
    };

    if (!liquidityData) {
      console.error('No liquidity data returned');
      return ErrorResponses.internalError('No liquidity data returned');
    }

    const responseData = {
      hasLiquidity: liquidityData.has_liquidity,
      availableQuantity: liquidityData.available_quantity,
      bestPrice: liquidityData.best_price,
      worstPrice: liquidityData.worst_price,
      estimatedSlippage: liquidityData.estimated_slippage,
      message: liquidityData.message,
      canExecuteMarketOrder: liquidityData.has_liquidity,
      // Reservation fields (will be implemented in authenticated endpoint)
      reservationId: reserve && liquidityData.has_liquidity ? 'reservation-placeholder' : undefined,
      expiresAt: reserve && liquidityData.has_liquidity ? new Date(Date.now() + reservationDuration * 1000).toISOString() : undefined,
      reservationDurationSeconds: reserve && liquidityData.has_liquidity ? reservationDuration : undefined
    };

    return createSuccessResponse(responseData, 'Liquidity check completed');
  } catch (error) {
    console.error('Liquidity check error:', error);
    return ErrorResponses.internalError('Failed to check market liquidity');
  }
}

export const GET = withAuth(liquidityCheckHandler);
