// Market Depth API Endpoint
// GET /api/market/depth/[pair] - Get market depth analysis

import { NextRequest } from 'next/server'
import { createSuccessResponse } from '@/lib/api-response'
import { handleApiError } from '@/lib/error-handler'
import { validatePathParams, validateQueryParams } from '@/lib/validation'
import { calculateMarketDepth } from '@/lib/market-analytics'
import { z } from 'zod'

/**
 * Path parameters validation schema
 */
const DepthParamsSchema = z.object({
  pair: z.enum(['EUR-AOA', 'AOA-EUR'], {
    errorMap: () => ({ message: 'Par de moedas deve ser "EUR-AOA" ou "AOA-EUR"' })
  })
})

/**
 * Query parameters validation schema
 */
const DepthQuerySchema = z.object({
  percentage: z.coerce.number().min(1).max(50).default(10)
})

/**
 * GET /api/market/depth/[pair]
 * Get market depth analysis for a specific currency pair
 * 
 * Path Parameters:
 * - pair: Currency pair (EUR-AOA or AOA-EUR)
 * 
 * Query Parameters:
 * - percentage: Depth percentage for analysis (1-50, default: 10)
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "pair": "EUR-AOA",
 *     "totalBidVolume": 500.00,
 *     "totalAskVolume": 450.00,
 *     "volumeRatio": 1.11,
 *     "imbalance": 0.053,
 *     "levels": {
 *       "depth1Percent": {
 *         "bid": 100.00,
 *         "ask": 95.00
 *       },
 *       "depth5Percent": {
 *         "bid": 300.00,
 *         "ask": 280.00
 *       },
 *       "depth10Percent": {
 *         "bid": 500.00,
 *         "ask": 450.00
 *       }
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
    const { pair } = validatePathParams(resolvedParams, DepthParamsSchema)
    
    // Validate query parameters
    const searchParams = new URL(request.url).searchParams
    const queryParams = validateQueryParams(searchParams, DepthQuerySchema)
    
    // Calculate market depth
    const depth = await calculateMarketDepth(pair, queryParams.percentage)
    
    return createSuccessResponse(
      depth,
      `Market depth analysis for ${pair}`
    )

  } catch (error) {
    return handleApiError(error, { 
      endpoint: 'GET /api/market/depth/[pair]',
      pair: (await params).pair
    })
  }
}
