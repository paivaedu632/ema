// Recent Trades API Endpoint
// GET /api/market/trades/[pair] - Get recent trades for a currency pair

import { NextRequest } from 'next/server'
import { createSuccessResponse } from '@/lib/api-response'
import { handleApiError } from '@/lib/error-handler'
import { validatePathParams, validateQueryParams, RecentTradesQuerySchema } from '@/lib/validation'
import { getRecentTradesForPair } from '@/lib/market-data-service'
import { z } from 'zod'

/**
 * Path parameters validation schema
 */
const TradesParamsSchema = z.object({
  pair: z.enum(['EUR-AOA', 'AOA-EUR'], {
    errorMap: () => ({ message: 'Par de moedas deve ser "EUR-AOA" ou "AOA-EUR"' })
  })
})

/**
 * GET /api/market/trades/[pair]
 * Get recent trades for a specific currency pair
 * 
 * Path Parameters:
 * - pair: Currency pair (EUR-AOA or AOA-EUR)
 * 
 * Query Parameters:
 * - limit: Number of trades to return (1-500, default: 100)
 * - from: Start time for trade history (ISO 8601)
 * - to: End time for trade history (ISO 8601)
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "trade-uuid-123",
 *       "pair": "EUR-AOA",
 *       "price": 1202.75,
 *       "quantity": 50.00,
 *       "side": "buy",
 *       "baseAmount": 50.00,
 *       "quoteAmount": 60137.50,
 *       "timestamp": "2025-08-23T14:29:45.123Z"
 *     }
 *   ]
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
    const { pair } = validatePathParams(resolvedParams, TradesParamsSchema)
    
    // Validate query parameters
    const searchParams = new URL(request.url).searchParams
    const queryParams = validateQueryParams(searchParams, RecentTradesQuerySchema)
    
    // Get recent trades
    const trades = await getRecentTradesForPair(pair, queryParams.limit)
    
    // Filter by time range if specified
    let filteredTrades = trades
    if (queryParams.from || queryParams.to) {
      filteredTrades = trades.filter(trade => {
        const tradeTime = new Date(trade.timestamp)
        
        if (queryParams.from) {
          const fromTime = new Date(queryParams.from)
          if (tradeTime < fromTime) return false
        }
        
        if (queryParams.to) {
          const toTime = new Date(queryParams.to)
          if (tradeTime > toTime) return false
        }
        
        return true
      })
    }
    
    return createSuccessResponse(
      filteredTrades,
      `Recent trades retrieved for ${pair}`
    )

  } catch (error) {
    return handleApiError(error, {
      endpoint: 'GET /api/market/trades/[pair]',
      pair: (await params).pair
    })
  }
}
