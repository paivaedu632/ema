// Order Book API Endpoint
// GET /api/market/order-book - Get current order book for a currency pair

import { NextRequest } from 'next/server'
import { createSuccessResponse } from '@/lib/api-response'
import { handleApiError } from '@/lib/error-handler'
import { supabaseAdmin } from '@/lib/supabase-server'
import { createApiError, ErrorCategory, ErrorSeverity } from '@/lib/error-handler'

/**
 * GET /api/market/order-book
 * Get current order book for a currency pair
 * 
 * Query Parameters:
 * - base_currency: string (EUR | AOA) - Base currency
 * - quote_currency: string (EUR | AOA) - Quote currency
 * - depth: number (optional, default: 20) - Number of levels to return
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "asks": [
 *       {
 *         "price": number,
 *         "quantity": number,
 *         "total": number,
 *         "order_count": number
 *       }
 *     ],
 *     "bids": [
 *       {
 *         "price": number,
 *         "quantity": number,
 *         "total": number,
 *         "order_count": number
 *       }
 *     ],
 *     "spread": number,
 *     "spread_percentage": number,
 *     "last_update": string
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const baseCurrency = url.searchParams.get('base_currency')
    const quoteCurrency = url.searchParams.get('quote_currency')
    const depth = parseInt(url.searchParams.get('depth') || '20')

    // Validate parameters
    if (!baseCurrency || !quoteCurrency) {
      throw createApiError(
        'Parâmetros base_currency e quote_currency são obrigatórios',
        400,
        ErrorCategory.VALIDATION,
        ErrorSeverity.LOW
      )
    }

    if (!['EUR', 'AOA'].includes(baseCurrency) || !['EUR', 'AOA'].includes(quoteCurrency)) {
      throw createApiError(
        'Moedas suportadas: EUR, AOA',
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

    // Get order book data using database function
    const { data: orderBookData, error: orderBookError } = await supabaseAdmin
      .rpc('get_order_book_depth', {
        p_base_currency: baseCurrency,
        p_quote_currency: quoteCurrency,
        p_depth: depth
      })

    if (orderBookError) {
      throw createApiError(
        `Erro ao buscar livro de ofertas: ${orderBookError.message}`,
        500,
        ErrorCategory.DATABASE,
        ErrorSeverity.HIGH
      )
    }

    // Process the data
    const asks = orderBookData?.filter((level: any) => level.side === 'sell') || []
    const bids = orderBookData?.filter((level: any) => level.side === 'buy') || []

    // Sort asks ascending (lowest price first) and bids descending (highest price first)
    asks.sort((a: any, b: any) => a.price - b.price)
    bids.sort((a: any, b: any) => b.price - a.price)

    // Calculate spread
    const bestAsk = asks[0]?.price
    const bestBid = bids[0]?.price
    const spread = bestAsk && bestBid ? bestAsk - bestBid : 0
    const spreadPercentage = bestBid && spread ? (spread / bestBid) * 100 : 0

    // Format response
    const response = {
      asks: asks.map((level: any) => ({
        price: level.price,
        quantity: level.quantity,
        total: level.total,
        order_count: level.order_count
      })),
      bids: bids.map((level: any) => ({
        price: level.price,
        quantity: level.quantity,
        total: level.total,
        order_count: level.order_count
      })),
      spread,
      spread_percentage: spreadPercentage,
      last_update: new Date().toISOString(),
      market_info: {
        base_currency: baseCurrency,
        quote_currency: quoteCurrency,
        depth_requested: depth,
        ask_levels: asks.length,
        bid_levels: bids.length,
        best_ask: bestAsk || null,
        best_bid: bestBid || null
      }
    }

    return createSuccessResponse(
      response,
      'Livro de ofertas recuperado com sucesso'
    )

  } catch (error) {
    return handleApiError(error, { 
      endpoint: 'GET /api/market/order-book'
    })
  }
}
