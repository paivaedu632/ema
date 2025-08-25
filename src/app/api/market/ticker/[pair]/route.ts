// Market Ticker API Endpoint
// GET /api/market/ticker/[pair] - Get market ticker information for a currency pair

import { NextRequest } from 'next/server'
import { createSuccessResponse } from '@/lib/api-response'
import { handleApiError } from '@/lib/error-handler'
import { validatePathParams } from '@/lib/validation'
import { getMarketTicker } from '@/lib/market-data-service'
import { withApiMiddleware, MIDDLEWARE_CONFIGS } from '@/lib/api-middleware'
import { caches, CacheManager } from '@/lib/cache-manager'
import { z } from 'zod'

/**
 * Path parameters validation schema
 */
const TickerParamsSchema = z.object({
  pair: z.enum(['EUR-AOA', 'AOA-EUR'], {
    errorMap: () => ({ message: 'Par de moedas deve ser "EUR-AOA" ou "AOA-EUR"' })
  })
})

/**
 * GET /api/market/ticker/[pair]
 * Get market ticker information for a specific currency pair
 * 
 * Path Parameters:
 * - pair: Currency pair (EUR-AOA or AOA-EUR)
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "pair": "EUR-AOA",
 *     "bid": 1200.50,
 *     "ask": 1205.00,
 *     "spread": 4.50,
 *     "spreadPercentage": 0.37,
 *     "lastPrice": 1202.75,
 *     "change24h": 15.25,
 *     "changePercentage24h": 1.28,
 *     "volume24h": 1500.00,
 *     "volumeQuote24h": 1804125.00,
 *     "high24h": 1210.00,
 *     "low24h": 1195.00,
 *     "tradeCount24h": 45,
 *     "timestamp": "2025-08-23T14:30:00.000Z"
 *   }
 * }
 */
// Core handler function
async function tickerHandler(
  request: NextRequest,
  { params }: { params: Promise<{ pair: string }> }
) {
  // Await params in Next.js 15
  const resolvedParams = await params

  // Validate path parameters
  const { pair } = validatePathParams(resolvedParams, TickerParamsSchema)

  // Generate cache key
  const cacheKey = CacheManager.generateMarketDataKey('ticker', pair)

  // Try to get from cache or fetch fresh data
  const result = await CacheManager.getOrSet(
    caches.ticker,
    cacheKey,
    () => getMarketTicker(pair),
    5000 // 5 second TTL
  )

  return createSuccessResponse(
    result.data,
    `Ticker data retrieved for ${pair}`,
    200,
    result.cached ? { cache: { cached: true, expiresAt: new Date(Date.now() + 5000).toISOString() } } : undefined
  )
}

// Export with middleware
export const GET = withApiMiddleware(tickerHandler, {
  ...MIDDLEWARE_CONFIGS.MARKET_DATA,
  cache: {
    instance: caches.ticker,
    keyGenerator: (request: NextRequest) => {
      const url = new URL(request.url)
      const pathParts = url.pathname.split('/').filter(Boolean)
      const pair = pathParts[pathParts.length - 1] // Get pair from URL
      return CacheManager.generateMarketDataKey('ticker', pair)
    },
    ttl: 5000
  }
})
