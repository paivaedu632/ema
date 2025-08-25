// Database integration test endpoint
// GET /api/database/test - Test database functions
// POST /api/database/test - Test database operations

import { NextRequest } from 'next/server'
import { getAuthenticatedUserFromRequest, createSuccessResponse } from '@/lib/api-utils'
import { handleApiError } from '@/lib/error-handler'
import { OrderBookFunctions, checkDatabaseHealth } from '@/lib/supabase-server'

/**
 * GET /api/database/test
 * Test database connection and basic functions
 */
export async function GET(request: NextRequest) {
  try {
    // Test authentication
    const authContext = await getAuthenticatedUserFromRequest(request)
    
    // Test database health
    const isHealthy = await checkDatabaseHealth()
    
    // Test wallet balances function
    const walletBalances = await OrderBookFunctions.getUserWalletBalances(authContext.user.id)
    
    // Test best prices function (should work even with no orders)
    const bestPrices = await OrderBookFunctions.getBestPrices({
      p_base_currency: 'EUR',
      p_quote_currency: 'AOA'
    })
    
    // Test order book depth (should work even with no orders)
    const orderBookDepth = await OrderBookFunctions.getOrderBookDepth({
      p_base_currency: 'EUR',
      p_quote_currency: 'AOA',
      p_depth_limit: 5
    })
    
    // Test recent trades (should work even with no trades)
    const recentTrades = await OrderBookFunctions.getRecentTrades({
      p_base_currency: 'EUR',
      p_quote_currency: 'AOA',
      p_limit: 10
    })
    
    return createSuccessResponse({
      message: 'Database integration test successful',
      userId: authContext.user.id,
      databaseHealth: isHealthy,
      testResults: {
        walletBalances: {
          count: walletBalances.length,
          currencies: walletBalances.map(w => w.currency)
        },
        bestPrices: {
          hasBid: bestPrices.best_bid !== null,
          hasAsk: bestPrices.best_ask !== null,
          spread: bestPrices.spread
        },
        orderBookDepth: {
          entryCount: orderBookDepth.length,
          sides: [...new Set(orderBookDepth.map(entry => entry.side))]
        },
        recentTrades: {
          tradeCount: recentTrades.length
        }
      }
    }, 'Database functions working correctly')

  } catch (error) {
    return handleApiError(error, { endpoint: 'GET /api/database/test' })
  }
}

/**
 * POST /api/database/test
 * Test order book summary function
 */
export async function POST(request: NextRequest) {
  try {
    // Test authentication
    const authContext = await getAuthenticatedUserFromRequest(request)
    
    // Test order book summary function
    const summary = await OrderBookFunctions.getOrderBookSummary('EUR', 'AOA')
    
    return createSuccessResponse({
      message: 'Order book summary test successful',
      userId: authContext.user.id,
      summary: {
        prices: summary.prices,
        depthEntries: summary.depth.length,
        recentTradesCount: summary.recentTrades.length
      }
    }, 'Order book summary function working correctly')

  } catch (error) {
    return handleApiError(error, { endpoint: 'POST /api/database/test' })
  }
}
