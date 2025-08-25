// Price History API Endpoint
// GET /api/orders/[orderId]/price-history - Get price update history for an order

import { NextRequest } from 'next/server'
import { getAuthenticatedUserFromRequest, createSuccessResponse } from '@/lib/api-utils'
import { handleApiError } from '@/lib/error-handler'
import { validateQueryParams, PriceHistoryQuerySchema } from '@/lib/validation'
import { supabaseAdmin } from '@/lib/supabase-server'
import { createApiError, ErrorCategory, ErrorSeverity } from '@/lib/error-handler'

/**
 * GET /api/orders/[orderId]/price-history
 * Get price update history for a specific order
 * 
 * Query Parameters:
 * - limit: number (1-100, default: 20) - Number of price updates to return
 * - from_date: string (ISO datetime, optional) - Start date for history
 * - to_date: string (ISO datetime, optional) - End date for history
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "order_id": string,
 *     "price_updates": [
 *       {
 *         "id": string,
 *         "old_price": number,
 *         "new_price": number,
 *         "price_change_percentage": number,
 *         "update_reason": string,
 *         "vwap_reference": number,
 *         "created_at": string
 *       }
 *     ],
 *     "total_updates": number,
 *     "current_price": number,
 *     "original_price": number,
 *     "price_range": {
 *       "min_price": number,
 *       "max_price": number,
 *       "total_change_percentage": number
 *     }
 *   }
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    // 1. Authenticate user
    const authContext = await getAuthenticatedUserFromRequest(request)
    const user = authContext.user

    // 2. Validate query parameters
    const url = new URL(request.url)
    const queryParams = {
      limit: url.searchParams.get('limit'),
      from_date: url.searchParams.get('from_date'),
      to_date: url.searchParams.get('to_date')
    }
    
    const validatedQuery = validateQueryParams(PriceHistoryQuerySchema, queryParams)

    // 3. Verify order ownership
    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('order_book')
      .select('id, user_id, price, original_price, dynamic_pricing_enabled')
      .eq('id', params.orderId)
      .eq('user_id', user.id)
      .single()

    if (orderError || !orderData) {
      throw createApiError(
        'Ordem não encontrada',
        404,
        ErrorCategory.NOT_FOUND,
        ErrorSeverity.MEDIUM
      )
    }

    // 4. Build price history query
    let query = supabaseAdmin
      .from('price_updates')
      .select(`
        id,
        old_price,
        new_price,
        price_change_percentage,
        update_reason,
        vwap_reference,
        trade_volume_reference,
        created_at
      `)
      .eq('order_id', params.orderId)
      .order('created_at', { ascending: false })
      .limit(validatedQuery.limit)

    // Add date filters if provided
    if (validatedQuery.from_date) {
      query = query.gte('created_at', validatedQuery.from_date)
    }
    if (validatedQuery.to_date) {
      query = query.lte('created_at', validatedQuery.to_date)
    }

    // 5. Execute query
    const { data: priceUpdates, error: historyError } = await query

    if (historyError) {
      throw createApiError(
        `Erro ao buscar histórico de preços: ${historyError.message}`,
        500,
        ErrorCategory.DATABASE,
        ErrorSeverity.HIGH
      )
    }

    // 6. Get total count of price updates
    const { count: totalUpdates, error: countError } = await supabaseAdmin
      .from('price_updates')
      .select('*', { count: 'exact', head: true })
      .eq('order_id', params.orderId)

    if (countError) {
      console.warn('Failed to get total count:', countError.message)
    }

    // 7. Calculate price range statistics
    let priceRange = null
    if (priceUpdates && priceUpdates.length > 0) {
      const prices = priceUpdates.map(update => [update.old_price, update.new_price]).flat()
      const minPrice = Math.min(...prices)
      const maxPrice = Math.max(...prices)
      const totalChangePercentage = orderData.original_price 
        ? ((orderData.price - orderData.original_price) / orderData.original_price) * 100
        : 0

      priceRange = {
        min_price: minPrice,
        max_price: maxPrice,
        total_change_percentage: totalChangePercentage
      }
    }

    // 8. Return price history
    return createSuccessResponse(
      {
        order_id: params.orderId,
        price_updates: priceUpdates || [],
        total_updates: totalUpdates || 0,
        current_price: orderData.price,
        original_price: orderData.original_price,
        dynamic_pricing_enabled: orderData.dynamic_pricing_enabled,
        price_range: priceRange,
        query_info: {
          limit: validatedQuery.limit,
          from_date: validatedQuery.from_date,
          to_date: validatedQuery.to_date,
          results_count: priceUpdates?.length || 0
        }
      },
      'Histórico de preços recuperado com sucesso'
    )

  } catch (error) {
    return handleApiError(error, { 
      endpoint: `GET /api/orders/${params.orderId}/price-history`,
      userId: request.headers.get('x-user-id')
    })
  }
}
