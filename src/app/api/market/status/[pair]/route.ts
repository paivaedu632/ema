// Market Status API Endpoint
// GET /api/market/status/[pair] - Get market status and health information

import { NextRequest } from 'next/server'
import { createSuccessResponse } from '@/lib/api-response'
import { handleApiError } from '@/lib/error-handler'
import { validatePathParams } from '@/lib/validation'
import { getMarketStatus } from '@/lib/market-data-service'
import { z } from 'zod'

/**
 * Path parameters validation schema
 */
const StatusParamsSchema = z.object({
  pair: z.enum(['EUR-AOA', 'AOA-EUR'], {
    errorMap: () => ({ message: 'Par de moedas deve ser "EUR-AOA" ou "AOA-EUR"' })
  })
})

/**
 * GET /api/market/status/[pair]
 * Get market status and health information for a specific currency pair
 * 
 * Path Parameters:
 * - pair: Currency pair (EUR-AOA or AOA-EUR)
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "pair": "EUR-AOA",
 *     "status": "active",
 *     "lastTradeTime": "2025-08-23T14:29:45.123Z",
 *     "lastOrderBookUpdate": "2025-08-23T14:30:00.000Z",
 *     "healthScore": 85,
 *     "activeOrders": 15,
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
    const { pair } = validatePathParams(resolvedParams, StatusParamsSchema)
    
    // Get market status
    const status = await getMarketStatus(pair)
    
    return createSuccessResponse(
      status,
      `Market status retrieved for ${pair}`
    )

  } catch (error) {
    return handleApiError(error, {
      endpoint: 'GET /api/market/status/[pair]',
      pair: (await params).pair
    })
  }
}
