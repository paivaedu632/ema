// Order Cancellation API Endpoint
// POST /api/orders/[orderId]/cancel - Cancel an existing order

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
 * POST /api/orders/[orderId]/cancel
 * Cancel an existing order
 * 
 * Path Parameters:
 * - orderId: UUID of the order to cancel
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "order_id": string,
 *     "status": "cancelled",
 *     "released_amount": number,
 *     "cancelled_at": string,
 *     "message": string
 *   }
 * }
 */
export async function POST(
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

    // 4. Get order details to validate cancellation
    const orderDetails = await OrderBookFunctions.getOrderDetails(orderId)
    
    // 5. Validate order can be cancelled
    if (orderDetails.status === 'cancelled') {
      throw createApiError(
        'Ordem já foi cancelada',
        400,
        ErrorCategory.BUSINESS_LOGIC,
        ErrorSeverity.LOW
      )
    }

    if (orderDetails.status === 'filled') {
      throw createApiError(
        'Não é possível cancelar uma ordem já executada',
        400,
        ErrorCategory.BUSINESS_LOGIC,
        ErrorSeverity.LOW
      )
    }

    // 6. Cancel order using database function
    const cancelResult = await OrderBookFunctions.cancelOrder({
      p_user_id: user.id,
      p_order_id: orderId
    })

    // 7. Return success response
    return createSuccessResponse(
      {
        order_id: cancelResult.order_id,
        status: cancelResult.status,
        released_amount: cancelResult.released_amount,
        cancelled_at: cancelResult.cancelled_at,
        message: cancelResult.message || 'Ordem cancelada com sucesso'
      },
      'Ordem cancelada com sucesso'
    )

  } catch (error) {
    return handleApiError(error, { 
      endpoint: 'POST /api/orders/[orderId]/cancel',
      orderId: params.orderId,
      userId: request.headers.get('x-user-id')
    })
  }
}
