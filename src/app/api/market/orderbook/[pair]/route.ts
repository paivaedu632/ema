// Order Book API Endpoint
// GET /api/market/orderbook/[pair] - Get order book snapshot for a currency pair

import { NextRequest } from 'next/server'
import { createSuccessResponse } from '@/lib/api-response'
import { handleApiError } from '@/lib/error-handler'
import { validatePathParams, validateQueryParams, OrderBookDepthQuerySchema } from '@/lib/validation'
import { getOrderBookSnapshot } from '@/lib/market-data-service'
import { z } from 'zod'

/**
 * Path parameters validation schema
 */
const OrderBookParamsSchema = z.object({
  pair: z.enum(['EUR-AOA', 'AOA-EUR'], {
    errorMap: () => ({ message: 'Par de moedas deve ser "EUR-AOA" ou "AOA-EUR"' })
  })
})

/**
 * GET /api/market/orderbook/[pair]
 * Get order book snapshot for a specific currency pair
 * 
 * Path Parameters:
 * - pair: Currency pair (EUR-AOA or AOA-EUR)
 * 
 * Query Parameters:
 * - limit: Number of price levels to return (1-100, default: 20)
 * - aggregate: Whether to aggregate orders at same price level (default: true)
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "pair": "EUR-AOA",
 *     "bids": [
 *       {
 *         "price": 1200.50,
 *         "quantity": 100.00,
 *         "total": 120050.00,
 *         "orderCount": 3
 *       }
 *     ],
 *     "asks": [
 *       {
 *         "price": 1205.00,
 *         "quantity": 75.00,
 *         "total": 90375.00,
 *         "orderCount": 2
 *       }
 *     ],
 *     "timestamp": "2025-08-23T14:30:00.000Z",
 *     "sequence": 1692801000000
 *   }
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pair: string }> }
) {
  try {
    // Await params in Next.js 15
    const resolvedParams = await params

    // Validate path parameters
    const { pair } = validatePathParams(resolvedParams, OrderBookParamsSchema)
    
    // Validate query parameters
    const searchParams = new URL(request.url).searchParams
    const queryParams = validateQueryParams(searchParams, OrderBookDepthQuerySchema)
    
    // Get order book snapshot
    const orderBook = await getOrderBookSnapshot(pair, queryParams.limit)
    
    return createSuccessResponse(
      orderBook,
      `Order book retrieved for ${pair}`
    )

  } catch (error) {
    return handleApiError(error, {
      endpoint: 'GET /api/market/orderbook/[pair]',
      pair: (await params).pair
    })
  }
}
