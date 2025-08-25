// Price Candles API Endpoint
// GET /api/market/candles/[pair] - Get historical price candles (OHLCV data)

import { NextRequest } from 'next/server'
import { createSuccessResponse } from '@/lib/api-response'
import { handleApiError } from '@/lib/error-handler'
import { validatePathParams, validateQueryParams } from '@/lib/validation'
import { generatePriceCandles, TimeInterval } from '@/lib/market-analytics'
import { z } from 'zod'

/**
 * Path parameters validation schema
 */
const CandlesParamsSchema = z.object({
  pair: z.enum(['EUR-AOA', 'AOA-EUR'], {
    errorMap: () => ({ message: 'Par de moedas deve ser "EUR-AOA" ou "AOA-EUR"' })
  })
})

/**
 * Query parameters validation schema
 */
const CandlesQuerySchema = z.object({
  interval: z.enum(['1m', '5m', '15m', '1h', '4h', '1d']).default('1h'),
  limit: z.coerce.number().int().min(1).max(1000).default(100)
})

/**
 * GET /api/market/candles/[pair]
 * Get historical price candles (OHLCV data) for a specific currency pair
 * 
 * Path Parameters:
 * - pair: Currency pair (EUR-AOA or AOA-EUR)
 * 
 * Query Parameters:
 * - interval: Time interval for candles (1m, 5m, 15m, 1h, 4h, 1d, default: 1h)
 * - limit: Number of candles to return (1-1000, default: 100)
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "timestamp": "2025-08-23T14:00:00.000Z",
 *       "open": 1200.00,
 *       "high": 1205.50,
 *       "low": 1198.75,
 *       "close": 1202.25,
 *       "volume": 150.00,
 *       "tradeCount": 12
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
    const { pair } = validatePathParams(resolvedParams, CandlesParamsSchema)
    
    // Validate query parameters
    const searchParams = new URL(request.url).searchParams
    const queryParams = validateQueryParams(searchParams, CandlesQuerySchema)
    
    // Generate price candles
    const candles = await generatePriceCandles(
      pair, 
      queryParams.interval as TimeInterval, 
      queryParams.limit
    )
    
    return createSuccessResponse(
      candles,
      `Price candles retrieved for ${pair}`
    )

  } catch (error) {
    return handleApiError(error, { 
      endpoint: 'GET /api/market/candles/[pair]',
      pair: (await params).pair
    })
  }
}
