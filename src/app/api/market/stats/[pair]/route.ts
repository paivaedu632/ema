// Market Statistics API Endpoint
// GET /api/market/stats/[pair] - Get market statistics for a currency pair

import { NextRequest } from 'next/server'
import { createSuccessResponse } from '@/lib/api-response'
import { handleApiError } from '@/lib/error-handler'
import { validatePathParams, validateQueryParams, MarketStatsQuerySchema } from '@/lib/validation'
import { getMarketStatistics } from '@/lib/market-data-service'
import { z } from 'zod'

/**
 * Path parameters validation schema
 */
const StatsParamsSchema = z.object({
  pair: z.enum(['EUR-AOA', 'AOA-EUR'], {
    errorMap: () => ({ message: 'Par de moedas deve ser "EUR-AOA" ou "AOA-EUR"' })
  })
})

/**
 * GET /api/market/stats/[pair]
 * Get market statistics for a specific currency pair
 * 
 * Path Parameters:
 * - pair: Currency pair (EUR-AOA or AOA-EUR)
 * 
 * Query Parameters:
 * - period: Time period for statistics (1h, 24h, 7d, 30d, default: 24h)
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "pair": "EUR-AOA",
 *     "period": "24h",
 *     "open": 1195.00,
 *     "close": 1202.75,
 *     "high": 1210.00,
 *     "low": 1190.00,
 *     "volume": 1500.00,
 *     "volumeQuote": 1804125.00,
 *     "tradeCount": 45,
 *     "vwap": 1202.75,
 *     "change": 7.75,
 *     "changePercentage": 0.65,
 *     "timestamp": "2025-08-23T14:30:00.000Z"
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
    const { pair } = validatePathParams(resolvedParams, StatsParamsSchema)
    
    // Validate query parameters
    const searchParams = new URL(request.url).searchParams
    const queryParams = validateQueryParams(searchParams, MarketStatsQuerySchema)
    
    // Get market statistics
    const stats = await getMarketStatistics(pair, queryParams.period)
    
    return createSuccessResponse(
      stats,
      `Market statistics retrieved for ${pair}`
    )

  } catch (error) {
    return handleApiError(error, {
      endpoint: 'GET /api/market/stats/[pair]',
      pair: (await params).pair
    })
  }
}
