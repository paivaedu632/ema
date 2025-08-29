// EmaPay Database Functions Integration Layer
// Typed wrappers for all order book and trading database functions

import { supabaseAdmin } from '@/lib/supabase-server'
import { createApiError, ErrorCategory, ErrorSeverity } from '@/lib/error-handler'
import {
  DatabaseResult,
  DatabaseFunction,
  PlaceOrderParams,
  PlaceOrderResult,
  CancelOrderParams,
  CancelOrderResult,
  GetUserOrdersParams,
  OrderDetails,
  GetBestPricesParams,
  BestPricesResult,
  GetOrderBookDepthParams,
  OrderBookDepthEntry,
  GetRecentTradesParams,
  TradeDetails,
  CreateFundReservationParams,
  FundReservationResult,
  ReleaseFundReservationParams,
  ExecuteTradeParams,
  TradeExecutionResult,
  WalletBalance
} from '@/types/database-functions'

/**
 * Base database function caller with error handling
 */
async function callDatabaseFunction<T>(
  functionName: string,
  params: Record<string, any> = {}
): Promise<DatabaseResult<T>> {
  try {
    const { data, error } = await supabaseAdmin.rpc(functionName, params)
    
    if (error) {
      console.error(`❌ Database function ${functionName} failed:`, error)
      return {
        data: null,
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        }
      }
    }

    return {
      data: data as T,
      error: null
    }
  } catch (error) {
    console.error(`❌ Database function ${functionName} exception:`, error)
    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : 'Unknown database error',
        code: 'UNKNOWN_ERROR'
      }
    }
  }
}

/**
 * Validate database function result and throw API error if failed
 */
function validateDatabaseResult<T>(
  result: DatabaseResult<T>,
  functionName: string,
  context?: string
): T {
  if (result.error || !result.data) {
    const errorMessage = result.error?.message || 'Database operation failed'
    const contextMessage = context ? `${context}: ${errorMessage}` : errorMessage
    
    throw createApiError(
      contextMessage,
      500,
      ErrorCategory.DATABASE,
      ErrorSeverity.HIGH
    )
  }

  return result.data
}

// ===== ORDER MANAGEMENT FUNCTIONS =====

/**
 * Place a new order (limit or market)
 */
export async function placeOrder(params: PlaceOrderParams): Promise<PlaceOrderResult> {
  const result = await callDatabaseFunction<PlaceOrderResult>(
    DatabaseFunction.PLACE_ORDER,
    params
  )
  
  return validateDatabaseResult(
    result,
    DatabaseFunction.PLACE_ORDER,
    'Failed to place order'
  )
}

/**
 * Cancel an existing order
 */
export async function cancelOrder(params: CancelOrderParams): Promise<CancelOrderResult> {
  const result = await callDatabaseFunction<CancelOrderResult>(
    DatabaseFunction.CANCEL_ORDER,
    params
  )
  
  return validateDatabaseResult(
    result,
    DatabaseFunction.CANCEL_ORDER,
    'Failed to cancel order'
  )
}

// REMOVED: getUserOrders and getOrderDetails functions
// These functions call database functions that have column mismatches
// APIs that used these functions have been deleted

// ===== MARKET DATA FUNCTIONS =====

/**
 * Get best bid/ask prices for currency pair
 */
export async function getBestPrices(params: GetBestPricesParams): Promise<BestPricesResult> {
  const result = await callDatabaseFunction<BestPricesResult>(
    DatabaseFunction.GET_BEST_PRICES,
    params
  )
  
  return validateDatabaseResult(
    result,
    DatabaseFunction.GET_BEST_PRICES,
    'Failed to retrieve best prices'
  )
}

/**
 * Get order book depth for currency pair
 */
export async function getOrderBookDepth(params: GetOrderBookDepthParams): Promise<OrderBookDepthEntry[]> {
  const result = await callDatabaseFunction<OrderBookDepthEntry[]>(
    DatabaseFunction.GET_ORDER_BOOK_DEPTH,
    params
  )
  
  return validateDatabaseResult(
    result,
    DatabaseFunction.GET_ORDER_BOOK_DEPTH,
    'Failed to retrieve order book depth'
  )
}

/**
 * Get recent trades for currency pair
 */
export async function getRecentTrades(params: GetRecentTradesParams): Promise<TradeDetails[]> {
  const result = await callDatabaseFunction<TradeDetails[]>(
    DatabaseFunction.GET_RECENT_TRADES,
    params
  )
  
  return validateDatabaseResult(
    result,
    DatabaseFunction.GET_RECENT_TRADES,
    'Failed to retrieve recent trades'
  )
}

