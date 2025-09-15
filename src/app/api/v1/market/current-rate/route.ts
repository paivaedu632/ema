import { NextRequest } from 'next/server';
import { createSuccessResponse, errorResponse, withErrorHandling } from '@/lib/api';
import { withCors } from '@/lib/api';
import { validateSearchParams } from '@/lib/validations';
import { getCurrentMarketRate } from '@/lib/database/functions';
import { z } from 'zod';

// Schema for current rate parameters
const currentRateSchema = z.object({
  baseCurrency: z.enum(['EUR', 'AOA']).default('EUR'),
  quoteCurrency: z.enum(['EUR', 'AOA']).default('AOA')
});

async function currentRateHandler(request: NextRequest) {
  // Extract search parameters
  const { searchParams } = new URL(request.url);

  // Validate search parameters
  const validation = validateSearchParams(searchParams, currentRateSchema);
  if (!validation.success) {
    return errorResponse('Validation failed: ' + validation.error, 400);
  }

  const { baseCurrency, quoteCurrency } = validation.data!;

  // Prevent same currency conversion
  if (baseCurrency === quoteCurrency) {
    return createSuccessResponse({
      baseCurrency,
      quoteCurrency,
      rate: 1.0000,
      source: 'same_currency',
      lastUpdated: new Date().toISOString()
    }, 'Current rate retrieved successfully');
  }

  try {
    // Get current market rate from database
    const result = await getCurrentMarketRate({
      base_currency: baseCurrency,
      quote_currency: quoteCurrency
    });

    if (!result.success) {
      return errorResponse(result.error || 'Failed to retrieve current rate', 500);
    }

    const currentRate = parseFloat(String(result.data || '0'));

    const responseData = {
      baseCurrency,
      quoteCurrency,
      rate: currentRate,
      source: 'market_data',
      lastUpdated: new Date().toISOString()
    };

    return createSuccessResponse(responseData, 'Current rate retrieved successfully');

  } catch (error) {
    console.error('Current rate error:', error);
    return errorResponse('Failed to retrieve current rate', 500);
  }
}

export const GET = withCors(withErrorHandling(currentRateHandler));
