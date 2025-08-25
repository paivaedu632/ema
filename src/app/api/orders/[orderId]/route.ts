// Order Details API Endpoint
// GET /api/orders/[orderId] - Get specific order details

import { NextRequest } from 'next/server'
import { getAuthenticatedUserFromRequest, createSuccessResponse } from '@/lib/api-utils'
import { handleApiError, createApiError, ErrorCategory, ErrorSeverity } from '@/lib/error-handler'
import { validatePathParams } from '@/lib/validation'
import { OrderBookFunctions } from '@/lib/supabase-server'
import { z } from 'zod'

/**
 * Path parameters validation schema
 */
const OrderIdParamsSchema = z.object({
  orderId: z.string().uuid({ message: 'ID da ordem inválido' })
})

/**
 * GET /api/orders/[orderId]
 * Get detailed information about a specific order
 * 
 * Path Parameters:
 * - orderId: UUID of the order to retrieve
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "id": string,
 *     "user_id": string,
 *     "order_type": "limit" | "market",
 *     "side": "buy" | "sell",
 *     "base_currency": "EUR" | "AOA",
 *     "quote_currency": "EUR" | "AOA",
 *     "quantity": number,
 *     "remaining_quantity": number,
 *     "filled_quantity": number,
 *     "price": number,
 *     "average_fill_price": number,
 *     "status": "pending" | "filled" | "partially_filled" | "cancelled",
 *     "reserved_amount": number,
 *     "created_at": string,
 *     "updated_at": string,
 *     "filled_at": string,
 *     "cancelled_at": string,
 *     "progress": {
 *       "fill_percentage": number,
 *       "remaining_percentage": number,
 *       "is_active": boolean,
 *       "can_cancel": boolean
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

    // 2. Validate path parameters
    const { orderId } = validatePathParams(params, OrderIdParamsSchema)

    // 3. Validate order ownership
    const isOwner = await OrderBookFunctions.validateOrderOwnership(user.id, orderId)
    if (!isOwner) {
      throw createApiError(
        'Ordem não encontrada ou não pertence ao usuário',
        404,
        ErrorCategory.AUTHORIZATION,
        ErrorSeverity.MEDIUM
      )
    }

    // 4. Get order details
    const orderDetails = await OrderBookFunctions.getOrderDetails(orderId)

    // 5. Calculate progress information
    const progress = calculateOrderProgress(orderDetails)

    // 6. Format order details for response
    const formattedOrder = {
      id: orderDetails.id,
      user_id: orderDetails.user_id,
      order_type: orderDetails.order_type,
      side: orderDetails.side,
      base_currency: orderDetails.base_currency,
      quote_currency: orderDetails.quote_currency,
      quantity: orderDetails.quantity,
      remaining_quantity: orderDetails.remaining_quantity,
      filled_quantity: orderDetails.filled_quantity,
      price: orderDetails.price,
      average_fill_price: orderDetails.average_fill_price,
      status: orderDetails.status,
      reserved_amount: orderDetails.reserved_amount,
      created_at: orderDetails.created_at,
      updated_at: orderDetails.updated_at,
      filled_at: orderDetails.filled_at,
      cancelled_at: orderDetails.cancelled_at,
      progress
    }

    // 7. Return success response
    return createSuccessResponse(
      formattedOrder,
      'Detalhes da ordem recuperados com sucesso'
    )

  } catch (error) {
    return handleApiError(error, { 
      endpoint: 'GET /api/orders/[orderId]',
      orderId: params.orderId,
      userId: request.headers.get('x-user-id')
    })
  }
}

/**
 * Calculate order progress information
 */
function calculateOrderProgress(orderDetails: any) {
  const fillPercentage = orderDetails.quantity > 0 
    ? (orderDetails.filled_quantity / orderDetails.quantity) * 100 
    : 0

  const remainingPercentage = 100 - fillPercentage

  const isActive = ['pending', 'partially_filled'].includes(orderDetails.status)
  const canCancel = isActive

  return {
    fill_percentage: Math.round(fillPercentage * 100) / 100, // Round to 2 decimal places
    remaining_percentage: Math.round(remainingPercentage * 100) / 100,
    is_active: isActive,
    can_cancel: canCancel
  }
}
