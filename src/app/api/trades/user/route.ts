// User Trades API Endpoint
// GET /api/trades/user - Get user's trade history

import { NextRequest } from 'next/server'
import { getAuthenticatedUserFromRequest, createSuccessResponse } from '@/lib/api-utils'
import { handleApiError } from '@/lib/error-handler'
import { supabaseAdmin } from '@/lib/supabase-server'
import { createApiError, ErrorCategory, ErrorSeverity } from '@/lib/error-handler'

/**
 * GET /api/trades/user
 * Get user's trade history
 * 
 * Query Parameters:
 * - base_currency: string (optional) - Filter by base currency
 * - quote_currency: string (optional) - Filter by quote currency
 * - side: string (optional) - Filter by trade side (buy/sell)
 * - from_date: string (optional) - Filter trades from this date (ISO string)
 * - to_date: string (optional) - Filter trades to this date (ISO string)
 * - limit: number (optional, default: 20) - Number of trades to return
 * - offset: number (optional, default: 0) - Pagination offset
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": string,
 *       "order_id": string,
 *       "side": "buy" | "sell",
 *       "base_currency": string,
 *       "quote_currency": string,
 *       "quantity": number,
 *       "price": number,
 *       "total_amount": number,
 *       "fee_amount": number,
 *       "executed_at": string
 *     }
 *   ]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const authContext = await getAuthenticatedUserFromRequest(request)
    const user = authContext.user

    // 2. Parse query parameters
    const url = new URL(request.url)
    const baseCurrency = url.searchParams.get('base_currency')
    const quoteCurrency = url.searchParams.get('quote_currency')
    const side = url.searchParams.get('side')
    const fromDate = url.searchParams.get('from_date')
    const toDate = url.searchParams.get('to_date')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    // 3. Validate parameters
    if (limit > 100) {
      throw createApiError(
        'Limite máximo de 100 negociações por consulta',
        400,
        ErrorCategory.VALIDATION,
        ErrorSeverity.LOW
      )
    }

    if (side && !['buy', 'sell'].includes(side)) {
      throw createApiError(
        'Lado da negociação deve ser buy ou sell',
        400,
        ErrorCategory.VALIDATION,
        ErrorSeverity.LOW
      )
    }

    if (baseCurrency && !['EUR', 'AOA'].includes(baseCurrency)) {
      throw createApiError(
        'Moeda base deve ser EUR ou AOA',
        400,
        ErrorCategory.VALIDATION,
        ErrorSeverity.LOW
      )
    }

    if (quoteCurrency && !['EUR', 'AOA'].includes(quoteCurrency)) {
      throw createApiError(
        'Moeda de cotação deve ser EUR ou AOA',
        400,
        ErrorCategory.VALIDATION,
        ErrorSeverity.LOW
      )
    }

    // 4. Build query
    let query = supabaseAdmin
      .from('trades')
      .select(`
        id,
        order_id,
        side,
        base_currency,
        quote_currency,
        quantity,
        price,
        total_amount,
        fee_amount,
        executed_at,
        created_at
      `)
      .eq('user_id', user.id)
      .order('executed_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (baseCurrency) {
      query = query.eq('base_currency', baseCurrency)
    }

    if (quoteCurrency) {
      query = query.eq('quote_currency', quoteCurrency)
    }

    if (side) {
      query = query.eq('side', side)
    }

    if (fromDate) {
      query = query.gte('executed_at', fromDate)
    }

    if (toDate) {
      query = query.lte('executed_at', toDate)
    }

    // 5. Execute query
    const { data: trades, error: tradesError } = await query

    if (tradesError) {
      throw createApiError(
        `Erro ao buscar negociações: ${tradesError.message}`,
        500,
        ErrorCategory.DATABASE,
        ErrorSeverity.HIGH
      )
    }

    // 6. Get total count for pagination
    let countQuery = supabaseAdmin
      .from('trades')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    // Apply same filters for count
    if (baseCurrency) countQuery = countQuery.eq('base_currency', baseCurrency)
    if (quoteCurrency) countQuery = countQuery.eq('quote_currency', quoteCurrency)
    if (side) countQuery = countQuery.eq('side', side)
    if (fromDate) countQuery = countQuery.gte('executed_at', fromDate)
    if (toDate) countQuery = countQuery.lte('executed_at', toDate)

    const { count: totalCount, error: countError } = await countQuery

    if (countError) {
      console.warn('Failed to get total count:', countError.message)
    }

    // 7. Calculate summary statistics
    const totalVolume = trades?.reduce((sum, trade) => sum + trade.total_amount, 0) || 0
    const totalFees = trades?.reduce((sum, trade) => sum + (trade.fee_amount || 0), 0) || 0
    const buyTrades = trades?.filter(trade => trade.side === 'buy').length || 0
    const sellTrades = trades?.filter(trade => trade.side === 'sell').length || 0

    // 8. Return trades with summary
    return createSuccessResponse(
      trades || [],
      'Negociações recuperadas com sucesso',
      {
        pagination: {
          limit,
          offset,
          total: totalCount || 0,
          has_more: (totalCount || 0) > offset + limit
        },
        summary: {
          total_volume: totalVolume,
          total_fees: totalFees,
          buy_trades: buyTrades,
          sell_trades: sellTrades,
          total_trades: trades?.length || 0
        },
        filters: {
          base_currency: baseCurrency,
          quote_currency: quoteCurrency,
          side,
          from_date: fromDate,
          to_date: toDate
        }
      }
    )

  } catch (error) {
    return handleApiError(error, { 
      endpoint: 'GET /api/trades/user',
      userId: request.headers.get('x-user-id')
    })
  }
}
