// Market Overview API Endpoint
// GET /api/market/overview - Get comprehensive market overview for all currency pairs

import { NextRequest } from 'next/server'
import { createSuccessResponse } from '@/lib/api-response'
import { handleApiError } from '@/lib/error-handler'
import { 
  getMarketTicker, 
  getMarketStatistics, 
  getMarketStatus 
} from '@/lib/market-data-service'
import { CurrencyPair } from '@/types/market-data'

/**
 * GET /api/market/overview
 * Get comprehensive market overview for all supported currency pairs
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "markets": [
 *       {
 *         "pair": "EUR-AOA",
 *         "ticker": { ... },
 *         "stats24h": { ... },
 *         "status": { ... }
 *       }
 *     ],
 *     "summary": {
 *       "totalVolume24h": 3000.00,
 *       "totalTrades24h": 90,
 *       "activeMarkets": 2,
 *       "timestamp": "2025-08-23T14:30:00.000Z"
 *     }
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const supportedPairs: CurrencyPair[] = ['EUR-AOA', 'AOA-EUR']
    
    // Get data for all currency pairs
    const marketData = await Promise.all(
      supportedPairs.map(async (pair) => {
        try {
          const [ticker, stats24h, status] = await Promise.all([
            getMarketTicker(pair),
            getMarketStatistics(pair, '24h'),
            getMarketStatus(pair)
          ])
          
          return {
            pair,
            ticker,
            stats24h,
            status,
            error: null
          }
        } catch (error) {
          // If one market fails, don't fail the entire request
          return {
            pair,
            ticker: null,
            stats24h: null,
            status: null,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      })
    )
    
    // Filter out failed markets and calculate summary
    const successfulMarkets = marketData.filter(market => market.error === null)
    
    let totalVolume24h = 0
    let totalTrades24h = 0
    let activeMarkets = 0
    
    successfulMarkets.forEach(market => {
      if (market.ticker && market.stats24h && market.status) {
        totalVolume24h += market.ticker.volume24h
        totalTrades24h += market.ticker.tradeCount24h
        
        if (market.status.status === 'active') {
          activeMarkets++
        }
      }
    })
    
    const response = {
      markets: successfulMarkets.map(market => ({
        pair: market.pair,
        ticker: market.ticker,
        stats24h: market.stats24h,
        status: market.status
      })),
      summary: {
        totalVolume24h,
        totalTrades24h,
        activeMarkets,
        totalMarkets: supportedPairs.length,
        timestamp: new Date().toISOString()
      }
    }
    
    // Include failed markets in development mode
    if (process.env.NODE_ENV === 'development') {
      const failedMarkets = marketData.filter(market => market.error !== null)
      if (failedMarkets.length > 0) {
        (response as any).errors = failedMarkets.map(market => ({
          pair: market.pair,
          error: market.error
        }))
      }
    }
    
    return createSuccessResponse(
      response,
      'Market overview retrieved successfully'
    )

  } catch (error) {
    return handleApiError(error, { 
      endpoint: 'GET /api/market/overview'
    })
  }
}
