// Market Analytics API Endpoint
// GET /api/market/analytics/[pair] - Get comprehensive market analytics

import { NextRequest } from 'next/server'
import { createSuccessResponse } from '@/lib/api-response'
import { handleApiError } from '@/lib/error-handler'
import { validatePathParams, validateQueryParams } from '@/lib/validation'
import { generateMarketAnalytics, TimeInterval } from '@/lib/market-analytics'
import { z } from 'zod'

/**
 * Path parameters validation schema
 */
const AnalyticsParamsSchema = z.object({
  pair: z.enum(['EUR-AOA', 'AOA-EUR'], {
    errorMap: () => ({ message: 'Par de moedas deve ser "EUR-AOA" ou "AOA-EUR"' })
  })
})

/**
 * Query parameters validation schema
 */
const AnalyticsQuerySchema = z.object({
  interval: z.enum(['1m', '5m', '15m', '1h', '4h', '1d']).default('1h'),
  limit: z.coerce.number().int().min(10).max(1000).default(100)
})

/**
 * GET /api/market/analytics/[pair]
 * Get comprehensive market analytics for a specific currency pair
 * 
 * Path Parameters:
 * - pair: Currency pair (EUR-AOA or AOA-EUR)
 * 
 * Query Parameters:
 * - interval: Time interval for candles (1m, 5m, 15m, 1h, 4h, 1d, default: 1h)
 * - limit: Number of candles to analyze (10-1000, default: 100)
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "pair": "EUR-AOA",
 *     "interval": "1h",
 *     "candles": [...],
 *     "volume": {
 *       "total": 1500.00,
 *       "average": 15.00,
 *       "trend": "increasing"
 *     },
 *     "volatility": {
 *       "price": 2.5,
 *       "volume": 15.3,
 *       "score": 35
 *     },
 *     "liquidity": {
 *       "bidDepth": 500.00,
 *       "askDepth": 450.00,
 *       "spread": 50.00,
 *       "spreadPercentage": 10.0,
 *       "score": 75
 *     },
 *     "momentum": {
 *       "rsi": 65.5,
 *       "macd": 2.3,
 *       "trend": "bullish"
 *     },
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
    const { pair } = validatePathParams(resolvedParams, AnalyticsParamsSchema)
    
    // Validate query parameters
    const searchParams = new URL(request.url).searchParams
    const queryParams = validateQueryParams(searchParams, AnalyticsQuerySchema)
    
    // Generate market analytics
    const analytics = await generateMarketAnalytics(
      pair, 
      queryParams.interval as TimeInterval, 
      queryParams.limit
    )
    
    return createSuccessResponse(
      analytics,
      `Market analytics generated for ${pair}`
    )

  } catch (error) {
    return handleApiError(error, { 
      endpoint: 'GET /api/market/analytics/[pair]',
      pair: (await params).pair
    })
  }
}
