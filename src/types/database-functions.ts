// EmaPay Database Function Types
// Type definitions for all order book and trading database functions

/**
 * Order placement function parameters with dynamic pricing support
 */
export interface PlaceOrderParams {
  p_user_id: string
  p_order_type: 'limit' | 'market'
  p_side: 'buy' | 'sell'
  p_base_currency: 'EUR' | 'AOA'
  p_quote_currency: 'EUR' | 'AOA'
  p_quantity: number
  p_price?: number
  p_dynamic_pricing_enabled?: boolean
}

/**
 * Order placement function result with dynamic pricing info
 */
export interface PlaceOrderResult {
  order_id: string
  status: 'pending' | 'filled' | 'partially_filled'
  reserved_amount: number
  created_at: string
  message?: string
  dynamic_pricing_info?: {
    enabled: boolean
    original_price?: number
    min_bound?: number
    max_bound?: number
    bounds_percentage?: number
  }
}

/**
 * Order cancellation function parameters
 */
export interface CancelOrderParams {
  p_user_id: string
  p_order_id: string
}

/**
 * Order cancellation function result
 */
export interface CancelOrderResult {
  order_id: string
  status: 'cancelled'
  released_amount: number
  cancelled_at: string
  message?: string
}

/**
 * Get user orders function parameters
 */
export interface GetUserOrdersParams {
  p_user_id: string
  p_status?: 'pending' | 'filled' | 'partially_filled' | 'cancelled'
  p_limit?: number
  p_offset?: number
}

/**
 * Order details type
 */
export interface OrderDetails {
  id: string
  user_id: string
  order_type: 'limit' | 'market'
  side: 'buy' | 'sell'
  base_currency: 'EUR' | 'AOA'
  quote_currency: 'EUR' | 'AOA'
  quantity: number
  remaining_quantity: number
  filled_quantity: number
  price?: number
  average_fill_price?: number
  status: 'pending' | 'filled' | 'partially_filled' | 'cancelled'
  reserved_amount: number
  created_at: string
  updated_at: string
  filled_at?: string
  cancelled_at?: string
}

/**
 * Get best prices function parameters
 */
export interface GetBestPricesParams {
  p_base_currency: 'EUR' | 'AOA'
  p_quote_currency: 'EUR' | 'AOA'
}

/**
 * Best prices result
 */
export interface BestPricesResult {
  best_bid?: number
  best_ask?: number
  spread?: number
  spread_percentage?: number
}

/**
 * Get order book depth function parameters
 */
export interface GetOrderBookDepthParams {
  p_base_currency: 'EUR' | 'AOA'
  p_quote_currency: 'EUR' | 'AOA'
  p_depth_limit?: number
}

/**
 * Order book depth entry
 */
export interface OrderBookDepthEntry {
  side: 'buy' | 'sell'
  price: number
  quantity: number
  total: number
  order_count: number
}

/**
 * Get recent trades function parameters
 */
export interface GetRecentTradesParams {
  p_base_currency: 'EUR' | 'AOA'
  p_quote_currency: 'EUR' | 'AOA'
  p_limit?: number
}

/**
 * Trade details type
 */
export interface TradeDetails {
  trade_id: string
  price: number
  quantity: number
  base_amount: number
  quote_amount: number
  executed_at: string
}

/**
 * Fund reservation function parameters
 */
export interface CreateFundReservationParams {
  p_user_id: string
  p_currency: 'EUR' | 'AOA'
  p_amount: number
  p_purpose: string
  p_reference_id?: string
}

/**
 * Fund reservation result
 */
export interface FundReservationResult {
  reservation_id: string
  user_id: string
  currency: 'EUR' | 'AOA'
  reserved_amount: number
  status: 'active' | 'partially_released' | 'fully_released'
  created_at: string
}

/**
 * Release fund reservation function parameters
 */
export interface ReleaseFundReservationParams {
  p_reservation_id: string
  p_amount?: number
}

/**
 * Trade execution function parameters
 */
export interface ExecuteTradeParams {
  p_buy_order_id: string
  p_sell_order_id: string
  p_quantity: number
  p_price: number
}

/**
 * Trade execution result
 */
export interface TradeExecutionResult {
  trade_id: string
  buy_order_id: string
  sell_order_id: string
  buyer_id: string
  seller_id: string
  quantity: number
  price: number
  buyer_fee: number
  seller_fee: number
  base_amount: number
  quote_amount: number
  executed_at: string
}

/**
 * Wallet balance query result
 */
export interface WalletBalance {
  currency: 'EUR' | 'AOA'
  available_balance: number
  reserved_balance: number
  updated_at: string
}

/**
 * Database function error type
 */
export interface DatabaseError {
  message: string
  code?: string
  details?: string
  hint?: string
}

/**
 * Generic database function result
 */
export interface DatabaseResult<T> {
  data: T | null
  error: DatabaseError | null
}

// ===== DYNAMIC PRICING TYPES =====

