// VWAP Calculation API Endpoint
// GET /api/market/vwap/[pair] - Get Volume Weighted Average Price for a currency pair

import { NextRequest } from 'next/server'
import { createSuccessResponse } from '@/lib/api-response'
import { handleApiError } from '@/lib/error-handler'
import { validateQueryParams, VWAPQuerySchema } from '@/lib/validation'
import { supabaseAdmin } from '@/lib/supabase-server'
import { createApiError, ErrorCategory, ErrorSeverity } from '@/lib/error-handler'

/**
 * GET /api/market/vwap/[pair]
 * Calculate Volume Weighted Average Price for a currency pair
 * 
 * Path Parameters:
 * - pair: string - Currency pair (e.g., "EUR-AOA", "AOA-EUR")
 * 
 * Query Parameters:
 * - hours: number (1-168, default: 12) - Hours of trade history to include
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "pair": string,
 *     "vwap": number,
 *     "total_volume": number,
 *     "trade_count": number,
 *     "calculation_period": string,
 *     "calculation_hours": number,
 *     "price_range": {
 *       "min_price": number,
 *       "max_price": number,
 *       "price_spread": number
 *     },
 *     "market_activity": {
 *       "active": boolean,
 *       "sufficient_volume": boolean,
 *       "data_quality": "excellent" | "good" | "limited" | "insufficient"
 *     },
 *     "calculated_at": string
 *   }
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { pair: string } }
) {
  try {
    // 1. Validate currency pair format
    const pairParts = params.pair.split('-')
    if (pairParts.length !== 2) {
      throw createApiError(
        'Formato de par de moedas inválido. Use formato: EUR-AOA ou AOA-EUR',
        400,
        ErrorCategory.VALIDATION,
        ErrorSeverity.LOW
      )
    }

    const [baseCurrency, quoteCurrency] = pairParts
    
    // Validate supported currencies
    if (!['EUR', 'AOA'].includes(baseCurrency) || !['EUR', 'AOA'].includes(quoteCurrency)) {
      throw createApiError(
        'Par de moedas não suportado. Pares disponíveis: EUR-AOA, AOA-EUR',
        400,
        ErrorCategory.VALIDATION,
        ErrorSeverity.LOW
      )
    }

    if (baseCurrency === quoteCurrency) {
      throw createApiError(
        'Moedas base e cotação devem ser diferentes',
        400,
        ErrorCategory.VALIDATION,
        ErrorSeverity.LOW
      )
    }

    // 2. Validate query parameters
    const url = new URL(request.url)
    const queryParams = {
      pair: params.pair,
      hours: url.searchParams.get('hours') || '12'
    }
    
    const validatedQuery = validateQueryParams(VWAPQuerySchema, queryParams)

    // 3. Calculate VWAP using database function
    const { data: vwapData, error: vwapError } = await supabaseAdmin.rpc('calculate_vwap', {
      p_base_currency: baseCurrency,
      p_quote_currency: quoteCurrency,
      p_hours: validatedQuery.hours
    })

    if (vwapError) {
      throw createApiError(
        `Erro ao calcular VWAP: ${vwapError.message}`,
        500,
        ErrorCategory.DATABASE,
        ErrorSeverity.HIGH
      )
    }

    if (!vwapData || vwapData.length === 0) {
      throw createApiError(
        'Dados insuficientes para calcular VWAP',
        404,
        ErrorCategory.NOT_FOUND,
        ErrorSeverity.MEDIUM
      )
    }

    const vwapResult = vwapData[0]

    // 4. Get additional price statistics
    const cutoffTime = new Date(Date.now() - validatedQuery.hours * 60 * 60 * 1000).toISOString()
    
    const { data: priceStats, error: statsError } = await supabaseAdmin
      .from('trades')
      .select('price')
      .eq('base_currency', baseCurrency)
      .eq('quote_currency', quoteCurrency)
      .gte('executed_at', cutoffTime)
      .order('price', { ascending: true })

    let priceRange = null
    if (!statsError && priceStats && priceStats.length > 0) {
      const prices = priceStats.map(trade => trade.price)
      const minPrice = Math.min(...prices)
      const maxPrice = Math.max(...prices)
      
      priceRange = {
        min_price: minPrice,
        max_price: maxPrice,
        price_spread: maxPrice - minPrice,
        spread_percentage: minPrice > 0 ? ((maxPrice - minPrice) / minPrice) * 100 : 0
      }
    }

    // 5. Determine market activity and data quality
    const marketActivity = {
      active: vwapResult.trade_count > 0,
      sufficient_volume: vwapResult.total_volume >= 100, // Configurable threshold
      data_quality: getDataQuality(vwapResult.trade_count, vwapResult.total_volume)
    }

    // 6. Return VWAP calculation results
    return createSuccessResponse(
      {
        pair: params.pair,
        vwap: vwapResult.vwap,
        total_volume: vwapResult.total_volume,
        trade_count: vwapResult.trade_count,
        calculation_period: vwapResult.calculation_period,
        calculation_hours: validatedQuery.hours,
        price_range: priceRange,
        market_activity: marketActivity,
        calculated_at: new Date().toISOString(),
        data_source: {
          cutoff_time: cutoffTime,
          base_currency: baseCurrency,
          quote_currency: quoteCurrency
        }
      },
      'VWAP calculado com sucesso'
    )

  } catch (error) {
    return handleApiError(error, { 
      endpoint: `GET /api/market/vwap/${params.pair}`
    })
  }
}

/**
 * Determine data quality based on trade count and volume
 */
function getDataQuality(tradeCount: number, totalVolume: number): string {
  if (tradeCount >= 20 && totalVolume >= 1000) {
    return 'excellent'
  } else if (tradeCount >= 10 && totalVolume >= 500) {
    return 'good'
  } else if (tradeCount >= 3 && totalVolume >= 100) {
    return 'limited'
  } else {
    return 'insufficient'
  }
}
