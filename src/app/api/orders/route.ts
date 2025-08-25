// User Orders API Endpoint
// GET /api/orders - Get user's orders with filtering and pagination

import { NextRequest } from 'next/server'
import { getAuthenticatedUserFromRequest, createPaginatedResponse } from '@/lib/api-utils'
import { handleApiError } from '@/lib/error-handler'
import { validateQueryParams, OrderQuerySchema } from '@/lib/validation'
import { OrderBookFunctions } from '@/lib/supabase-server'

/**
 * GET /api/orders
 * Get user's orders with optional filtering and pagination
 * 
 * Query Parameters:
 * - limit: number (1-100, default: 20) - Number of orders to return
 * - offset: number (default: 0) - Number of orders to skip
 * - status: string (optional) - Filter by order status: pending, filled, partially_filled, cancelled
 * - currency_pair: string (optional) - Filter by currency pair: EUR/AOA, AOA/EUR
 * - from_date: string (optional) - Filter orders from this date (ISO 8601)
 * - to_date: string (optional) - Filter orders until this date (ISO 8601)
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": string,
 *       "order_type": "limit" | "market",
 *       "side": "buy" | "sell",
 *       "base_currency": "EUR" | "AOA",
 *       "quote_currency": "EUR" | "AOA",
 *       "quantity": number,
 *       "remaining_quantity": number,
 *       "filled_quantity": number,
 *       "price": number,
 *       "average_fill_price": number,
 *       "status": "pending" | "filled" | "partially_filled" | "cancelled",
 *       "reserved_amount": number,
 *       "created_at": string,
 *       "updated_at": string,
 *       "filled_at": string,
 *       "cancelled_at": string
 *     }
 *   ],
 *   "meta": {
 *     "pagination": {
 *       "page": number,
 *       "limit": number,
 *       "total": number,
 *       "totalPages": number,
 *       "hasMore": boolean
 *     }
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const authContext = await getAuthenticatedUserFromRequest(request)
    const user = authContext.user

    // 2. Validate query parameters
    const searchParams = new URL(request.url).searchParams
    const queryParams = validateQueryParams(searchParams, OrderQuerySchema)

    // 3. Get user orders using database function
    const orders = await OrderBookFunctions.getUserOrders({
      p_user_id: user.id,
      p_status: queryParams.status,
      p_limit: queryParams.limit,
      p_offset: queryParams.offset
    })

    // 4. Filter by currency pair if specified
    let filteredOrders = orders
    if (queryParams.currency_pair) {
      const [base, quote] = queryParams.currency_pair.split('/')
      filteredOrders = orders.filter(order => 
        order.base_currency === base && order.quote_currency === quote
      )
    }

    // 5. Filter by date range if specified
    if (queryParams.from_date || queryParams.to_date) {
      filteredOrders = filteredOrders.filter(order => {
        const orderDate = new Date(order.created_at)
        
        if (queryParams.from_date) {
          const fromDate = new Date(queryParams.from_date)
          if (orderDate < fromDate) return false
        }
        
        if (queryParams.to_date) {
          const toDate = new Date(queryParams.to_date)
          if (orderDate > toDate) return false
        }
        
        return true
      })
    }

    // 6. Format orders for response
    const formattedOrders = filteredOrders.map(order => ({
      id: order.id,
      order_type: order.order_type,
      side: order.side,
      base_currency: order.base_currency,
      quote_currency: order.quote_currency,
      quantity: order.quantity,
      remaining_quantity: order.remaining_quantity,
      filled_quantity: order.filled_quantity,
      price: order.price,
      average_fill_price: order.average_fill_price,
      status: order.status,
      reserved_amount: order.reserved_amount,
      created_at: order.created_at,
      updated_at: order.updated_at,
      filled_at: order.filled_at,
      cancelled_at: order.cancelled_at
    }))

    // 7. Calculate pagination info
    const page = Math.floor(queryParams.offset / queryParams.limit) + 1
    const total = filteredOrders.length // This is simplified - in production, you'd get total from database

    // 8. Return paginated response
    return createPaginatedResponse(
      formattedOrders,
      page,
      queryParams.limit,
      total,
      'Ordens recuperadas com sucesso'
    )

  } catch (error) {
    return handleApiError(error, { 
      endpoint: 'GET /api/orders',
      userId: request.headers.get('x-user-id')
    })
  }
}