/**
 * VWAP calculation parameters
 */
export interface VWAPCalculationParams {
  p_base_currency: 'EUR' | 'AOA'
  p_quote_currency: 'EUR' | 'AOA'
  p_hours?: number
}

/**
 * VWAP calculation result
 */
export interface VWAPCalculationResult {
  vwap: number | null
  total_volume: number
  trade_count: number
  calculation_period: string
}

/**
 * Dynamic price calculation parameters
 */
export interface DynamicPriceCalculationParams {
  p_order_id: string
  p_base_currency: 'EUR' | 'AOA'
  p_quote_currency: 'EUR' | 'AOA'
  p_original_price: number
  p_current_price: number
}

/**
 * Dynamic price calculation result
 */
export interface DynamicPriceCalculationResult {
  suggested_price: number
  price_source: string
  vwap_reference: number | null
  competitive_margin: number
  price_change_percentage: number
  update_recommended: boolean
}

/**
 * Dynamic pricing toggle parameters
 */
export interface ToggleDynamicPricingParams {
  p_order_id: string
  p_user_id: string
  p_enable: boolean
}

/**
 * Dynamic pricing toggle result
 */
export interface ToggleDynamicPricingResult {
  success: boolean
  message: string
  current_price: number
  original_price: number
}

/**
 * Price update result
 */
export interface UpdateDynamicOrderPriceResult {
  order_id: string
  old_price: number
  new_price: number
  price_change_percentage: number
  update_reason: string
  success: boolean
  message: string
}

/**
 * Batch processing result
 */
export interface ProcessAllDynamicPricingResult {
  total_orders_processed: number
  orders_updated: number
  orders_unchanged: number
  processing_duration: string
  update_summary: any[]
}

/**
 * Database function names enum
 */
export enum DatabaseFunction {
  PLACE_ORDER = 'place_order',
  CANCEL_ORDER = 'cancel_order',
  MATCH_ORDER = 'match_order',
  // REMOVED: GET_USER_ORDERS, GET_ORDER_DETAILS (broken functions)
  GET_BEST_PRICES = 'get_best_prices',
  GET_ORDER_BOOK_DEPTH = 'get_order_book_depth',
  GET_RECENT_TRADES = 'get_recent_trades',
  CREATE_FUND_RESERVATION = 'create_fund_reservation',
  RELEASE_FUND_RESERVATION = 'release_fund_reservation',
  EXECUTE_TRADE_ENHANCED = 'execute_trade_enhanced',
  GET_USER_WALLET_BALANCES_SECURE = 'get_user_wallet_balances_secure',

  // Dynamic Pricing Functions
  CALCULATE_VWAP = 'calculate_vwap',
  CALCULATE_DYNAMIC_PRICE = 'calculate_dynamic_price',
  UPDATE_DYNAMIC_ORDER_PRICE = 'update_dynamic_order_price',
  TOGGLE_DYNAMIC_PRICING = 'toggle_dynamic_pricing',
  PROCESS_ALL_DYNAMIC_PRICING_UPDATES = 'process_all_dynamic_pricing_updates'
}

/**
 * Function parameter mapping
 */
export type FunctionParams = {
  [DatabaseFunction.PLACE_ORDER]: PlaceOrderParams
  [DatabaseFunction.CANCEL_ORDER]: CancelOrderParams
  [DatabaseFunction.GET_USER_ORDERS]: GetUserOrdersParams
  [DatabaseFunction.GET_BEST_PRICES]: GetBestPricesParams
  [DatabaseFunction.GET_ORDER_BOOK_DEPTH]: GetOrderBookDepthParams
  [DatabaseFunction.GET_RECENT_TRADES]: GetRecentTradesParams
  [DatabaseFunction.CREATE_FUND_RESERVATION]: CreateFundReservationParams
  [DatabaseFunction.RELEASE_FUND_RESERVATION]: ReleaseFundReservationParams
  [DatabaseFunction.EXECUTE_TRADE_ENHANCED]: ExecuteTradeParams
}

/**
 * Function result mapping
 */
export type FunctionResults = {
  [DatabaseFunction.PLACE_ORDER]: PlaceOrderResult
  [DatabaseFunction.CANCEL_ORDER]: CancelOrderResult
  [DatabaseFunction.GET_USER_ORDERS]: OrderDetails[]
  [DatabaseFunction.GET_BEST_PRICES]: BestPricesResult
  [DatabaseFunction.GET_ORDER_BOOK_DEPTH]: OrderBookDepthEntry[]
  [DatabaseFunction.GET_RECENT_TRADES]: TradeDetails[]
  [DatabaseFunction.CREATE_FUND_RESERVATION]: FundReservationResult
  [DatabaseFunction.RELEASE_FUND_RESERVATION]: FundReservationResult
  [DatabaseFunction.EXECUTE_TRADE_ENHANCED]: TradeExecutionResult
  [DatabaseFunction.GET_USER_WALLET_BALANCES_SECURE]: WalletBalance[]
}
