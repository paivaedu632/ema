import { NextRequest } from 'next/server';
import { createSuccessResponse, ErrorResponses, withErrorHandling } from '@/lib/api/responses';
import { withCors } from '@/lib/api/cors';
import { validateSearchParams } from '@/lib/validation/helpers';
import { z } from 'zod';

// Schema for market depth parameters
const marketDepthSchema = z.object({
  baseCurrency: z.string().default('EUR'),
  quoteCurrency: z.string().default('AOA'),
  levels: z.number().int().min(1).max(50).default(10)
});

async function marketDepthHandler(request: NextRequest) {
  // Validate search parameters
  const validation = validateSearchParams(request, marketDepthSchema);
  if (!validation.success) {
    return ErrorResponses.validationError(validation.error!);
  }

  const { baseCurrency, quoteCurrency, levels } = validation.data!;

  try {
    // For now, return mock order book data
    // In a real implementation, this would query the order_book table

    const generateMockOrders = (side: 'buy' | 'sell', basePrice: number, count: number) => {
      const orders = [];
      for (let i = 0; i < count; i++) {
        const priceOffset = side === 'buy' ? -i * 0.5 : i * 0.5;
        const price = basePrice + priceOffset;
        const amount = Math.random() * 1000 + 100;
        orders.push({
          price: parseFloat(price.toFixed(2)),
          amount: parseFloat(amount.toFixed(2)),
          total: parseFloat((price * amount).toFixed(2))
        });
      }
      return orders;
    };

    const basePrice = baseCurrency === 'EUR' && quoteCurrency === 'AOA' ? 655.50 : 0.00152;

    const mockDepthData = {
      pair: `${baseCurrency}/${quoteCurrency}`,
      baseCurrency,
      quoteCurrency,
      bids: generateMockOrders('buy', basePrice, levels),
      asks: generateMockOrders('sell', basePrice, levels),
      spread: {
        absolute: 1.00,
        percentage: 0.15
      },
      lastUpdated: new Date().toISOString(),
      levels
    };

    return createSuccessResponse(mockDepthData, 'Market depth retrieved successfully');

  } catch (error) {
    console.error('Market depth error:', error);
    return ErrorResponses.databaseError('Failed to retrieve market depth');
  }
}

export const GET = withCors(withErrorHandling(marketDepthHandler));
