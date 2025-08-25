// Test Order Status API Endpoint
// GET /api/test-public/orders/status - Get current order book status for testing

import { NextRequest } from 'next/server'
import { createSuccessResponse } from '@/lib/api-response'
import { handleApiError } from '@/lib/error-handler'
import { 
  getBestPrices, 
  getOrderBookDepth, 
  getRecentTrades 
} from '@/lib/supabase-server'

/**
 * GET /api/test-public/orders/status
 * Get comprehensive order book and market status for testing
 */
export async function GET(request: NextRequest) {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV === 'production') {
      return createSuccessResponse(
        { message: 'Test endpoints not available in production' },
        'Production mode'
      )
    }

    // Get market data for both currency pairs
    const pairs = [
      { base: 'EUR', quote: 'AOA' },
      { base: 'AOA', quote: 'EUR' }
    ]

    const marketData = await Promise.all(
      pairs.map(async (pair) => {
        try {
          const [bestPrices, orderBook, recentTrades] = await Promise.all([
            getBestPrices({
              p_base_currency: pair.base as 'EUR' | 'AOA',
              p_quote_currency: pair.quote as 'EUR' | 'AOA'
            }),
            getOrderBookDepth({
              p_base_currency: pair.base as 'EUR' | 'AOA',
              p_quote_currency: pair.quote as 'EUR' | 'AOA',
              p_depth_limit: 10
            }),
            getRecentTrades({
              p_base_currency: pair.base as 'EUR' | 'AOA',
              p_quote_currency: pair.quote as 'EUR' | 'AOA',
              p_limit: 10
            })
          ])

          // Separate bids and asks
          const bids = orderBook.filter(entry => entry.side === 'buy')
            .sort((a, b) => b.price - a.price) // Highest price first
          const asks = orderBook.filter(entry => entry.side === 'sell')
            .sort((a, b) => a.price - b.price) // Lowest price first

          return {
            pair: `${pair.base}-${pair.quote}`,
            bestPrices: {
              bid: bestPrices.best_bid,
              ask: bestPrices.best_ask,
              spread: bestPrices.best_bid && bestPrices.best_ask 
                ? bestPrices.best_ask - bestPrices.best_bid 
                : null
            },
            orderBook: {
              bids: bids.slice(0, 5), // Top 5 bids
              asks: asks.slice(0, 5), // Top 5 asks
              totalBids: bids.length,
              totalAsks: asks.length
            },
            recentTrades: recentTrades.slice(0, 5).map(trade => ({
              trade_id: trade.trade_id,
              price: trade.price,
              quantity: trade.quantity,
              side: trade.quantity > 0 ? 'buy' : 'sell', // Simplified
              executed_at: trade.executed_at
            })),
            summary: {
              totalOrders: orderBook.length,
              totalTrades: recentTrades.length,
              hasActivity: orderBook.length > 0 || recentTrades.length > 0
            }
          }
        } catch (error) {
          return {
            pair: `${pair.base}-${pair.quote}`,
            error: error instanceof Error ? error.message : 'Unknown error',
            bestPrices: null,
            orderBook: null,
            recentTrades: null,
            summary: null
          }
        }
      })
    )

    // Calculate overall market summary
    const totalOrders = marketData.reduce((sum, data) => 
      sum + (data.summary?.totalOrders || 0), 0
    )
    const totalTrades = marketData.reduce((sum, data) => 
      sum + (data.summary?.totalTrades || 0), 0
    )
    const activePairs = marketData.filter(data => 
      data.summary?.hasActivity
    ).length

    return createSuccessResponse(
      {
        markets: marketData,
        overallSummary: {
          totalOrders,
          totalTrades,
          activePairs,
          totalPairs: pairs.length,
          timestamp: new Date().toISOString()
        },
        testInfo: {
          message: 'Use POST /api/test-public/orders/place to create test orders',
          availableTestUsers: ['TRADER_1', 'TRADER_2', 'TRADER_3'],
          supportedPairs: ['EUR-AOA', 'AOA-EUR'],
          orderTypes: ['limit', 'market'],
          sides: ['buy', 'sell']
        }
      },
      'Order book status retrieved successfully'
    )

  } catch (error) {
    return handleApiError(error, { 
      endpoint: 'GET /api/test-public/orders/status'
    })
  }
}
