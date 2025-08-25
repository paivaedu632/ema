// EmaPay Market Data Types
// Type definitions for market data APIs and real-time features

/**
 * Currency pair representation
 */
export type CurrencyPair = 'EUR-AOA' | 'AOA-EUR'

/**
 * Market ticker information
 */
export interface MarketTicker {
  /** Currency pair */
  pair: CurrencyPair
  /** Current best bid price */
  bid: number | null
  /** Current best ask price */
  ask: number | null
  /** Spread between bid and ask */
  spread: number | null
  /** Spread as percentage */
  spreadPercentage: number | null
  /** Last trade price */
  lastPrice: number | null
  /** 24h price change */
  change24h: number | null
  /** 24h price change percentage */
  changePercentage24h: number | null
  /** 24h trading volume in base currency */
  volume24h: number
  /** 24h trading volume in quote currency */
  volumeQuote24h: number
  /** 24h high price */
  high24h: number | null
  /** 24h low price */
  low24h: number | null
  /** Number of trades in 24h */
  tradeCount24h: number
  /** Last update timestamp */
  timestamp: string
}

/**
 * Order book level (price level with aggregated quantity)
 */
export interface OrderBookLevel {
  /** Price level */
  price: number
  /** Total quantity at this price level */
  quantity: number
  /** Total value (price * quantity) */
  total: number
  /** Number of orders at this price level */
  orderCount: number
}

/**
 * Order book snapshot
 */
export interface OrderBookSnapshot {
  /** Currency pair */
  pair: CurrencyPair
  /** Buy orders (bids) - sorted by price descending */
  bids: OrderBookLevel[]
  /** Sell orders (asks) - sorted by price ascending */
  asks: OrderBookLevel[]
  /** Snapshot timestamp */
  timestamp: string
  /** Sequence number for real-time updates */
  sequence: number
}

/**
 * Recent trade information
 */
export interface RecentTrade {
  /** Trade ID */
  id: string
  /** Currency pair */
  pair: CurrencyPair
  /** Trade price */
  price: number
  /** Trade quantity */
  quantity: number
  /** Trade side from taker perspective */
  side: 'buy' | 'sell'
  /** Base currency amount */
  baseAmount: number
  /** Quote currency amount */
  quoteAmount: number
  /** Trade execution timestamp */
  timestamp: string
}

/**
 * Market statistics for a time period
 */
export interface MarketStats {
  /** Currency pair */
  pair: CurrencyPair
  /** Time period */
  period: '1h' | '24h' | '7d' | '30d'
  /** Opening price */
  open: number | null
  /** Closing price */
  close: number | null
  /** Highest price */
  high: number | null
  /** Lowest price */
  low: number | null
  /** Trading volume in base currency */
  volume: number
  /** Trading volume in quote currency */
  volumeQuote: number
  /** Number of trades */
  tradeCount: number
  /** Volume-weighted average price */
  vwap: number | null
  /** Price change */
  change: number | null
  /** Price change percentage */
  changePercentage: number | null
  /** Statistics timestamp */
  timestamp: string
}

/**
 * Price history data point (OHLCV)
 */
export interface PriceCandle {
  /** Candle timestamp */
  timestamp: string
  /** Opening price */
  open: number
  /** Highest price */
  high: number
  /** Lowest price */
  low: number
  /** Closing price */
  close: number
  /** Trading volume */
  volume: number
  /** Number of trades */
  tradeCount: number
}

/**
 * Market depth analysis
 */
export interface MarketDepth {
  /** Currency pair */
  pair: CurrencyPair
  /** Total bid volume */
  totalBidVolume: number
  /** Total ask volume */
  totalAskVolume: number
  /** Bid/ask volume ratio */
  volumeRatio: number
  /** Market depth imbalance */
  imbalance: number
  /** Depth levels */
  levels: {
    /** Depth at 1% from mid price */
    depth1Percent: { bid: number; ask: number }
    /** Depth at 5% from mid price */
    depth5Percent: { bid: number; ask: number }
    /** Depth at 10% from mid price */
    depth10Percent: { bid: number; ask: number }
  }
  /** Analysis timestamp */
  timestamp: string
}

/**
 * Market status information
 */
export interface MarketStatus {
  /** Currency pair */
  pair: CurrencyPair
  /** Market status */
  status: 'active' | 'inactive' | 'maintenance'
  /** Last trade timestamp */
  lastTradeTime: string | null
  /** Last order book update */
  lastOrderBookUpdate: string | null
  /** Market health score (0-100) */
  healthScore: number
  /** Active orders count */
  activeOrders: number
  /** Status timestamp */
  timestamp: string
}

/**
 * Real-time market data subscription
 */
export interface MarketDataSubscription {
  /** Subscription ID */
  id: string
  /** Currency pair */
  pair: CurrencyPair
  /** Data types to subscribe to */
  channels: ('ticker' | 'orderbook' | 'trades' | 'stats')[]
  /** Subscription timestamp */
  timestamp: string
}

/**
 * WebSocket message types
 */
export type WebSocketMessageType = 
  | 'subscribe'
  | 'unsubscribe'
  | 'ticker_update'
  | 'orderbook_update'
  | 'trade_update'
  | 'stats_update'
  | 'error'
  | 'heartbeat'

/**
 * WebSocket message structure
 */
export interface WebSocketMessage {
  /** Message type */
  type: WebSocketMessageType
  /** Currency pair (if applicable) */
  pair?: CurrencyPair
  /** Message data */
  data?: any
  /** Message timestamp */
  timestamp: string
  /** Sequence number */
  sequence?: number
}

/**
 * Market data API response wrapper
 */
export interface MarketDataResponse<T> {
  /** Success status */
  success: true
  /** Response data */
  data: T
  /** Response timestamp */
  timestamp: string
  /** Cache information */
  cache?: {
    /** Whether data is from cache */
    cached: boolean
    /** Cache expiry time */
    expiresAt: string
  }
}

/**
 * Market data query parameters
 */
export interface MarketDataQuery {
  /** Currency pair */
  pair?: CurrencyPair
  /** Limit number of results */
  limit?: number
  /** Start time for historical data */
  from?: string
  /** End time for historical data */
  to?: string
  /** Time interval for aggregated data */
  interval?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d'
}

/**
 * Rate limiting information
 */
export interface RateLimitInfo {
  /** Requests remaining in current window */
  remaining: number
  /** Total requests allowed per window */
  limit: number
  /** Window reset time */
  resetTime: string
  /** Current window start time */
  windowStart: string
}
