// User Orders API Endpoint
// GET /api/orders/user - Get user's orders

import { NextRequest } from 'next/server'
import { getAuthenticatedUserFromRequest, createSuccessResponse } from '@/lib/api-utils'
import { handleApiError } from '@/lib/error-handler'
import { supabaseAdmin } from '@/lib/supabase-server'
import { createApiError, ErrorCategory, ErrorSeverity } from '@/lib/error-handler'

/**
 * GET /api/orders/user
 * Get user's orders with optional filtering
 * 
 * Query Parameters:
 * - status: string (optional) - Filter by order status
 * - side: string (optional) - Filter by order side (buy/sell)
 * - base_currency: string (optional) - Filter by base currency
 * - quote_currency: string (optional) - Filter by quote currency
 * - limit: number (optional, default: 50) - Number of orders to return
 * - offset: number (optional, default: 0) - Pagination offset
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": string,
 *       "side": "buy" | "sell",
 *       "order_type": "limit" | "market",
 *       "base_currency": string,
 *       "quote_currency": string,
 *       "quantity": number,
 *       "remaining_quantity": number,
 *       "filled_quantity": number,
 *       "price": number,
 *       "status": string,
 *       "dynamic_pricing_enabled": boolean,
 *       "original_price": number,
 *       "last_price_update": string,
 *       "price_update_count": number,
 *       "created_at": string,
 *       "updated_at": string
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
    const status = url.searchParams.get('status')
    const side = url.searchParams.get('side')
    const baseCurrency = url.searchParams.get('base_currency')
    const quoteCurrency = url.searchParams.get('quote_currency')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    // 3. Validate parameters
    if (limit > 100) {
      throw createApiError(
        'Limite máximo de 100 ordens por consulta',
        400,
        ErrorCategory.VALIDATION,
        ErrorSeverity.LOW
      )
    }

    if (side && !['buy', 'sell'].includes(side)) {
      throw createApiError(
        'Lado da ordem deve ser buy ou sell',
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
      .from('order_book')
      .select(`
        id,
        side,
        order_type,
        base_currency,
        quote_currency,
        quantity,
        remaining_quantity,
        price,
        status,
        dynamic_pricing_enabled,
        original_price,
        last_price_update,
        price_update_count,
        reserved_amount,
        created_at,
        updated_at,
        filled_at,
        cancelled_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    if (side) {
      query = query.eq('side', side)
    }

    if (baseCurrency) {
      query = query.eq('base_currency', baseCurrency)
    }

    if (quoteCurrency) {
      query = query.eq('quote_currency', quoteCurrency)
    }

    // 5. Execute query
    const { data: orders, error: ordersError } = await query

    if (ordersError) {
      throw createApiError(
        `Erro ao buscar ordens: ${ordersError.message}`,
        500,
        ErrorCategory.DATABASE,
        ErrorSeverity.HIGH
      )
    }

    // 6. Calculate filled quantities
    const ordersWithFilledQuantity = orders?.map(order => ({
      ...order,
      filled_quantity: order.quantity - order.remaining_quantity
    })) || []

    // 7. Get total count for pagination
    let countQuery = supabaseAdmin
      .from('order_book')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    // Apply same filters for count
    if (status) countQuery = countQuery.eq('status', status)
    if (side) countQuery = countQuery.eq('side', side)
    if (baseCurrency) countQuery = countQuery.eq('base_currency', baseCurrency)
    if (quoteCurrency) countQuery = countQuery.eq('quote_currency', quoteCurrency)

    const { count: totalCount, error: countError } = await countQuery

    if (countError) {
      console.warn('Failed to get total count:', countError.message)
    }

    // 8. Return orders
    return createSuccessResponse(
      ordersWithFilledQuantity,
      'Ordens recuperadas com sucesso',
      {
        pagination: {
          limit,
          offset,
          total: totalCount || 0,
          has_more: (totalCount || 0) > offset + limit
        },
        filters: {
          status,
          side,
          base_currency: baseCurrency,
          quote_currency: quoteCurrency
        }
      }
    )

  } catch (error) {
    return handleApiError(error, { 
      endpoint: 'GET /api/orders/user',
      userId: request.headers.get('x-user-id')
    })
  }
}
