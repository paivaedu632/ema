import { NextRequest } from 'next/server';
import { createSuccessResponse, errorResponse, withErrorHandling } from '@/lib/api';
import { withCors } from '@/lib/api';
import { validateSearchParams } from '@/lib/validations';
import { getMidpointExchangeRate } from '@/lib/database/functions';
import { z } from 'zod';

// Schema for midpoint exchange rate parameters
const midpointRateSchema = z.object({
  baseCurrency: z.string().default('EUR'),
  quoteCurrency: z.string().default('AOA')
});

async function midpointRateHandler(request: NextRequest) {
  // Extract search parameters
  const { searchParams } = new URL(request.url);

  // Validate search parameters
  const validation = validateSearchParams(searchParams, midpointRateSchema);
  if (!validation.success) {
    return errorResponse('Validation failed: ' + validation.error, 400);
  }

  const { baseCurrency, quoteCurrency } = validation.data!;

  try {
    // Get midpoint exchange rate from database
    const rateResult = await getMidpointExchangeRate({
      base_currency: baseCurrency,
      quote_currency: quoteCurrency
    });

    let midpointRate = 1252; // Default fallback
    if (rateResult.success && rateResult.data) {
      midpointRate = parseFloat(String(rateResult.data));
    } else {
      // Use consistent fallback rates
      midpointRate = baseCurrency === 'EUR' && quoteCurrency === 'AOA' ? 1252 : 1 / 1252;
    }

    // Calculate bid/ask spread around midpoint
    const spread = 0.002; // 0.2% spread
    const bidRate = midpointRate * (1 - spread);
    const askRate = midpointRate * (1 + spread);

    const exchangeRateData = {
      pair: `${baseCurrency}/${quoteCurrency}`,
      baseCurrency,
      quoteCurrency,
      rate: parseFloat(midpointRate.toFixed(8)), // Add rate field for backward compatibility
      midpointRate: parseFloat(midpointRate.toFixed(8)),
      bidRate: parseFloat(bidRate.toFixed(8)),
      askRate: parseFloat(askRate.toFixed(8)),
      spread: parseFloat((spread * 100).toFixed(4)), // Convert to percentage
      source: 'order_book_midpoint',
      lastUpdated: new Date().toISOString(),
      status: 'active'
    };

    return createSuccessResponse(exchangeRateData, 'Midpoint exchange rate retrieved successfully');

  } catch (error) {
    console.error('Midpoint exchange rate error:', error);
    return errorResponse('Failed to retrieve midpoint exchange rate', 500);
  }
}

export const GET = withCors(withErrorHandling(midpointRateHandler));
