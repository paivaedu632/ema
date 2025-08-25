// EmaPay Market Data Service
// Service layer for market data aggregation and processing

import { 
  getBestPrices, 
  getOrderBookDepth, 
  getRecentTrades,
  OrderBookFunctions 
} from '@/lib/supabase-server'
import {
  MarketTicker,
  OrderBookSnapshot,
  RecentTrade,
  MarketStats,
  MarketDepth,
  MarketStatus,
  CurrencyPair,
  OrderBookLevel
} from '@/types/market-data'
import { createApiError, ErrorCategory, ErrorSeverity } from '@/lib/error-handler'

/**
 * Convert currency pair string to database format
 */
function parseCurrencyPair(pair: CurrencyPair): { base: 'EUR' | 'AOA', quote: 'EUR' | 'AOA' } {
  const [base, quote] = pair.split('-') as ['EUR' | 'AOA', 'EUR' | 'AOA']
  return { base, quote }
}

/**
 * Get market ticker information for a currency pair
 */
export async function getMarketTicker(pair: CurrencyPair): Promise<MarketTicker> {
  try {
    const { base, quote } = parseCurrencyPair(pair)
    
    // Get best prices
    const bestPrices = await getBestPrices({
      p_base_currency: base,
      p_quote_currency: quote
    })
    
    // Get recent trades for 24h statistics
    const recentTrades = await getRecentTrades({
      p_base_currency: base,
      p_quote_currency: quote,
      p_limit: 1000 // Get more trades for better statistics
    })
    
    // Calculate 24h statistics
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    
    const trades24h = recentTrades.filter(trade => 
      new Date(trade.executed_at) >= yesterday
    )
    
    let volume24h = 0
    let volumeQuote24h = 0
    let high24h: number | null = null
    let low24h: number | null = null
    let lastPrice: number | null = null
    let change24h: number | null = null
    let changePercentage24h: number | null = null
    
    if (trades24h.length > 0) {
      // Calculate volume
      volume24h = trades24h.reduce((sum, trade) => sum + trade.quantity, 0)
      volumeQuote24h = trades24h.reduce((sum, trade) => sum + (trade.quantity * trade.price), 0)
      
      // Calculate high/low
      const prices = trades24h.map(trade => trade.price)
      high24h = Math.max(...prices)
      low24h = Math.min(...prices)
      
      // Get last price and calculate change
      lastPrice = trades24h[0].price // Most recent trade
      const firstPrice = trades24h[trades24h.length - 1].price // Oldest trade in 24h
      
      if (firstPrice && lastPrice) {
        change24h = lastPrice - firstPrice
        changePercentage24h = (change24h / firstPrice) * 100
      }
    }
    
    // Calculate spread
    let spread: number | null = null
    let spreadPercentage: number | null = null
    
    if (bestPrices.best_bid && bestPrices.best_ask) {
      spread = bestPrices.best_ask - bestPrices.best_bid
      const midPrice = (bestPrices.best_ask + bestPrices.best_bid) / 2
      spreadPercentage = (spread / midPrice) * 100
    }
    
    return {
      pair,
      bid: bestPrices.best_bid,
      ask: bestPrices.best_ask,
      spread,
      spreadPercentage,
      lastPrice,
      change24h,
      changePercentage24h,
      volume24h,
      volumeQuote24h,
      high24h,
      low24h,
      tradeCount24h: trades24h.length,
      timestamp: new Date().toISOString()
    }
    
  } catch (error) {
    throw createApiError(
      `Failed to get market ticker for ${pair}`,
      500,
      ErrorCategory.DATABASE,
      ErrorSeverity.HIGH
    )
  }
}

/**
 * Get order book snapshot for a currency pair
 */
export async function getOrderBookSnapshot(
  pair: CurrencyPair, 
  limit: number = 20
): Promise<OrderBookSnapshot> {
  try {
    const { base, quote } = parseCurrencyPair(pair)
    
    const orderBookData = await getOrderBookDepth({
      p_base_currency: base,
      p_quote_currency: quote,
      p_depth_limit: limit
    })
    
    // Separate bids and asks
    const bids: OrderBookLevel[] = []
    const asks: OrderBookLevel[] = []
    
    orderBookData.forEach(entry => {
      const level: OrderBookLevel = {
        price: entry.price,
        quantity: entry.quantity,
        total: entry.total,
        orderCount: entry.order_count
      }
      
      if (entry.side === 'buy') {
        bids.push(level)
      } else {
        asks.push(level)
      }
    })
    
    // Sort bids by price descending, asks by price ascending
    bids.sort((a, b) => b.price - a.price)
    asks.sort((a, b) => a.price - b.price)
    
    return {
      pair,
      bids,
      asks,
      timestamp: new Date().toISOString(),
      sequence: Date.now() // Simple sequence number
    }
    
  } catch (error) {
    throw createApiError(
      `Failed to get order book for ${pair}`,
      500,
      ErrorCategory.DATABASE,
      ErrorSeverity.HIGH
    )
  }
}

/**
 * Get recent trades for a currency pair
 */