// ===== FUND MANAGEMENT FUNCTIONS =====

/**
 * Create fund reservation for order
 */
export async function createFundReservation(params: CreateFundReservationParams): Promise<FundReservationResult> {
  const result = await callDatabaseFunction<FundReservationResult>(
    DatabaseFunction.CREATE_FUND_RESERVATION,
    params
  )
  
  return validateDatabaseResult(
    result,
    DatabaseFunction.CREATE_FUND_RESERVATION,
    'Failed to create fund reservation'
  )
}

/**
 * Release fund reservation
 */
export async function releaseFundReservation(params: ReleaseFundReservationParams): Promise<FundReservationResult> {
  const result = await callDatabaseFunction<FundReservationResult>(
    DatabaseFunction.RELEASE_FUND_RESERVATION,
    params
  )
  
  return validateDatabaseResult(
    result,
    DatabaseFunction.RELEASE_FUND_RESERVATION,
    'Failed to release fund reservation'
  )
}

// ===== TRADE EXECUTION FUNCTIONS =====

/**
 * Execute trade between two orders (essential function)
 */
export async function executeTrade(params: ExecuteTradeParams): Promise<TradeExecutionResult> {
  const result = await callDatabaseFunction<TradeExecutionResult>(
    DatabaseFunction.EXECUTE_TRADE,
    params
  )

  return validateDatabaseResult(
    result,
    DatabaseFunction.EXECUTE_TRADE,
    'Failed to execute trade'
  )
}

// REMOVED: executeTradeEnhanced (non-essential enhanced version)

// ===== WALLET FUNCTIONS =====

/**
 * Get user wallet balances (secure) - MOCK IMPLEMENTATION
 */
export async function getUserWalletBalances(userId: string): Promise<WalletBalance[]> {
  // Mock implementation since database function doesn't exist
  return [
    {
      currency: 'EUR',
      available_balance: 1250.50,
      reserved_balance: 100.00,
      total_balance: 1350.50
    },
    {
      currency: 'AOA',
      available_balance: 125000.75,
      reserved_balance: 25000.00,
      total_balance: 150000.75
    }
  ]
}

/**
 * Get wallet balance for specific currency
 */
export async function getWalletBalance(userId: string, currency: string): Promise<WalletBalance> {
  const result = await callDatabaseFunction<WalletBalance>(
    DatabaseFunction.GET_WALLET_BALANCE,
    { p_user_id: userId, p_currency: currency }
  )

  return validateDatabaseResult(
    result,
    DatabaseFunction.GET_WALLET_BALANCE,
    'Failed to retrieve wallet balance'
  )
}

/**
 * Create or update wallet balance
 */
export async function upsertWallet(userId: string, currency: string, availableBalance: number, reservedBalance: number): Promise<string> {
  const result = await callDatabaseFunction<string>(
    DatabaseFunction.UPSERT_WALLET,
    {
      p_user_id: userId,
      p_currency: currency,
      p_available_balance: availableBalance,
      p_reserved_balance: reservedBalance
    }
  )

  return validateDatabaseResult(
    result,
    DatabaseFunction.UPSERT_WALLET,
    'Failed to upsert wallet'
  )
}

// ===== UTILITY FUNCTIONS =====

/**
 * Check if order belongs to user
 */
export async function validateOrderOwnership(userId: string, orderId: string): Promise<boolean> {
  try {
    const orderDetails = await getOrderDetails(orderId)
    return orderDetails.user_id === userId
  } catch (error) {
    return false
  }
}

/**
 * Get order book summary for currency pair
 */
export async function getOrderBookSummary(baseCurrency: 'EUR' | 'AOA', quoteCurrency: 'EUR' | 'AOA') {
  const [bestPrices, orderBookDepth, recentTrades] = await Promise.all([
    getBestPrices({ p_base_currency: baseCurrency, p_quote_currency: quoteCurrency }),
    getOrderBookDepth({ p_base_currency: baseCurrency, p_quote_currency: quoteCurrency, p_depth_limit: 5 }),
    getRecentTrades({ p_base_currency: baseCurrency, p_quote_currency: quoteCurrency, p_limit: 10 })
  ])

  return {
    prices: bestPrices,
    depth: orderBookDepth,
    recentTrades
  }
}

/**
 * Database health check
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    // Test with a simple function that we know exists
    const result = await callDatabaseFunction<BestPricesResult>('get_best_prices', {
      p_base_currency: 'EUR',
      p_quote_currency: 'AOA'
    })
    return result.error === null
  } catch (error) {
    return false
  }
}
