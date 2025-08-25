// EmaPay Market Analytics Service
// Advanced market data aggregation and analytics

import { 
  getRecentTrades, 
  getBestPrices, 
  getOrderBookDepth 
} from '@/lib/supabase-server'
import {
  CurrencyPair,
  PriceCandle,
  MarketDepth,
  MarketStats
} from '@/types/market-data'
import { createApiError, ErrorCategory, ErrorSeverity } from '@/lib/error-handler'

/**
 * Time intervals for data aggregation
 */
export type TimeInterval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d'

/**
 * Market analytics data
 */
export interface MarketAnalytics {
  pair: CurrencyPair
  interval: TimeInterval
  candles: PriceCandle[]
  volume: {
    total: number
    average: number
    trend: 'increasing' | 'decreasing' | 'stable'
  }
  volatility: {
    price: number
    volume: number
    score: number // 0-100
  }
  liquidity: {
    bidDepth: number
    askDepth: number
    spread: number
    spreadPercentage: number
    score: number // 0-100
  }
  momentum: {
    rsi: number // Relative Strength Index
    macd: number // MACD indicator
    trend: 'bullish' | 'bearish' | 'neutral'
  }
  timestamp: string
}

/**
 * Convert currency pair string to database format
 */
function parseCurrencyPair(pair: CurrencyPair): { base: 'EUR' | 'AOA', quote: 'EUR' | 'AOA' } {
  const [base, quote] = pair.split('-') as ['EUR' | 'AOA', 'EUR' | 'AOA']
  return { base, quote }
}

/**
 * Get time interval in milliseconds
 */
function getIntervalMs(interval: TimeInterval): number {
  const intervals = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000
  }
  return intervals[interval]
}

/**
 * Generate price candles from trade data
 */
export async function generatePriceCandles(
  pair: CurrencyPair,
  interval: TimeInterval,
  limit: number = 100
): Promise<PriceCandle[]> {
  try {
    const { base, quote } = parseCurrencyPair(pair)
    
    // Get recent trades
    const trades = await getRecentTrades({
      p_base_currency: base,
      p_quote_currency: quote,
      p_limit: 10000 // Get many trades for better candle generation
    })

    if (trades.length === 0) {
      return []
    }

    const intervalMs = getIntervalMs(interval)
    const now = Date.now()
    const startTime = now - (limit * intervalMs)

    // Group trades by time intervals
    const candleMap = new Map<number, {
      open: number
      high: number
      low: number
      close: number
      volume: number
      tradeCount: number
      timestamp: number
    }>()

    trades.forEach(trade => {
      const tradeTime = new Date(trade.executed_at).getTime()
      if (tradeTime < startTime) return

      // Calculate which interval this trade belongs to
      const intervalStart = Math.floor(tradeTime / intervalMs) * intervalMs

      if (!candleMap.has(intervalStart)) {
        candleMap.set(intervalStart, {
          open: trade.price,
          high: trade.price,
          low: trade.price,
          close: trade.price,
          volume: 0,
          tradeCount: 0,
          timestamp: intervalStart
        })
      }

      const candle = candleMap.get(intervalStart)!
      candle.high = Math.max(candle.high, trade.price)
      candle.low = Math.min(candle.low, trade.price)
      candle.close = trade.price // Most recent trade becomes close
      candle.volume += trade.quantity
      candle.tradeCount++
    })

    // Convert to array and sort by timestamp
    const candles = Array.from(candleMap.values())
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-limit) // Keep only the requested number of candles
      .map(candle => ({
        timestamp: new Date(candle.timestamp).toISOString(),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
        tradeCount: candle.tradeCount
      }))

    return candles

  } catch (error) {
    throw createApiError(
      `Failed to generate price candles for ${pair}`,
      500,
      ErrorCategory.DATABASE,
      ErrorSeverity.HIGH
    )
  }
}

/**
 * Calculate market depth analysis
 */