export async function getRecentTradesForPair(
  pair: CurrencyPair,
  limit: number = 100
): Promise<RecentTrade[]> {
  try {
    const { base, quote } = parseCurrencyPair(pair)
    
    const tradesData = await getRecentTrades({
      p_base_currency: base,
      p_quote_currency: quote,
      p_limit: limit
    })
    
    return tradesData.map(trade => ({
      id: trade.trade_id,
      pair,
      price: trade.price,
      quantity: trade.quantity,
      side: trade.quantity > 0 ? 'buy' : 'sell', // Simplified logic
      baseAmount: trade.base_amount,
      quoteAmount: trade.quote_amount,
      timestamp: trade.executed_at
    }))
    
  } catch (error) {
    throw createApiError(
      `Failed to get recent trades for ${pair}`,
      500,
      ErrorCategory.DATABASE,
      ErrorSeverity.HIGH
    )
  }
}

/**
 * Get market statistics for a currency pair
 */
export async function getMarketStatistics(
  pair: CurrencyPair,
  period: '1h' | '24h' | '7d' | '30d' = '24h'
): Promise<MarketStats> {
  try {
    const { base, quote } = parseCurrencyPair(pair)
    
    // Calculate time range
    const now = new Date()
    let fromTime: Date
    
    switch (period) {
      case '1h':
        fromTime = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case '24h':
        fromTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        fromTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        fromTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
    }
    
    // Get trades for the period
    const tradesData = await getRecentTrades({
      p_base_currency: base,
      p_quote_currency: quote,
      p_limit: 10000 // Get many trades for statistics
    })
    
    const periodTrades = tradesData.filter(trade => 
      new Date(trade.executed_at) >= fromTime
    )
    
    if (periodTrades.length === 0) {
      return {
        pair,
        period,
        open: null,
        close: null,
        high: null,
        low: null,
        volume: 0,
        volumeQuote: 0,
        tradeCount: 0,
        vwap: null,
        change: null,
        changePercentage: null,
        timestamp: new Date().toISOString()
      }
    }
    
    // Sort trades by time
    periodTrades.sort((a, b) => 
      new Date(a.executed_at).getTime() - new Date(b.executed_at).getTime()
    )
    
    const prices = periodTrades.map(trade => trade.price)
    const open = periodTrades[0].price
    const close = periodTrades[periodTrades.length - 1].price
    const high = Math.max(...prices)
    const low = Math.min(...prices)
    
    const volume = periodTrades.reduce((sum, trade) => sum + trade.quantity, 0)
    const volumeQuote = periodTrades.reduce((sum, trade) => 
      sum + (trade.quantity * trade.price), 0
    )
    
    // Calculate VWAP
    const vwap = volume > 0 ? volumeQuote / volume : null
    
    // Calculate change
    const change = close - open
    const changePercentage = (change / open) * 100
    
    return {
      pair,
      period,
      open,
      close,
      high,
      low,
      volume,
      volumeQuote,
      tradeCount: periodTrades.length,
      vwap,
      change,
      changePercentage,
      timestamp: new Date().toISOString()
    }
    
  } catch (error) {
    throw createApiError(
      `Failed to get market statistics for ${pair}`,
      500,
      ErrorCategory.DATABASE,
      ErrorSeverity.HIGH
    )
  }
}

/**
 * Get market status for a currency pair
 */
export async function getMarketStatus(pair: CurrencyPair): Promise<MarketStatus> {
  try {
    const { base, quote } = parseCurrencyPair(pair)
    
    // Get recent data to determine market health
    const [recentTrades, orderBook] = await Promise.all([
      getRecentTrades({
        p_base_currency: base,
        p_quote_currency: quote,
        p_limit: 10
      }),
      getOrderBookDepth({
        p_base_currency: base,
        p_quote_currency: quote,
        p_depth_limit: 10
      })
    ])
    
    const lastTradeTime = recentTrades.length > 0 ? recentTrades[0].executed_at : null
    const activeOrders = orderBook.length
    
    // Calculate health score based on activity
    let healthScore = 0
    
    // Recent trades contribute to health
    if (recentTrades.length > 0) {
      const lastTradeAge = Date.now() - new Date(recentTrades[0].executed_at).getTime()
      const hoursAge = lastTradeAge / (1000 * 60 * 60)
      
      if (hoursAge < 1) healthScore += 40
      else if (hoursAge < 24) healthScore += 20
      else if (hoursAge < 168) healthScore += 10
    }
    
    // Active orders contribute to health
    if (activeOrders > 10) healthScore += 30
    else if (activeOrders > 5) healthScore += 20
    else if (activeOrders > 0) healthScore += 10
    
    // Order book spread contributes to health
    const bestPrices = await getBestPrices({
      p_base_currency: base,
      p_quote_currency: quote
    })
    
    if (bestPrices.best_bid && bestPrices.best_ask) {
      const spread = bestPrices.best_ask - bestPrices.best_bid
      const midPrice = (bestPrices.best_ask + bestPrices.best_bid) / 2
      const spreadPercentage = (spread / midPrice) * 100
      
      if (spreadPercentage < 1) healthScore += 30
      else if (spreadPercentage < 5) healthScore += 20
      else if (spreadPercentage < 10) healthScore += 10
    }
    
    const status = healthScore > 50 ? 'active' : 'inactive'
    
    return {
      pair,
      status,
      lastTradeTime,
      lastOrderBookUpdate: orderBook.length > 0 ? new Date().toISOString() : null,
      healthScore: Math.min(healthScore, 100),
      activeOrders,
      timestamp: new Date().toISOString()
    }
    
  } catch (error) {
    throw createApiError(
      `Failed to get market status for ${pair}`,
      500,
      ErrorCategory.DATABASE,
      ErrorSeverity.HIGH
    )
  }
}