export async function calculateMarketDepth(
  pair: CurrencyPair,
  depthPercentage: number = 10
): Promise<MarketDepth> {
  try {
    const { base, quote } = parseCurrencyPair(pair)
    
    // Get order book and best prices
    const [orderBook, bestPrices] = await Promise.all([
      getOrderBookDepth({
        p_base_currency: base,
        p_quote_currency: quote,
        p_depth_limit: 100
      }),
      getBestPrices({
        p_base_currency: base,
        p_quote_currency: quote
      })
    ])

    // Separate bids and asks
    const bids = orderBook.filter(entry => entry.side === 'buy')
    const asks = orderBook.filter(entry => entry.side === 'sell')

    // Calculate total volumes
    const totalBidVolume = bids.reduce((sum, bid) => sum + bid.quantity, 0)
    const totalAskVolume = asks.reduce((sum, ask) => sum + ask.quantity, 0)

    // Calculate volume ratio and imbalance
    const volumeRatio = totalAskVolume > 0 ? totalBidVolume / totalAskVolume : 0
    const imbalance = (totalBidVolume - totalAskVolume) / (totalBidVolume + totalAskVolume)

    // Calculate mid price for depth analysis
    const midPrice = bestPrices.best_bid && bestPrices.best_ask 
      ? (bestPrices.best_bid + bestPrices.best_ask) / 2
      : null

    let depth1Percent = { bid: 0, ask: 0 }
    let depth5Percent = { bid: 0, ask: 0 }
    let depth10Percent = { bid: 0, ask: 0 }

    if (midPrice) {
      const price1Percent = midPrice * 0.01
      const price5Percent = midPrice * 0.05
      const price10Percent = midPrice * 0.10

      // Calculate bid depth
      bids.forEach(bid => {
        const priceDistance = midPrice - bid.price
        if (priceDistance <= price1Percent) depth1Percent.bid += bid.quantity
        if (priceDistance <= price5Percent) depth5Percent.bid += bid.quantity
        if (priceDistance <= price10Percent) depth10Percent.bid += bid.quantity
      })

      // Calculate ask depth
      asks.forEach(ask => {
        const priceDistance = ask.price - midPrice
        if (priceDistance <= price1Percent) depth1Percent.ask += ask.quantity
        if (priceDistance <= price5Percent) depth5Percent.ask += ask.quantity
        if (priceDistance <= price10Percent) depth10Percent.ask += ask.quantity
      })
    }

    return {
      pair,
      totalBidVolume,
      totalAskVolume,
      volumeRatio,
      imbalance,
      levels: {
        depth1Percent,
        depth5Percent,
        depth10Percent
      },
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    throw createApiError(
      `Failed to calculate market depth for ${pair}`,
      500,
      ErrorCategory.DATABASE,
      ErrorSeverity.HIGH
    )
  }
}

/**
 * Calculate technical indicators
 */
export function calculateTechnicalIndicators(candles: PriceCandle[]) {
  if (candles.length < 14) {
    return {
      rsi: 50, // Neutral RSI
      macd: 0,
      trend: 'neutral' as const
    }
  }

  // Calculate RSI (Relative Strength Index)
  const rsi = calculateRSI(candles, 14)
  
  // Calculate MACD (Moving Average Convergence Divergence)
  const macd = calculateMACD(candles)
  
  // Determine trend
  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral'
  if (rsi > 70 && macd > 0) trend = 'bullish'
  else if (rsi < 30 && macd < 0) trend = 'bearish'

  return { rsi, macd, trend }
}

/**
 * Calculate RSI indicator
 */
function calculateRSI(candles: PriceCandle[], period: number = 14): number {
  if (candles.length < period + 1) return 50

  let gains = 0
  let losses = 0

  // Calculate initial average gain and loss
  for (let i = 1; i <= period; i++) {
    const change = candles[i].close - candles[i - 1].close
    if (change > 0) gains += change
    else losses += Math.abs(change)
  }

  const avgGain = gains / period
  const avgLoss = losses / period

  if (avgLoss === 0) return 100
  
  const rs = avgGain / avgLoss
  return 100 - (100 / (1 + rs))
}

/**
 * Calculate MACD indicator
 */
function calculateMACD(candles: PriceCandle[]): number {
  if (candles.length < 26) return 0

  // Calculate EMAs
  const ema12 = calculateEMA(candles.map(c => c.close), 12)
  const ema26 = calculateEMA(candles.map(c => c.close), 26)

  return ema12 - ema26
}

/**
 * Calculate Exponential Moving Average
 */
function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0

  const multiplier = 2 / (period + 1)
  let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period

  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] * multiplier) + (ema * (1 - multiplier))
  }

  return ema
}

/**
 * Calculate volatility metrics
 */
export function calculateVolatility(candles: PriceCandle[]) {
  if (candles.length < 2) {
    return {
      price: 0,
      volume: 0,
      score: 0
    }
  }

  // Calculate price volatility (standard deviation of returns)
  const returns = candles.slice(1).map((candle, i) => 
    (candle.close - candles[i].close) / candles[i].close
  )

  const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length
  const priceVolatility = Math.sqrt(variance) * 100 // Convert to percentage

  // Calculate volume volatility
  const volumes = candles.map(c => c.volume)
  const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length
  const volumeVariance = volumes.reduce((sum, vol) => sum + Math.pow(vol - avgVolume, 2), 0) / volumes.length
  const volumeVolatility = Math.sqrt(volumeVariance) / avgVolume * 100

  // Calculate volatility score (0-100)
  const volatilityScore = Math.min(100, (priceVolatility + volumeVolatility) * 10)

  return {
    price: priceVolatility,
    volume: volumeVolatility,
    score: volatilityScore
  }
}

/**
 * Generate comprehensive market analytics
 */
export async function generateMarketAnalytics(
  pair: CurrencyPair,
  interval: TimeInterval = '1h',
  limit: number = 100
): Promise<MarketAnalytics> {
  try {
    // Generate price candles
    const candles = await generatePriceCandles(pair, interval, limit)
    
    // Calculate market depth
    const marketDepth = await calculateMarketDepth(pair)
    
    // Calculate technical indicators
    const momentum = calculateTechnicalIndicators(candles)
    
    // Calculate volatility
    const volatility = calculateVolatility(candles)
    
    // Calculate volume metrics
    const totalVolume = candles.reduce((sum, candle) => sum + candle.volume, 0)
    const avgVolume = candles.length > 0 ? totalVolume / candles.length : 0
    
    // Determine volume trend
    let volumeTrend: 'increasing' | 'decreasing' | 'stable' = 'stable'
    if (candles.length >= 10) {
      const recentVolume = candles.slice(-5).reduce((sum, c) => sum + c.volume, 0) / 5
      const olderVolume = candles.slice(-10, -5).reduce((sum, c) => sum + c.volume, 0) / 5
      
      if (recentVolume > olderVolume * 1.1) volumeTrend = 'increasing'
      else if (recentVolume < olderVolume * 0.9) volumeTrend = 'decreasing'
    }
    
    // Calculate liquidity score
    const liquidityScore = Math.min(100, 
      (marketDepth.totalBidVolume + marketDepth.totalAskVolume) / 1000 * 10
    )

    return {
      pair,
      interval,
      candles,
      volume: {
        total: totalVolume,
        average: avgVolume,
        trend: volumeTrend
      },
      volatility,
      liquidity: {
        bidDepth: marketDepth.totalBidVolume,
        askDepth: marketDepth.totalAskVolume,
        spread: marketDepth.totalBidVolume > 0 && marketDepth.totalAskVolume > 0 
          ? Math.abs(marketDepth.totalBidVolume - marketDepth.totalAskVolume) 
          : 0,
        spreadPercentage: marketDepth.volumeRatio > 0 
          ? Math.abs(1 - marketDepth.volumeRatio) * 100 
          : 0,
        score: liquidityScore
      },
      momentum,
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    throw createApiError(
      `Failed to generate market analytics for ${pair}`,
      500,
      ErrorCategory.DATABASE,
      ErrorSeverity.HIGH
    )
  }
}
